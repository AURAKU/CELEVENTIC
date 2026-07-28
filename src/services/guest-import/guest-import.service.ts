import type {
  GuestImportBatch,
  GuestImportMode,
  GuestImportRow,
  GuestImportRowDecision,
  GuestImportRowStatus,
  GuestImportSource,
  GuestPartyType,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { dispatchJob } from "@/lib/queue";
import { paginatedResult, parsePaginationInput } from "@/lib/pagination";
import {
  mergeImportOptions,
  type ColumnMapping,
  type ImportOptions,
  type NormalizedRow,
  type ParsedTable,
  type RowIssue,
} from "@/lib/guest-import/types";
import { normalizeRows } from "@/lib/guest-import/normalize";
import {
  buildDuplicateIndex,
  markDuplicates,
  markSeatConflicts,
  summarizeRows,
  type DuplicateIndex,
} from "@/lib/guest-import/dedupe";
import {
  mappingFromSuggestions,
  suggestColumnMapping,
  validateMapping,
  type ColumnSuggestion,
} from "@/lib/guest-import/column-detect";
import { GUEST_IMPORT_QUEUE } from "./queues";

/**
 * Bulk Guest Import — batch lifecycle.
 *
 * A batch moves DRAFT → READY → GENERATING → COMPLETED, and nothing guest-
 * facing exists until the organiser confirms. Parsing, mapping, duplicate
 * detection and preview all happen against `guest_import_rows`, which is a
 * staging table: no Invitation, Guest, GuestPass or delivery is created until
 * `confirmBatch` hands the batch to the background worker.
 *
 * Reads are paginated everywhere — a 5,000-row import must never be loaded
 * whole into an API response or a browser.
 */

const ROW_WRITE_CHUNK = 200;

export interface CreateBatchInput {
  eventId: string;
  userId: string;
  mode?: GuestImportMode;
  source: GuestImportSource;
  table: ParsedTable;
  fileName?: string | null;
  label?: string | null;
  options?: Partial<ImportOptions>;
  /** Explicit mapping; omitted means "use the detected one". */
  mapping?: ColumnMapping;
}

export interface BatchPreview {
  batch: GuestImportBatch;
  suggestions: ColumnSuggestion[];
  summary: ReturnType<typeof summarizeRows>;
}

/** Load every existing name/contact for an event so duplicates can be spotted. */
export async function loadDuplicateIndex(eventId: string): Promise<DuplicateIndex> {
  const [guests, invitations] = await Promise.all([
    prisma.guest.findMany({
      where: { eventId, archivedAt: null },
      select: { id: true, invitationId: true, name: true, email: true, phone: true },
    }),
    prisma.invitation.findMany({
      where: { eventId, archivedAt: null, isGeneralPass: false },
      select: { id: true, name: true },
    }),
  ]);

  return buildDuplicateIndex(
    guests.map((g) => ({
      guestId: g.id,
      invitationId: g.invitationId,
      name: g.name,
      email: g.email,
      phone: g.phone,
    })),
    invitations.map((i) => ({ invitationId: i.id, name: i.name }))
  );
}

/** Seats already claimed on the event, so an import cannot double-book a chair. */
async function loadTakenSeats(eventId: string): Promise<Set<string>> {
  const assignments = await prisma.seatingAssignment.findMany({
    where: { seatingPlan: { eventId } },
    select: { tableNumber: true, seatLabel: true },
  });
  return new Set(
    assignments
      .filter((a) => a.seatLabel)
      .map((a) => `${a.tableNumber.trim().toLowerCase()}::${a.seatLabel!.trim().toLowerCase()}`)
  );
}

function rowCreateData(batchId: string, row: NormalizedRow): Prisma.GuestImportRowCreateManyInput {
  return {
    batchId,
    rowIndex: row.rowIndex,
    raw: row.raw as unknown as Prisma.InputJsonValue,
    name: row.name || "(no name)",
    email: row.email,
    phone: row.phone,
    rawPhone: row.rawPhone,
    partyType: row.partyType,
    partySize: row.partySize,
    memberNames: row.memberNames as unknown as Prisma.InputJsonValue,
    groupName: row.groupName,
    tableNumber: row.tableNumber,
    seatLabel: row.seatLabel,
    notes: row.notes,
    status: row.status,
    decision: row.decision,
    issues: row.issues as unknown as Prisma.InputJsonValue,
    duplicateOfRowIndex: row.duplicateOfRowIndex,
    duplicateOfGuestId: row.duplicateOfGuestId,
    duplicateOfInvitationId: row.duplicateOfInvitationId,
  };
}

function countsFrom(summary: ReturnType<typeof summarizeRows>) {
  return {
    totalRows: summary.total,
    readyRows: summary.ready,
    reviewRows: summary.review,
    duplicateRows: summary.duplicate,
    invalidRows: summary.invalid,
    skippedRows: summary.skipped,
  };
}

export class GuestImportService {
  /**
   * Stage a parsed list as a DRAFT batch.
   *
   * Nothing guest-facing is created here — this is the "preview and validate"
   * step, and it is the only place the whole source table is held in memory.
   */
  async createBatch(input: CreateBatchInput): Promise<BatchPreview> {
    const options = mergeImportOptions(input.options);
    const suggestions = suggestColumnMapping(input.table);
    const mapping = input.mapping ?? mappingFromSuggestions(suggestions);

    const rows = normalizeRows(input.table, mapping, options);
    const [index, takenSeats] = await Promise.all([
      loadDuplicateIndex(input.eventId),
      options.applySeating ? loadTakenSeats(input.eventId) : Promise.resolve(new Set<string>()),
    ]);
    markDuplicates(rows, index, options);
    markSeatConflicts(rows, takenSeats);
    const summary = summarizeRows(rows);

    const batch = await prisma.guestImportBatch.create({
      data: {
        eventId: input.eventId,
        createdById: input.userId,
        label: input.label ?? null,
        mode: input.mode ?? "PERSONALISED",
        source: input.source,
        status: "DRAFT",
        fileName: input.fileName ?? null,
        detectedHeaders: (input.table.headers ?? null) as unknown as Prisma.InputJsonValue,
        columnMapping: mapping as unknown as Prisma.InputJsonValue,
        options: options as unknown as Prisma.InputJsonValue,
        ...countsFrom(summary),
      },
    });

    await this.writeRows(batch.id, rows);

    await createAuditLog({
      userId: input.userId,
      action: "CREATE",
      entity: "guest_import_batch",
      entityId: batch.id,
      details: {
        kind: "import_staged",
        eventId: input.eventId,
        source: input.source,
        mode: batch.mode,
        ...countsFrom(summary),
      },
    });

    return { batch, suggestions, summary };
  }

  private async writeRows(batchId: string, rows: NormalizedRow[]): Promise<void> {
    for (let i = 0; i < rows.length; i += ROW_WRITE_CHUNK) {
      const chunk = rows.slice(i, i + ROW_WRITE_CHUNK);
      await prisma.guestImportRow.createMany({
        data: chunk.map((row) => rowCreateData(batchId, row)),
      });
    }
  }

  /**
   * Re-derive every row from the stored source cells under a new mapping or
   * new options. Cheap because `raw` was kept positionally — the organiser
   * never has to re-upload to fix a mis-detected column.
   */
  async remapBatch(
    batchId: string,
    userId: string,
    patch: { mapping?: ColumnMapping; options?: Partial<ImportOptions> }
  ): Promise<BatchPreview> {
    const batch = await this.requireDraft(batchId);
    const options = mergeImportOptions({
      ...((batch.options as Partial<ImportOptions> | null) ?? {}),
      ...(patch.options ?? {}),
    });
    const mapping =
      patch.mapping ?? ((batch.columnMapping as ColumnMapping | null) ?? {});

    const check = validateMapping(mapping);
    if (!check.valid) throw new Error(check.error);

    const existing = await prisma.guestImportRow.findMany({
      where: { batchId },
      orderBy: { rowIndex: "asc" },
      select: { raw: true, rowIndex: true },
    });

    const table: ParsedTable = {
      headers: (batch.detectedHeaders as string[] | null) ?? null,
      rows: existing.map((r) => (Array.isArray(r.raw) ? (r.raw as string[]) : [])),
      columnCount: Math.max(
        1,
        ...existing.map((r) => (Array.isArray(r.raw) ? (r.raw as string[]).length : 0))
      ),
    };

    const rows = normalizeRows(table, mapping, options);
    const [index, takenSeats] = await Promise.all([
      loadDuplicateIndex(batch.eventId),
      options.applySeating ? loadTakenSeats(batch.eventId) : Promise.resolve(new Set<string>()),
    ]);
    markDuplicates(rows, index, options);
    markSeatConflicts(rows, takenSeats);
    const summary = summarizeRows(rows);

    await prisma.guestImportRow.deleteMany({ where: { batchId } });
    await this.writeRows(batchId, rows);

    const updated = await prisma.guestImportBatch.update({
      where: { id: batchId },
      data: {
        columnMapping: mapping as unknown as Prisma.InputJsonValue,
        options: options as unknown as Prisma.InputJsonValue,
        ...countsFrom(summary),
      },
    });

    await createAuditLog({
      userId,
      action: "UPDATE",
      entity: "guest_import_batch",
      entityId: batchId,
      details: { kind: "import_remapped", ...countsFrom(summary) },
    });

    return { batch: updated, suggestions: suggestColumnMapping(table), summary };
  }

  /** Apply organiser edits and decisions to individual rows. */
  async updateRows(
    batchId: string,
    userId: string,
    updates: {
      rowId: string;
      name?: string;
      email?: string | null;
      phone?: string | null;
      partyType?: GuestPartyType;
      partySize?: number;
      groupName?: string | null;
      tableNumber?: string | null;
      seatLabel?: string | null;
      notes?: string | null;
      decision?: GuestImportRowDecision;
      status?: Extract<GuestImportRowStatus, "READY" | "NEEDS_REVIEW" | "SKIPPED">;
    }[]
  ): Promise<{ updated: number }> {
    const batch = await this.requireDraft(batchId);
    const options = mergeImportOptions(batch.options as Partial<ImportOptions> | null);

    let updated = 0;
    for (const update of updates) {
      const row = await prisma.guestImportRow.findFirst({
        where: { id: update.rowId, batchId },
      });
      if (!row) continue;

      const nextName = update.name?.trim() ?? row.name;
      const nextPartySize = Math.min(
        Math.max(1, update.partySize ?? row.partySize),
        options.maxPartySize
      );
      const nextDecision = update.decision ?? row.decision;

      // An organiser touching a row is the confirmation the row was waiting
      // for: clear the soft issues, keep hard ones (a still-missing name).
      const issues = (row.issues as unknown as RowIssue[] | null) ?? [];
      const remainingIssues = issues.filter((issue) => issue.severity === "error");
      const nameIsUsable = nextName.replace(/[^A-Za-z0-9]/g, "").length >= 2;

      const nextStatus: GuestImportRowStatus = !nameIsUsable
        ? "INVALID"
        : nextDecision === "SKIP"
          ? "SKIPPED"
          : (update.status ?? "READY");

      await prisma.guestImportRow.update({
        where: { id: row.id },
        data: {
          name: nextName,
          email: update.email === undefined ? row.email : update.email,
          phone: update.phone === undefined ? row.phone : update.phone,
          partyType: update.partyType ?? row.partyType,
          partySize: nextPartySize,
          groupName: update.groupName === undefined ? row.groupName : update.groupName,
          tableNumber: update.tableNumber === undefined ? row.tableNumber : update.tableNumber,
          seatLabel: update.seatLabel === undefined ? row.seatLabel : update.seatLabel,
          notes: update.notes === undefined ? row.notes : update.notes,
          decision: nextDecision,
          status: nextStatus,
          issues: (nameIsUsable
            ? remainingIssues
            : issues) as unknown as Prisma.InputJsonValue,
          reviewedAt: new Date(),
        },
      });
      updated++;
    }

    await this.refreshCounts(batchId);
    await createAuditLog({
      userId,
      action: "UPDATE",
      entity: "guest_import_batch",
      entityId: batchId,
      details: { kind: "import_rows_reviewed", updated },
    });

    return { updated };
  }

  /** Apply one decision to every row matching a status — the bulk-action path. */
  async bulkDecision(
    batchId: string,
    userId: string,
    input: { status?: GuestImportRowStatus; decision: GuestImportRowDecision; partySize?: number }
  ): Promise<{ updated: number }> {
    const batch = await this.requireDraft(batchId);
    const options = mergeImportOptions(batch.options as Partial<ImportOptions> | null);

    const where: Prisma.GuestImportRowWhereInput = {
      batchId,
      status: input.status ?? { notIn: ["INVALID", "GENERATED"] },
    };
    // INVALID rows have no usable name; a bulk "create" must never resurrect them.
    if (!input.status) where.status = { notIn: ["INVALID", "GENERATED", "GENERATING"] };

    const data: Prisma.GuestImportRowUpdateManyMutationInput = {
      decision: input.decision,
      status: input.decision === "SKIP" ? "SKIPPED" : "READY",
      reviewedAt: new Date(),
    };
    if (input.partySize != null) {
      data.partySize = Math.min(Math.max(1, input.partySize), options.maxPartySize);
    }

    const result = await prisma.guestImportRow.updateMany({ where, data });
    await this.refreshCounts(batchId);

    await createAuditLog({
      userId,
      action: "UPDATE",
      entity: "guest_import_batch",
      entityId: batchId,
      details: { kind: "import_bulk_decision", ...input, updated: result.count },
    });

    return { updated: result.count };
  }

  /** Recompute batch counters from the rows themselves. */
  async refreshCounts(batchId: string): Promise<GuestImportBatch> {
    const groups = await prisma.guestImportRow.groupBy({
      by: ["status"],
      where: { batchId },
      _count: true,
    });
    const byStatus = new Map(groups.map((g) => [g.status, g._count]));
    const total = groups.reduce((sum, g) => sum + g._count, 0);

    return prisma.guestImportBatch.update({
      where: { id: batchId },
      data: {
        totalRows: total,
        readyRows: byStatus.get("READY") ?? 0,
        reviewRows: byStatus.get("NEEDS_REVIEW") ?? 0,
        duplicateRows: byStatus.get("DUPLICATE") ?? 0,
        invalidRows: byStatus.get("INVALID") ?? 0,
        skippedRows: byStatus.get("SKIPPED") ?? 0,
        generatedRows: byStatus.get("GENERATED") ?? 0,
        failedRows: byStatus.get("FAILED") ?? 0,
      },
    });
  }

  /**
   * Confirm the batch and hand it to the worker.
   *
   * This is the single point of no return, and the only place a batch stops
   * being a preview. Rows still awaiting a duplicate decision block it: an
   * organiser must never discover after the fact that "review later" meant
   * "silently skipped".
   */
  async confirmBatch(
    batchId: string,
    userId: string,
    opts: { allowUnreviewedDuplicates?: boolean } = {}
  ): Promise<{ batch: GuestImportBatch; queuedRows: number }> {
    const batch = await this.requireDraft(batchId);

    const unreviewed = await prisma.guestImportRow.count({
      where: { batchId, status: "DUPLICATE", reviewedAt: null },
    });
    if (unreviewed > 0 && !opts.allowUnreviewedDuplicates) {
      throw new Error(
        `${unreviewed} possible duplicate${unreviewed === 1 ? "" : "s"} still need a decision. Choose create or skip for each, or confirm again to skip them all.`
      );
    }

    if (unreviewed > 0) {
      // Explicitly recorded as skipped, so the audit trail shows the choice.
      await prisma.guestImportRow.updateMany({
        where: { batchId, status: "DUPLICATE", reviewedAt: null },
        data: { decision: "SKIP", status: "SKIPPED", reviewedAt: new Date() },
      });
    }

    // Must match what the generator will actually pick up: merge and update
    // decisions are real work, so a list where every duplicate was resolved as
    // "update the existing guest" is a valid import, not an empty one.
    const queuedRows = await prisma.guestImportRow.count({
      where: {
        batchId,
        decision: { not: "SKIP" },
        status: { in: ["READY", "NEEDS_REVIEW", "DUPLICATE"] },
      },
    });
    if (queuedRows === 0) {
      throw new Error("No rows are set to be created. Review the list and try again.");
    }

    const updated = await prisma.guestImportBatch.update({
      where: { id: batchId },
      data: { status: "READY", confirmedAt: new Date(), error: null },
    });

    await dispatchJob(GUEST_IMPORT_QUEUE, { batchId }, 5);

    await createAuditLog({
      userId,
      action: "CREATE",
      entity: "guest_import_batch",
      entityId: batchId,
      details: {
        kind: "import_confirmed",
        eventId: batch.eventId,
        queuedRows,
        skippedUnreviewedDuplicates: unreviewed,
      },
    });

    return { batch: updated, queuedRows };
  }

  async getBatch(batchId: string): Promise<GuestImportBatch | null> {
    return prisma.guestImportBatch.findUnique({ where: { id: batchId } });
  }

  async listBatches(eventId: string, options?: { page?: number; limit?: number }) {
    const { page, limit, skip } = parsePaginationInput(options, { limit: 20 });
    const where: Prisma.GuestImportBatchWhereInput = { eventId };
    const [items, total] = await Promise.all([
      prisma.guestImportBatch.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: { _count: { select: { rows: true, deliveries: true } } },
      }),
      prisma.guestImportBatch.count({ where }),
    ]);
    return paginatedResult(items, total, page, limit);
  }

  async listRows(
    batchId: string,
    options?: { page?: number; limit?: number; status?: string; search?: string }
  ) {
    const { page, limit, skip } = parsePaginationInput(options, { limit: 50, maxLimit: 200 });
    const where: Prisma.GuestImportRowWhereInput = { batchId };
    if (options?.status && options.status !== "all") {
      where.status = options.status as GuestImportRowStatus;
    }
    if (options?.search?.trim()) {
      where.name = { contains: options.search.trim() };
    }

    const [items, total] = await Promise.all([
      prisma.guestImportRow.findMany({
        where,
        orderBy: { rowIndex: "asc" },
        skip,
        take: limit,
      }),
      prisma.guestImportRow.count({ where }),
    ]);
    return paginatedResult(items, total, page, limit);
  }

  /** Live progress for the wizard's generation screen. */
  async getProgress(batchId: string) {
    const batch = await prisma.guestImportBatch.findUnique({ where: { id: batchId } });
    if (!batch) return null;

    const [rowGroups, deliveryGroups] = await Promise.all([
      prisma.guestImportRow.groupBy({ by: ["status"], where: { batchId }, _count: true }),
      prisma.guestImportDelivery.groupBy({ by: ["status"], where: { batchId }, _count: true }),
    ]);

    const rows = Object.fromEntries(rowGroups.map((g) => [g.status, g._count]));
    const deliveries = Object.fromEntries(deliveryGroups.map((g) => [g.status, g._count]));
    const pending =
      (rows.READY ?? 0) + (rows.NEEDS_REVIEW ?? 0) + (rows.DUPLICATE ?? 0) + (rows.GENERATING ?? 0);
    const done = (rows.GENERATED ?? 0) + (rows.FAILED ?? 0) + (rows.SKIPPED ?? 0) + (rows.INVALID ?? 0);

    return {
      batch,
      rows,
      deliveries,
      percent: batch.totalRows > 0 ? Math.round((done / batch.totalRows) * 100) : 0,
      remaining: batch.status === "DRAFT" ? 0 : pending,
      finished: ["COMPLETED", "PARTIAL", "FAILED", "CANCELLED", "ROLLED_BACK"].includes(
        batch.status
      ),
    };
  }

  /** Discard a batch that was never generated. Nothing guest-facing existed. */
  async discardDraft(batchId: string, userId: string): Promise<void> {
    const batch = await this.requireDraft(batchId);
    await prisma.guestImportBatch.delete({ where: { id: batch.id } });
    await createAuditLog({
      userId,
      action: "DELETE",
      entity: "guest_import_batch",
      entityId: batchId,
      details: { kind: "import_draft_discarded", eventId: batch.eventId },
    });
  }

  private async requireDraft(batchId: string): Promise<GuestImportBatch> {
    const batch = await prisma.guestImportBatch.findUnique({ where: { id: batchId } });
    if (!batch) throw new Error("Import not found");
    if (batch.status !== "DRAFT") {
      throw new Error(
        `This import is already ${batch.status.toLowerCase()} and can no longer be edited.`
      );
    }
    return batch;
  }
}

export const guestImportService = new GuestImportService();
export type { GuestImportRow };
