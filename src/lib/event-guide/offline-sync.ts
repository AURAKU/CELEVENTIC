/**
 * Venue Offline Pack sync.
 *
 * The pack uploads a queue of anonymous counters. Two rules are absolute:
 *
 *  - Newer server data is never overwritten. If the guide was republished after
 *    the pack was built, the content half of the sync is refused and reported
 *    as a conflict rather than silently rolled back.
 *  - Replaying the same queue never double-counts. Records carry client ids and
 *    the server keeps a high-water mark, so an operator who syncs twice — or
 *    syncs a pack they already synced — gets the same totals.
 *
 * The pack has no write path to seating at all. Assignments stay an
 * authenticated organizer workflow.
 */

export interface OfflineQueueRecord {
  /** Unique per record, generated locally. Dedupe key. */
  clientRecordId: string;
  /** ISO timestamp captured locally. */
  capturedAt: string;
  day: string;
  tab: "programme" | "seating" | "menu";
  views: number;
  searches: number;
  matches: number;
}

export interface OfflineSyncRequest {
  packVersion: number;
  guideVersion: number;
  records: OfflineQueueRecord[];
}

export interface OfflineSyncConflict {
  kind: "GUIDE_UPDATED" | "PACK_REVOKED" | "PACK_EXPIRED" | "PACK_VERSION_MISMATCH";
  detail: string;
}

export interface OfflineSyncReport {
  accepted: boolean;
  acceptedRecords: number;
  duplicateRecords: number;
  rejectedRecords: number;
  conflicts: OfflineSyncConflict[];
  serverGuideVersion: number;
  packGuideVersion: number;
  /** True when the organizer should download a fresh pack before the event. */
  freshPackRequired: boolean;
  syncedAt: string;
}

const MAX_RECORDS_PER_SYNC = 5000;
const MAX_COUNT_PER_RECORD = 10000;

function sane(count: unknown): number {
  if (typeof count !== "number" || !Number.isFinite(count)) return 0;
  return Math.min(MAX_COUNT_PER_RECORD, Math.max(0, Math.trunc(count)));
}

function isValidDay(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function normalizeQueue(raw: unknown): OfflineQueueRecord[] {
  if (!Array.isArray(raw)) return [];
  const out: OfflineQueueRecord[] = [];
  for (const entry of raw.slice(0, MAX_RECORDS_PER_SYNC)) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    const clientRecordId =
      typeof row.clientRecordId === "string" ? row.clientRecordId.trim().slice(0, 80) : "";
    if (!clientRecordId || !isValidDay(row.day)) continue;
    const tab = row.tab;
    if (tab !== "programme" && tab !== "seating" && tab !== "menu") continue;

    out.push({
      clientRecordId,
      capturedAt:
        typeof row.capturedAt === "string" ? row.capturedAt.slice(0, 40) : new Date().toISOString(),
      day: row.day,
      tab,
      views: sane(row.views),
      searches: sane(row.searches),
      matches: sane(row.matches),
    });
  }
  return out;
}

export interface PackSyncState {
  status: "ACTIVE" | "EXPIRED" | "REVOKED";
  packVersion: number;
  guideVersion: number;
  expiresAt: Date;
  appliedRecordIds: Set<string>;
}

/**
 * Decide what to do with an upload. Pure so the conflict matrix is fully
 * testable without a database.
 */
export function planOfflineSync(input: {
  request: OfflineSyncRequest;
  pack: PackSyncState;
  serverGuideVersion: number;
  now?: Date;
}): { report: OfflineSyncReport; apply: OfflineQueueRecord[] } {
  const now = input.now ?? new Date();
  const conflicts: OfflineSyncConflict[] = [];

  if (input.pack.status === "REVOKED") {
    conflicts.push({
      kind: "PACK_REVOKED",
      detail: "This offline pack was revoked. Download a fresh pack before the next event.",
    });
  }
  if (input.pack.status === "EXPIRED" || input.pack.expiresAt.getTime() <= now.getTime()) {
    conflicts.push({
      kind: "PACK_EXPIRED",
      detail: "This offline pack has expired. Download a fresh pack before the next event.",
    });
  }
  if (input.request.packVersion !== input.pack.packVersion) {
    conflicts.push({
      kind: "PACK_VERSION_MISMATCH",
      detail: `Pack version ${input.request.packVersion} does not match the issued pack (${input.pack.packVersion}).`,
    });
  }

  const guideMovedOn = input.serverGuideVersion > input.request.guideVersion;
  if (guideMovedOn) {
    conflicts.push({
      kind: "GUIDE_UPDATED",
      detail: `The guide was updated to version ${input.serverGuideVersion} after this pack was built (${input.request.guideVersion}). Server content was kept; nothing was overwritten.`,
    });
  }

  const blocking = conflicts.some((c) => c.kind !== "GUIDE_UPDATED");
  const records = input.request.records;

  if (blocking) {
    return {
      report: {
        accepted: false,
        acceptedRecords: 0,
        duplicateRecords: 0,
        rejectedRecords: records.length,
        conflicts,
        serverGuideVersion: input.serverGuideVersion,
        packGuideVersion: input.request.guideVersion,
        freshPackRequired: true,
        syncedAt: now.toISOString(),
      },
      apply: [],
    };
  }

  // Counters are additive facts about what guests did, so they merge even when
  // the guide has since been republished — only content would conflict, and the
  // pack never sends content.
  const seen = new Set<string>();
  const apply: OfflineQueueRecord[] = [];
  let duplicates = 0;

  for (const record of records) {
    if (input.pack.appliedRecordIds.has(record.clientRecordId) || seen.has(record.clientRecordId)) {
      duplicates += 1;
      continue;
    }
    seen.add(record.clientRecordId);
    apply.push(record);
  }

  return {
    report: {
      accepted: true,
      acceptedRecords: apply.length,
      duplicateRecords: duplicates,
      rejectedRecords: 0,
      conflicts,
      serverGuideVersion: input.serverGuideVersion,
      packGuideVersion: input.request.guideVersion,
      freshPackRequired: guideMovedOn,
      syncedAt: now.toISOString(),
    },
    apply,
  };
}

/** Collapse a queue into the `(day, tab)` rows the stats table stores. */
export function aggregateQueue(
  records: OfflineQueueRecord[]
): Array<{ day: string; tab: "programme" | "seating" | "menu"; views: number; searches: number; matches: number }> {
  const buckets = new Map<string, { day: string; tab: OfflineQueueRecord["tab"]; views: number; searches: number; matches: number }>();
  for (const record of records) {
    const key = `${record.day}|${record.tab}`;
    const bucket = buckets.get(key) ?? {
      day: record.day,
      tab: record.tab,
      views: 0,
      searches: 0,
      matches: 0,
    };
    bucket.views += record.views;
    bucket.searches += record.searches;
    bucket.matches += record.matches;
    buckets.set(key, bucket);
  }
  return [...buckets.values()];
}
