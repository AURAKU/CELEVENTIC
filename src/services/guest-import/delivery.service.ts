import type { GuestImportDeliveryChannel, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { dispatchJob } from "@/lib/queue";
import { createAuditLog } from "@/lib/audit";
import { paginatedResult, parsePaginationInput } from "@/lib/pagination";
import { getAppUrlFromEnv } from "@/lib/app-url";
import { collapseDuplicateAbsoluteUrl, ensureSingleShareUrl } from "@/lib/invitation/whatsapp-share";
import { communicationService } from "@/services/communications/communication.service";
import { GUEST_IMPORT_DELIVERY_QUEUE } from "./queues";

/**
 * Bulk Guest Import, delivery.
 *
 * Sending is a separate, resumable stage from generation, and it is always
 * optional. A name-only guest generates a complete invitation with a live
 * link, a QR pass and a place card; they simply produce a
 * `SKIPPED_NO_CONTACT` delivery instead of a send, so the organiser can see at
 * a glance which links they still need to hand over in person or by WhatsApp.
 */

const DELIVERY_CHUNK_SIZE = 20;
const MAX_DELIVERY_ATTEMPTS = 3;

export type SendableChannel = Extract<GuestImportDeliveryChannel, "EMAIL" | "SMS" | "WHATSAPP">;

function personalLink(appUrl: string, uniqueLink: string, qrToken?: string | null): string {
  const cleaned = uniqueLink.trim();
  let base: string;
  if (/^https?:\/\//i.test(cleaned)) {
    base = collapseDuplicateAbsoluteUrl(cleaned);
  } else {
    const path = cleaned.startsWith("/invite/")
      ? cleaned
      : cleaned.startsWith("/")
        ? cleaned
        : `/invite/${cleaned}`;
    base = collapseDuplicateAbsoluteUrl(`${appUrl}${path}`);
  }
  if (!qrToken) return base;
  try {
    const url = new URL(base);
    url.searchParams.set("guest", qrToken);
    return url.toString();
  } catch {
    return `${base}${base.includes("?") ? "&" : "?"}guest=${encodeURIComponent(qrToken)}`;
  }
}

function defaultBody(params: {
  guestName: string;
  eventTitle: string;
  link: string;
  admissionCode?: string | null;
}): string {
  const link = collapseDuplicateAbsoluteUrl(params.link);
  const lines = [
    `Dear ${params.guestName},`,
    "",
    `You are personally invited to ${params.eventTitle}.`,
    "",
    "Open your invitation:",
  ];
  let body = ensureSingleShareUrl(lines.join("\n"), link);
  if (params.admissionCode) {
    body += `\n\nYour admission code: ${params.admissionCode}`;
  }
  body += "\n\nPlease keep this link private, it is your entry pass.";
  return body;
}

/**
 * Queue one delivery per generated row per channel.
 *
 * Idempotent per (row, channel): re-running after a partial failure tops up the
 * queue instead of double-sending, which matters because a duplicate WhatsApp
 * to a guest reads as a mistake by the host.
 */
export async function queueBatchDeliveries(
  batchId: string,
  channels: SendableChannel[]
): Promise<{ queued: number; skipped: number }> {
  if (channels.length === 0) return { queued: 0, skipped: 0 };

  const batch = await prisma.guestImportBatch.findUnique({
    where: { id: batchId },
    select: { id: true, eventId: true, event: { select: { title: true } } },
  });
  if (!batch) throw new Error("Import batch not found");

  const appUrl = getAppUrlFromEnv();
  let queued = 0;
  let skipped = 0;
  let cursor: string | undefined;

  // Cursor-paginated so a 5,000-row batch never materialises in one array.
  for (;;) {
    const rows = await prisma.guestImportRow.findMany({
      where: { batchId, status: "GENERATED", invitationId: { not: null } },
      orderBy: { id: "asc" },
      take: 200,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        invitationId: true,
        guestId: true,
      },
    });
    if (rows.length === 0) break;
    cursor = rows[rows.length - 1].id;

    const invitationIds = rows.map((r) => r.invitationId!).filter(Boolean);
    const [invitations, guests, passes] = await Promise.all([
      prisma.invitation.findMany({
        where: { id: { in: invitationIds } },
        select: { id: true, uniqueLink: true },
      }),
      prisma.guest.findMany({
        where: { id: { in: rows.map((r) => r.guestId).filter((g): g is string => Boolean(g)) } },
        select: { id: true, qrToken: true },
      }),
      prisma.guestPass.findMany({
        where: { invitationId: { in: invitationIds }, status: { notIn: ["REVOKED", "REISSUED"] } },
        select: { invitationId: true, code: true },
      }),
    ]);

    const linkById = new Map(invitations.map((i) => [i.id, i.uniqueLink]));
    const tokenById = new Map(guests.map((g) => [g.id, g.qrToken]));
    const codeByInvitation = new Map(passes.map((p) => [p.invitationId, p.code]));

    const pending: Prisma.GuestImportDeliveryCreateManyInput[] = [];

    for (const row of rows) {
      const uniqueLink = linkById.get(row.invitationId!);
      if (!uniqueLink) continue;
      const link = personalLink(appUrl, uniqueLink, row.guestId ? tokenById.get(row.guestId) : null);

      for (const channel of channels) {
        const existing = await prisma.guestImportDelivery.findFirst({
          where: { batchId, rowId: row.id, channel },
          select: { id: true },
        });
        if (existing) continue;

        const recipient =
          channel === "EMAIL" ? row.email : channel === "SMS" || channel === "WHATSAPP" ? row.phone : null;

        const body = defaultBody({
          guestName: row.name,
          eventTitle: batch.event.title,
          link,
          admissionCode: codeByInvitation.get(row.invitationId!) ?? null,
        });

        pending.push({
          batchId,
          rowId: row.id,
          invitationId: row.invitationId,
          guestId: row.guestId,
          channel,
          status: recipient ? "QUEUED" : "SKIPPED_NO_CONTACT",
          recipient,
          guestName: row.name,
          subject: `You're invited, ${batch.event.title}`,
          body,
        });

        if (recipient) queued++;
        else skipped++;
      }
    }

    if (pending.length > 0) {
      // Unique (batchId, rowId, channel) is the hard guard; we also skip known rows above.
      await prisma.guestImportDelivery.createMany({ data: pending });
    }
  }

  if (queued > 0) {
    await dispatchJob(GUEST_IMPORT_DELIVERY_QUEUE, { batchId }, 5);
  }

  return { queued, skipped };
}

/** Send one chunk of queued deliveries. */
export async function processDeliveryChunk(
  batchId: string
): Promise<{ sent: number; failed: number; remaining: number }> {
  const deliveries = await prisma.guestImportDelivery.findMany({
    where: { batchId, status: "QUEUED", attempts: { lt: MAX_DELIVERY_ATTEMPTS } },
    orderBy: { queuedAt: "asc" },
    take: DELIVERY_CHUNK_SIZE,
  });

  let sent = 0;
  let failed = 0;

  for (const delivery of deliveries) {
    if (!delivery.recipient) {
      await prisma.guestImportDelivery.update({
        where: { id: delivery.id },
        data: { status: "SKIPPED_NO_CONTACT" },
      });
      continue;
    }

    // Atomic claim: concurrent workers must not both send the same WhatsApp.
    const claimed = await prisma.guestImportDelivery.updateMany({
      where: {
        id: delivery.id,
        status: "QUEUED",
        attempts: { lt: MAX_DELIVERY_ATTEMPTS },
      },
      data: { status: "SENDING", attempts: { increment: 1 } },
    });
    if (claimed.count !== 1) continue;

    const attemptNumber = delivery.attempts + 1;

    try {
      if (delivery.channel === "EMAIL") {
        await communicationService.sendTransactionalEmail({
          to: delivery.recipient,
          subject: delivery.subject ?? "You're invited",
          body: delivery.body ?? "",
          templateType: "bulk_invitation",
        });
      } else if (delivery.channel === "SMS" || delivery.channel === "WHATSAPP") {
        const campaign = await communicationService.createCampaign({
          userId: (await batchOwner(batchId)) ?? "system",
          name: `Invitation delivery ${delivery.id.slice(0, 8)}`,
          channel: delivery.channel,
          message: delivery.body ?? "",
          recipients: [{ name: delivery.guestName ?? undefined, contact: delivery.recipient }],
        });
        await communicationService.sendCampaign(campaign.id);
      }

      await prisma.guestImportDelivery.update({
        where: { id: delivery.id },
        data: { status: "SENT", sentAt: new Date(), lastError: null },
      });
      sent++;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      await prisma.guestImportDelivery.update({
        where: { id: delivery.id },
        data: {
          status: attemptNumber >= MAX_DELIVERY_ATTEMPTS ? "FAILED" : "QUEUED",
          lastError: message.slice(0, 500),
          failedAt: attemptNumber >= MAX_DELIVERY_ATTEMPTS ? new Date() : null,
        },
      });
      if (attemptNumber >= MAX_DELIVERY_ATTEMPTS) failed++;
    }
  }

  const remaining = await prisma.guestImportDelivery.count({
    where: { batchId, status: "QUEUED", attempts: { lt: MAX_DELIVERY_ATTEMPTS } },
  });

  return { sent, failed, remaining };
}

async function batchOwner(batchId: string): Promise<string | null> {
  const batch = await prisma.guestImportBatch.findUnique({
    where: { id: batchId },
    select: { createdById: true },
  });
  return batch?.createdById ?? null;
}

export async function runDeliveryJob(batchId: string): Promise<void> {
  const budgetRaw = Number(process.env.GUEST_IMPORT_JOB_BUDGET_MS);
  const budgetMs = Number.isFinite(budgetRaw) && budgetRaw > 0 ? budgetRaw : 20_000;
  const started = Date.now();

  let result = await processDeliveryChunk(batchId);
  while (result.remaining > 0 && Date.now() - started < budgetMs) {
    result = await processDeliveryChunk(batchId);
  }

  if (result.remaining > 0) {
    await dispatchJob(GUEST_IMPORT_DELIVERY_QUEUE, { batchId }, 5);
  }
}

/** Organiser-triggered send, after previewing the message. */
export async function startBatchDelivery(
  batchId: string,
  userId: string,
  channels: SendableChannel[]
): Promise<{ queued: number; skipped: number }> {
  const result = await queueBatchDeliveries(batchId, channels);
  await createAuditLog({
    userId,
    action: "CREATE",
    entity: "guest_import_batch",
    entityId: batchId,
    details: { kind: "import_delivery_queued", channels, ...result },
  });
  return result;
}

/** Stop everything still queued, the organiser spotted a mistake mid-send. */
export async function cancelBatchDelivery(
  batchId: string,
  userId: string
): Promise<{ cancelled: number }> {
  const result = await prisma.guestImportDelivery.updateMany({
    where: { batchId, status: "QUEUED" },
    data: { status: "CANCELLED" },
  });
  await createAuditLog({
    userId,
    action: "UPDATE",
    entity: "guest_import_batch",
    entityId: batchId,
    details: { kind: "import_delivery_cancelled", cancelled: result.count },
  });
  return { cancelled: result.count };
}

export async function listDeliveries(
  batchId: string,
  options?: { page?: number; limit?: number; status?: string }
) {
  const { page, limit, skip } = parsePaginationInput(options, { limit: 50, maxLimit: 200 });
  const where: Prisma.GuestImportDeliveryWhereInput = { batchId };
  if (options?.status && options.status !== "all") {
    where.status = options.status as Prisma.GuestImportDeliveryWhereInput["status"];
  }

  const [items, total] = await Promise.all([
    prisma.guestImportDelivery.findMany({
      where,
      orderBy: { queuedAt: "asc" },
      skip,
      take: limit,
      select: {
        id: true,
        channel: true,
        status: true,
        recipient: true,
        guestName: true,
        attempts: true,
        lastError: true,
        sentAt: true,
      },
    }),
    prisma.guestImportDelivery.count({ where }),
  ]);

  return paginatedResult(items, total, page, limit);
}

/** Message preview the organiser approves before anything is sent. */
export async function previewDelivery(batchId: string): Promise<{
  sample: { channel: string; recipient: string | null; guestName: string | null; body: string } | null;
  counts: { withEmail: number; withPhone: number; nameOnly: number; total: number };
}> {
  const batch = await prisma.guestImportBatch.findUnique({
    where: { id: batchId },
    select: { id: true, event: { select: { title: true } } },
  });
  if (!batch) throw new Error("Import batch not found");

  const [total, withEmail, withPhone, firstRow] = await Promise.all([
    prisma.guestImportRow.count({ where: { batchId, decision: { not: "SKIP" } } }),
    prisma.guestImportRow.count({ where: { batchId, decision: { not: "SKIP" }, email: { not: null } } }),
    prisma.guestImportRow.count({ where: { batchId, decision: { not: "SKIP" }, phone: { not: null } } }),
    prisma.guestImportRow.findFirst({
      where: { batchId, decision: { not: "SKIP" } },
      orderBy: { rowIndex: "asc" },
      select: { name: true, email: true, phone: true },
    }),
  ]);

  const appUrl = getAppUrlFromEnv();
  const sample = firstRow
    ? {
        channel: firstRow.email ? "EMAIL" : firstRow.phone ? "WHATSAPP" : "LINK_ONLY",
        recipient: firstRow.email ?? firstRow.phone ?? null,
        guestName: firstRow.name,
        body: defaultBody({
          guestName: firstRow.name,
          eventTitle: batch.event.title,
          link: `${appUrl}/invite/{personal-link}`,
          admissionCode: "0000",
        }),
      }
    : null;

  const nameOnly = await prisma.guestImportRow.count({
    where: { batchId, decision: { not: "SKIP" }, email: null, phone: null },
  });

  return { sample, counts: { withEmail, withPhone, nameOnly, total } };
}
