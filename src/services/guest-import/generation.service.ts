import type {
  GuestImportBatch,
  GuestImportRow,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { dispatchJob } from "@/lib/queue";
import { ensureInvitationPass } from "@/services/admission/guest-pass.service";
import {
  allocateInvitationSlug,
  featureConfigFor,
  loadEventCompanionFeatureConfig,
  newUniqueLink,
  resolveGuestGroupId,
  tryAllocateManualCode,
} from "@/services/invitations/personalised-invitation";
import {
  GENERATION_CHUNK_SIZE,
  mergeImportOptions,
  type ImportOptions,
} from "@/lib/guest-import/types";
import { GUEST_IMPORT_QUEUE } from "./queues";
import { queueBatchDeliveries } from "./delivery.service";

/**
 * Bulk Guest Import — generation.
 *
 * Turns confirmed rows into the platform's *existing* objects: an Invitation
 * per party, its Guest rows, a Guest Entry Pass (QR + admission code), the
 * Place Card feature flag, and an optional seating assignment. There is no
 * parallel invitation or QR stack — a bulk-imported guest is indistinguishable
 * from a hand-added one at the gate, on the invite page and in analytics.
 *
 * Three properties make this safe to run against a 5,000-name list on a small
 * VPS, and safe to crash in the middle of:
 *
 *  - **Chunked.** One job pass handles `GENERATION_CHUNK_SIZE` rows, then
 *    re-queues itself. No single tick can run for minutes or hold a long
 *    transaction open.
 *  - **Idempotent.** A row that already carries an `invitationId` is resumed,
 *    never duplicated, so a retry after a partial write cannot mint a second
 *    invitation for the same guest.
 *  - **Row-isolated.** One bad row fails alone. The rest of the list still
 *    generates, and the failure is visible and retryable.
 */

const MAX_ROW_ATTEMPTS = 3;

export interface ChunkResult {
  batchId: string;
  processed: number;
  failed: number;
  remaining: number;
  status: GuestImportBatch["status"];
}

async function resolveSeatingPlanId(
  tx: Prisma.TransactionClient,
  eventId: string,
  preferredId: string | null
): Promise<string> {
  if (preferredId) {
    const plan = await tx.seatingPlan.findFirst({
      where: { id: preferredId, eventId },
      select: { id: true },
    });
    if (plan) return plan.id;
  }
  const existing = await tx.seatingPlan.findFirst({
    where: { eventId, planType: "RECEPTION" },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (existing) return existing.id;

  const anyPlan = await tx.seatingPlan.findFirst({
    where: { eventId },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (anyPlan) return anyPlan.id;

  const created = await tx.seatingPlan.create({
    data: {
      eventId,
      name: "Imported seating",
      planType: "RECEPTION",
      layout: { tables: [] } as Prisma.InputJsonValue,
    },
  });
  return created.id;
}

interface RowGenerationResult {
  invitationId: string;
  guestId: string;
  guestPassId: string | null;
  heads: number;
}

/** Create (or resume) everything one confirmed row is entitled to. */
async function generateRow(
  batch: GuestImportBatch,
  row: GuestImportRow,
  options: ImportOptions
): Promise<RowGenerationResult> {
  const eventId = batch.eventId;
  const memberNames = Array.isArray(row.memberNames) ? (row.memberNames as string[]) : [];
  const partySize = Math.max(1, row.partySize);

  // ── Non-create decisions attach to what already exists ──
  if (row.decision === "UPDATE_EXISTING" || row.decision === "MERGE_INTO_EXISTING") {
    return attachToExisting(batch, row, options, partySize);
  }

  // ── Resume: a previous attempt already wrote the invitation ──
  let invitationId = row.invitationId;
  let guestId = row.guestId;

  if (!invitationId) {
    const slug = await allocateInvitationSlug(row.name);
    const companion = await loadEventCompanionFeatureConfig(eventId);
    const created = await prisma.$transaction(async (tx) => {
      const invitation = await tx.invitation.create({
        data: {
          eventId,
          name: row.name,
          slug,
          uniqueLink: newUniqueLink(),
          templateId: options.templateId || undefined,
          message: options.message || undefined,
          status: options.publishImmediately ? "ACTIVE" : "DRAFT",
          admissionAllowance: partySize,
          importBatchId: batch.id,
          postAdmissionEnabled: companion?.postAdmissionEnabled ?? false,
          featureConfig: featureConfigFor({
            ...options,
            companionFeatureConfig: companion?.featureConfig,
          }),
        },
      });

      const groupId = await resolveGuestGroupId(tx, eventId, row.groupName);

      // Named members become real guest rows so the scanner can tick people
      // off individually; the remainder rides as plus-ones on the primary.
      const namedMembers = memberNames.slice(0, Math.max(0, partySize - 1));
      const namedTotal = 1 + namedMembers.length;
      const plusOnes = Math.max(0, partySize - namedTotal);

      const primary = await tx.guest.create({
        data: {
          eventId,
          invitationId: invitation.id,
          groupId,
          name: row.name,
          email: row.email,
          phone: row.phone,
          plusOnes,
          notes: row.notes,
          status: "INVITED",
          partyType: row.partyType,
          importBatchId: batch.id,
        },
      });

      for (const member of namedMembers) {
        if (member.trim().toLowerCase() === row.name.trim().toLowerCase()) continue;
        await tx.guest.create({
          data: {
            eventId,
            invitationId: invitation.id,
            groupId,
            name: member,
            plusOnes: 0,
            status: "INVITED",
            partyType: row.partyType,
            importBatchId: batch.id,
          },
        });
      }

      await tx.guestImportRow.update({
        where: { id: row.id },
        data: { invitationId: invitation.id, guestId: primary.id, status: "GENERATING" },
      });

      return { invitationId: invitation.id, guestId: primary.id };
    });

    invitationId = created.invitationId;
    guestId = created.guestId;
  }

  // ── Manual gate code (best-effort, outside the invitation transaction) ──
  if (guestId) {
    const guest = await prisma.guest.findUnique({
      where: { id: guestId },
      select: { manualCode: true },
    });
    if (!guest?.manualCode) {
      const manualCode = await tryAllocateManualCode(eventId);
      if (manualCode) {
        await prisma.guest
          .update({ where: { id: guestId }, data: { manualCode } })
          .catch(() => undefined); // lost a unique race — the pass code still works
      }
    }
  }

  // ── Seating (optional, conflict-aware) ──
  if (options.applySeating && row.tableNumber?.trim() && guestId) {
    await applySeating(eventId, guestId, row, options);
  }

  // ── CRM tags (organizer-only): row Tags column + batch defaults ──
  if (guestId) {
    try {
      const { resolveGuestTagLabels, setGuestTags } = await import(
        "@/services/guests/guest-tags.service"
      );
      const rowLabels = Array.isArray(row.tagLabels) ? (row.tagLabels as string[]) : [];
      const fromRow = await resolveGuestTagLabels(eventId, rowLabels);
      const tagIds = Array.from(
        new Set([...fromRow, ...(options.defaultTagIds ?? [])].filter(Boolean))
      );
      if (tagIds.length > 0) {
        await setGuestTags({ eventId, guestId, tagIds });
      }
    } catch {
      // Tag failure must not roll back a successful invitation mint.
    }
  }

  // ── Guest Entry Pass: the same signed QR + code stack the gate already uses ──
  let guestPassId: string | null = null;
  if (options.issueEntryPass) {
    const issued = await ensureInvitationPass(invitationId!);
    guestPassId = issued?.pass.id ?? null;
  }

  return { invitationId: invitationId!, guestId: guestId!, guestPassId, heads: partySize };
}

/** MERGE / UPDATE decisions: widen or correct what the event already has. */
async function attachToExisting(
  batch: GuestImportBatch,
  row: GuestImportRow,
  options: ImportOptions,
  partySize: number
): Promise<RowGenerationResult> {
  const existingGuest = row.duplicateOfGuestId
    ? await prisma.guest.findUnique({ where: { id: row.duplicateOfGuestId } })
    : null;
  const invitationId = existingGuest?.invitationId ?? row.duplicateOfInvitationId;

  if (!invitationId) {
    throw new Error(
      "This row was set to merge, but the matching invitation no longer exists. Set it to create instead."
    );
  }

  if (row.decision === "UPDATE_EXISTING" && existingGuest) {
    // Fill gaps only — an import must not wipe a contact an organiser typed by hand.
    await prisma.guest.update({
      where: { id: existingGuest.id },
      data: {
        email: existingGuest.email ?? row.email,
        phone: existingGuest.phone ?? row.phone,
        notes: existingGuest.notes ?? row.notes,
        partyType: row.partyType,
      },
    });
  }

  const invitation = await prisma.invitation.findUnique({
    where: { id: invitationId },
    select: { id: true, admissionAllowance: true },
  });
  if (!invitation) {
    throw new Error("The matching invitation no longer exists. Set this row to create instead.");
  }

  let guestId = existingGuest?.id ?? null;

  if (row.decision === "MERGE_INTO_EXISTING" && !existingGuest) {
    const created = await prisma.guest.create({
      data: {
        eventId: batch.eventId,
        invitationId,
        name: row.name,
        email: row.email,
        phone: row.phone,
        notes: row.notes,
        status: "INVITED",
        partyType: row.partyType,
        importBatchId: batch.id,
      },
    });
    guestId = created.id;

    // Merging a person in must widen the allowance, or they arrive at the gate
    // to a pass that is already full.
    await prisma.invitation.update({
      where: { id: invitationId },
      data: { admissionAllowance: (invitation.admissionAllowance ?? 1) + partySize },
    });
  }

  let guestPassId: string | null = null;
  if (options.issueEntryPass) {
    const issued = await ensureInvitationPass(invitationId, { refreshPartySize: true });
    guestPassId = issued?.pass.id ?? null;
  }

  if (!guestId) {
    const anyGuest = await prisma.guest.findFirst({
      where: { invitationId },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });
    guestId = anyGuest?.id ?? "";
  }

  if (guestId) {
    try {
      const { resolveGuestTagLabels, setGuestTags } = await import(
        "@/services/guests/guest-tags.service"
      );
      const rowLabels = Array.isArray(row.tagLabels) ? (row.tagLabels as string[]) : [];
      const fromRow = await resolveGuestTagLabels(batch.eventId, rowLabels);
      const tagIds = Array.from(
        new Set([...fromRow, ...(options.defaultTagIds ?? [])].filter(Boolean))
      );
      if (tagIds.length > 0) {
        await setGuestTags({ eventId: batch.eventId, guestId, tagIds });
      }
    } catch {
      /* non-fatal */
    }
  }

  return { invitationId, guestId, guestPassId, heads: 0 };
}

/** Assign a seat, refusing to evict whoever is already sitting there. */
async function applySeating(
  eventId: string,
  guestId: string,
  row: GuestImportRow,
  options: ImportOptions
): Promise<void> {
  const tableNumber = row.tableNumber!.trim();
  const seatLabel = row.seatLabel?.trim() || null;

  try {
    await prisma.$transaction(async (tx) => {
      const seatingPlanId = await resolveSeatingPlanId(tx, eventId, options.seatingPlanId ?? null);

      if (seatLabel) {
        const clash = await tx.seatingAssignment.findFirst({
          where: { seatingPlanId, tableNumber, seatLabel, guestId: { not: guestId } },
          select: { id: true },
        });
        if (clash) {
          // Seat the guest at the table without the contested chair rather than
          // failing the row: they still get a table, and the organiser sees the note.
          await tx.seatingAssignment.upsert({
            where: { guestId_seatingPlanId: { guestId, seatingPlanId } },
            create: { seatingPlanId, guestId, tableNumber, notes: `Seat ${seatLabel} was already taken` },
            update: { tableNumber, notes: `Seat ${seatLabel} was already taken` },
          });
          return;
        }
      }

      await tx.seatingAssignment.upsert({
        where: { guestId_seatingPlanId: { guestId, seatingPlanId } },
        create: { seatingPlanId, guestId, tableNumber, seatLabel },
        update: { tableNumber, seatLabel },
      });
    });
  } catch (error) {
    // Seating is an enhancement, not a prerequisite for being invited.
    console.error("[guest-import] seating assignment failed", { guestId, error });
  }
}

/**
 * Process one chunk of a confirmed batch.
 *
 * Returns after at most `GENERATION_CHUNK_SIZE` rows so the worker tick stays
 * short; the caller re-queues while `remaining > 0`.
 */
export async function generateBatchChunk(batchId: string): Promise<ChunkResult> {
  const batch = await prisma.guestImportBatch.findUnique({ where: { id: batchId } });
  if (!batch) throw new Error(`Import batch ${batchId} not found`);

  if (["COMPLETED", "CANCELLED", "ROLLED_BACK", "FAILED"].includes(batch.status)) {
    return { batchId, processed: 0, failed: 0, remaining: 0, status: batch.status };
  }

  if (batch.status === "READY") {
    await prisma.guestImportBatch.update({
      where: { id: batchId },
      data: { status: "GENERATING", startedAt: batch.startedAt ?? new Date() },
    });
  }

  const options = mergeImportOptions(batch.options as Partial<ImportOptions> | null);

  const rows = await prisma.guestImportRow.findMany({
    where: {
      batchId,
      decision: { not: "SKIP" },
      generatedAt: null,
      status: { in: ["READY", "NEEDS_REVIEW", "DUPLICATE", "GENERATING"] },
      attempts: { lt: MAX_ROW_ATTEMPTS },
    },
    orderBy: { rowIndex: "asc" },
    take: GENERATION_CHUNK_SIZE,
  });

  let processed = 0;
  let failed = 0;
  let heads = 0;

  for (const row of rows) {
    await prisma.guestImportRow.update({
      where: { id: row.id },
      data: { attempts: { increment: 1 }, status: "GENERATING" },
    });

    try {
      const result = await generateRow(batch, row, options);
      await prisma.guestImportRow.update({
        where: { id: row.id },
        data: {
          invitationId: result.invitationId,
          guestId: result.guestId || null,
          guestPassId: result.guestPassId,
          status: "GENERATED",
          generatedAt: new Date(),
          error: null,
        },
      });
      processed++;
      heads += result.heads;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      const attempts = row.attempts + 1;
      await prisma.guestImportRow.update({
        where: { id: row.id },
        data: {
          status: attempts >= MAX_ROW_ATTEMPTS ? "FAILED" : "NEEDS_REVIEW",
          error: message.slice(0, 500),
        },
      });
      if (attempts >= MAX_ROW_ATTEMPTS) failed++;
      console.error("[guest-import] row generation failed", { batchId, rowIndex: row.rowIndex, message });
    }
  }

  if (heads > 0) {
    await prisma.guestImportBatch.update({
      where: { id: batchId },
      data: { generatedHeads: { increment: heads } },
    });
  }

  const remaining = await prisma.guestImportRow.count({
    where: {
      batchId,
      decision: { not: "SKIP" },
      generatedAt: null,
      status: { in: ["READY", "NEEDS_REVIEW", "DUPLICATE", "GENERATING"] },
      attempts: { lt: MAX_ROW_ATTEMPTS },
    },
  });

  const counts = await prisma.guestImportRow.groupBy({
    by: ["status"],
    where: { batchId },
    _count: true,
  });
  const byStatus = new Map(counts.map((c) => [c.status, c._count]));

  const finished = remaining === 0;
  const failedTotal = byStatus.get("FAILED") ?? 0;
  const status: GuestImportBatch["status"] = finished
    ? failedTotal > 0
      ? "PARTIAL"
      : "COMPLETED"
    : "GENERATING";

  await prisma.guestImportBatch.update({
    where: { id: batchId },
    data: {
      status,
      generatedRows: byStatus.get("GENERATED") ?? 0,
      failedRows: failedTotal,
      readyRows: byStatus.get("READY") ?? 0,
      reviewRows: byStatus.get("NEEDS_REVIEW") ?? 0,
      duplicateRows: byStatus.get("DUPLICATE") ?? 0,
      skippedRows: byStatus.get("SKIPPED") ?? 0,
      invalidRows: byStatus.get("INVALID") ?? 0,
      completedAt: finished ? new Date() : null,
    },
  });

  if (finished) {
    if (options.deliveryChannels.length > 0) {
      await queueBatchDeliveries(batchId, options.deliveryChannels);
    }
    await createAuditLog({
      userId: batch.createdById ?? undefined,
      action: "CREATE",
      entity: "guest_import_batch",
      entityId: batchId,
      details: {
        kind: "import_generation_finished",
        eventId: batch.eventId,
        status,
        generated: byStatus.get("GENERATED") ?? 0,
        failed: failedTotal,
      },
    });
  }

  return { batchId, processed, failed, remaining, status };
}

/**
 * Job entry point. Processes as many chunks as fit in a short time budget, then
 * re-queues itself while work remains. Keeps each claim responsive (worker tick
 * / inline kick) without waiting a full 15s between every 25-row slice.
 */
export async function runGuestImportJob(batchId: string): Promise<void> {
  const budgetRaw = Number(process.env.GUEST_IMPORT_JOB_BUDGET_MS);
  const budgetMs = Number.isFinite(budgetRaw) && budgetRaw > 0 ? budgetRaw : 20_000;
  const started = Date.now();

  let result = await generateBatchChunk(batchId);
  while (result.remaining > 0 && Date.now() - started < budgetMs) {
    result = await generateBatchChunk(batchId);
  }

  if (result.remaining > 0) {
    await dispatchJob(GUEST_IMPORT_QUEUE, { batchId }, 5);
  }
}
