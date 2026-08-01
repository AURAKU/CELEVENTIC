/**
 * Repair legacy / stale local media URLs in the database.
 *
 * Rewrites `/api/uploads/...`, localhost absolute URLs, malformed `public/uploads`,
 * and converted-source MOV/MP4 paths to the canonical public `/uploads/...`
 * playback URL when a durable source→playback map entry exists.
 *
 * Never deletes media files. Never alters invitation public link paths
 * (`/i/...`, slugs). External CDN/S3 URLs are preserved.
 *
 * Usage:
 *   npm run media:urls:fix -- --dry-run
 *   npm run media:urls:fix -- --limit=20
 *   npm run media:urls:fix -- --resume
 *   npm run media:urls:fix -- --rollback=var/media-url-fix/rollback-<runId>.json
 */
import { existsSync } from "node:fs";
import {
  appendFile,
  copyFile,
  mkdir,
  readFile,
  unlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import {
  createEmptySourcePlaybackMap,
  isLegacyLocalUploadUrl,
  mergeSourcePlaybackMaps,
  normalizeStoredMediaUrl,
  shouldUpdateStoredMediaUrl,
  sourcePlaybackMapFromManifest,
  type SourcePlaybackMap,
} from "../src/lib/video/media-audit-utils";
import {
  createEmptyManifest,
  deepReplaceUrlsInJson,
  type BackfillManifest,
  type RollbackRecord,
} from "../src/lib/video/backfill-utils";

const prisma = new PrismaClient();
const PROJECT_ROOT = path.join(__dirname, "..");
const STATE_DIR = process.env.MEDIA_URL_FIX_STATE_DIR
  ? path.resolve(process.env.MEDIA_URL_FIX_STATE_DIR)
  : path.join(PROJECT_ROOT, "var", "media-url-fix");
const BACKFILL_STATE_DIR = process.env.VIDEO_BACKFILL_STATE_DIR
  ? path.resolve(process.env.VIDEO_BACKFILL_STATE_DIR)
  : path.join(PROJECT_ROOT, "var", "video-backfill");
const MANIFEST_PATH = path.join(BACKFILL_STATE_DIR, "manifest.json");
const SOURCE_MAP_PATH = path.join(BACKFILL_STATE_DIR, "source-playback-map.json");
const LOCK_PATH = path.join(STATE_DIR, ".lock");
const PROGRESS_PATH = path.join(STATE_DIR, "progress.json");
const BACKUP_DIR = path.join(STATE_DIR, "backups");

type TextTarget = {
  model:
    | "invitationMedia"
    | "invitationGalleryItem"
    | "invitationOrder"
    | "eventMemoryUpload";
  field: string;
  table: string;
};

const TEXT_TARGETS: TextTarget[] = [
  { model: "invitationMedia", field: "url", table: "invitation_media" },
  { model: "invitationGalleryItem", field: "url", table: "invitation_gallery_items" },
  { model: "invitationOrder", field: "previewUrl", table: "invitation_orders" },
  { model: "invitationOrder", field: "previewVideoUrl", table: "invitation_orders" },
  { model: "eventMemoryUpload", field: "mediaUrl", table: "event_memory_uploads" },
  { model: "eventMemoryUpload", field: "thumbnailUrl", table: "event_memory_uploads" },
];

const JSON_TARGETS: Array<{ model: "invitation" | "invitationOrder"; table: string; field: string }> = [
  { model: "invitation", table: "invitations", field: "designConfig" },
  { model: "invitationOrder", table: "invitation_orders", field: "designConfig" },
  { model: "invitationOrder", table: "invitation_orders", field: "sections" },
  { model: "invitationOrder", table: "invitation_orders", field: "galleryUrls" },
  { model: "invitationOrder", table: "invitation_orders", field: "inspirationAssets" },
  { model: "invitationOrder", table: "invitation_orders", field: "fulfilledAddons" },
];

interface CliOptions {
  dryRun: boolean;
  limit: number | null;
  resume: boolean;
  rollbackFile: string | null;
  help: boolean;
}

interface ProgressState {
  runId: string;
  completedKeys: string[];
  updatedAt: string;
}

interface PlannedChange {
  key: string;
  model: string;
  id: string;
  field: string;
  oldValue: string;
  newValue: string;
  isJson: boolean;
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    dryRun: false,
    limit: null,
    resume: false,
    rollbackFile: null,
    help: false,
  };
  for (const arg of argv) {
    if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--resume") options.resume = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg.startsWith("--limit=")) options.limit = Number(arg.slice("--limit=".length)) || null;
    else if (arg.startsWith("--rollback=")) options.rollbackFile = arg.slice("--rollback=".length);
  }
  return options;
}

function printHelp() {
  console.log(`
Fix legacy local media URLs in the database (idempotent).

Options:
  --dry-run              Report planned updates; write dry-run report only.
  --limit=N              Apply at most N verified field updates this run.
  --resume               Continue after an interrupted run (clears stale lock).
  --rollback=<file>      Revert DB changes from a rollback-*.json manifest.
  --help                 Show this message.
`);
}

async function loadJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function loadSourceMap(): Promise<SourcePlaybackMap> {
  const manifest = await loadJsonFile<BackfillManifest>(MANIFEST_PATH, createEmptyManifest());
  const fromManifest = sourcePlaybackMapFromManifest(manifest);
  const persisted = await loadJsonFile<SourcePlaybackMap>(
    SOURCE_MAP_PATH,
    createEmptySourcePlaybackMap()
  );
  return mergeSourcePlaybackMaps(fromManifest, persisted);
}

function resolveSqliteFilePath(): string | null {
  const url = process.env.DATABASE_URL ?? "";
  if (!url.startsWith("file:")) return null;
  const withoutScheme = url.slice("file:".length).split("?")[0];
  return path.resolve(PROJECT_ROOT, "prisma", withoutScheme);
}

async function backupSqliteOnce(runId: string): Promise<string | null> {
  const dbPath = resolveSqliteFilePath();
  if (!dbPath || !existsSync(dbPath)) return null;
  await mkdir(BACKUP_DIR, { recursive: true });
  const backupPath = path.join(BACKUP_DIR, `${path.basename(dbPath)}.${runId}.bak`);
  await copyFile(dbPath, backupPath);
  return backupPath;
}

async function acquireLock(resume: boolean): Promise<void> {
  await mkdir(STATE_DIR, { recursive: true });
  if (existsSync(LOCK_PATH)) {
    if (!resume) {
      throw new Error(
        `Lock exists at ${LOCK_PATH}. Pass --resume to continue, or delete the lock if no run is active.`
      );
    }
    await unlink(LOCK_PATH).catch(() => {});
  }
  await writeFile(
    LOCK_PATH,
    JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }),
    "utf8"
  );
}

async function releaseLock(): Promise<void> {
  await unlink(LOCK_PATH).catch(() => {});
}

async function appendReport(runId: string, entry: Record<string, unknown>): Promise<void> {
  await mkdir(STATE_DIR, { recursive: true });
  const line = `${JSON.stringify({ ts: new Date().toISOString(), runId, ...entry })}\n`;
  await appendFile(path.join(STATE_DIR, `report-${runId}.jsonl`), line, "utf8");
}

function looksLikeLegacyNeedle(value: string): boolean {
  return (
    isLegacyLocalUploadUrl(value) ||
    value.includes("/api/uploads/") ||
    /localhost|127\.0\.0\.1/i.test(value) ||
    /\/public\/uploads\//i.test(value) ||
    /\.mov(\?|#|$)/i.test(value)
  );
}

async function planTextChanges(
  sourceMap: SourcePlaybackMap,
  completed: Set<string>
): Promise<PlannedChange[]> {
  const planned: PlannedChange[] = [];
  for (const target of TEXT_TARGETS) {
    const delegate = (prisma as unknown as Record<string, { findMany: Function }>)[target.model];
    const rows: Array<Record<string, unknown>> = await delegate.findMany({
      select: { id: true, [target.field]: true },
      take: 100_000,
    });
    for (const row of rows) {
      const id = String(row.id);
      const key = `${target.model}:${id}:${target.field}`;
      if (completed.has(key)) continue;
      const oldValue = row[target.field];
      if (typeof oldValue !== "string" || !oldValue.trim()) continue;
      if (!shouldUpdateStoredMediaUrl(oldValue, sourceMap) && !looksLikeLegacyNeedle(oldValue)) {
        continue;
      }
      const newValue = normalizeStoredMediaUrl(oldValue, sourceMap);
      if (!newValue || newValue === oldValue.trim()) continue;
      // Safety: only rewrite verified local-upload style URLs.
      if (!newValue.startsWith("/uploads/") && !/^https?:\/\//i.test(newValue)) continue;
      planned.push({
        key,
        model: target.model,
        id,
        field: target.field,
        oldValue,
        newValue,
        isJson: false,
      });
    }
  }
  return planned;
}

async function planJsonChanges(
  sourceMap: SourcePlaybackMap,
  completed: Set<string>
): Promise<PlannedChange[]> {
  const planned: PlannedChange[] = [];
  const needles = [
    "/api/uploads/",
    "localhost",
    "127.0.0.1",
    "/public/uploads/",
    "public/uploads/",
    ".mov",
  ];

  for (const target of JSON_TARGETS) {
    const seenIds = new Set<string>();
    for (const needle of needles) {
      const rows = await prisma.$queryRawUnsafe<Array<{ id: string; value: unknown }>>(
        `SELECT id, ${target.field} as value FROM ${target.table} WHERE ${target.field} LIKE ?`,
        `%${needle}%`
      );
      for (const row of rows) {
        if (seenIds.has(row.id)) continue;
        seenIds.add(row.id);
        const key = `${target.model}:${row.id}:${target.field}`;
        if (completed.has(key)) continue;
        if (row.value === null || row.value === undefined) continue;

        let parsed: unknown;
        let originalAsString: string;
        if (typeof row.value === "string") {
          try {
            parsed = JSON.parse(row.value);
          } catch {
            continue;
          }
          originalAsString = row.value;
        } else {
          parsed = row.value;
          originalAsString = JSON.stringify(row.value);
        }

        const replacements = new Map<string, string>();
        const collect = (input: unknown): void => {
          if (typeof input === "string") {
            if (shouldUpdateStoredMediaUrl(input, sourceMap) || looksLikeLegacyNeedle(input)) {
              const next = normalizeStoredMediaUrl(input, sourceMap);
              if (next && next !== input.trim()) replacements.set(input, next);
            }
            return;
          }
          if (Array.isArray(input)) {
            for (const item of input) collect(item);
            return;
          }
          if (input && typeof input === "object") {
            for (const val of Object.values(input as Record<string, unknown>)) collect(val);
          }
        };
        collect(parsed);
        if (replacements.size === 0) continue;

        const { value: nextValue, changed } = deepReplaceUrlsInJson(parsed, replacements);
        if (!changed) continue;
        const nextJsonString = JSON.stringify(nextValue);
        if (nextJsonString === originalAsString) continue;

        planned.push({
          key,
          model: target.model,
          id: row.id,
          field: target.field,
          oldValue: originalAsString,
          newValue: nextJsonString,
          isJson: true,
        });
      }
    }
  }
  return planned;
}

async function applyChange(change: PlannedChange, dryRun: boolean): Promise<void> {
  if (dryRun) return;
  if (change.isJson) {
    const table =
      change.model === "invitation"
        ? "invitations"
        : change.model === "invitationOrder"
          ? "invitation_orders"
          : "";
    if (!table) throw new Error(`Unknown JSON model ${change.model}`);
    await prisma.$executeRawUnsafe(
      `UPDATE ${table} SET ${change.field} = ? WHERE id = ?`,
      change.newValue,
      change.id
    );
    return;
  }
  const delegate = (prisma as unknown as Record<string, { update: Function }>)[change.model];
  await delegate.update({
    where: { id: change.id },
    data: { [change.field]: change.newValue },
  });
}

async function runRollback(rollbackFile: string): Promise<void> {
  const absPath = path.isAbsolute(rollbackFile)
    ? rollbackFile
    : path.join(PROJECT_ROOT, rollbackFile);
  const raw = await readFile(absPath, "utf8");
  const records = JSON.parse(raw) as RollbackRecord[];
  console.log(`[media:urls:fix] reverting ${records.length} change(s) from ${absPath}`);

  for (const record of [...records].reverse()) {
    if (record.isJson) {
      const table = record.model === "invitation" ? "invitations" : "invitation_orders";
      await prisma.$executeRawUnsafe(
        `UPDATE ${table} SET ${record.field} = ? WHERE id = ?`,
        record.oldValue,
        record.id
      );
    } else {
      const delegate = (prisma as unknown as Record<string, { update: Function }>)[record.model];
      await delegate.update({
        where: { id: record.id },
        data: { [record.field]: record.oldValue },
      });
    }
  }
  console.log(`[media:urls:fix] rollback done — ${records.length} row(s) restored.`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  if (options.rollbackFile) {
    await runRollback(options.rollbackFile);
    return;
  }

  const runId = new Date().toISOString().replace(/[:.]/g, "-");
  await acquireLock(options.resume);

  try {
    const sourceMap = await loadSourceMap();
    // Persist merged map so audit + future fixes share the same durable mapping.
    await mkdir(BACKFILL_STATE_DIR, { recursive: true });
    await writeFile(SOURCE_MAP_PATH, JSON.stringify(sourceMap, null, 2), "utf8");

    const progress = options.resume
      ? await loadJsonFile<ProgressState>(PROGRESS_PATH, {
          runId,
          completedKeys: [],
          updatedAt: new Date().toISOString(),
        })
      : { runId, completedKeys: [] as string[], updatedAt: new Date().toISOString() };
    const completed = new Set(progress.completedKeys);

    console.log(
      `[media:urls:fix] dryRun=${options.dryRun} limit=${options.limit ?? "∞"} mappedSources=${Object.keys(sourceMap.entries).length}`
    );

    const planned = [
      ...(await planTextChanges(sourceMap, completed)),
      ...(await planJsonChanges(sourceMap, completed)),
    ];

    const toApply = options.limit ? planned.slice(0, options.limit) : planned;
    console.log(
      `[media:urls:fix] planned=${planned.length} applying=${toApply.length} skippedCompleted=${completed.size}`
    );

    const dryRunReportPath = path.join(STATE_DIR, `dry-run-${runId}.json`);
    await mkdir(STATE_DIR, { recursive: true });
    await writeFile(
      dryRunReportPath,
      JSON.stringify(
        {
          runId,
          dryRun: options.dryRun,
          plannedCount: planned.length,
          applyingCount: toApply.length,
          changes: toApply.map((c) => ({
            key: c.key,
            model: c.model,
            id: c.id,
            field: c.field,
            oldValue: c.oldValue.slice(0, 500),
            newValue: c.newValue.slice(0, 500),
            isJson: c.isJson,
          })),
        },
        null,
        2
      ),
      "utf8"
    );
    console.log(`[media:urls:fix] dry-run report ${dryRunReportPath}`);

    if (options.dryRun) {
      console.log("[media:urls:fix] DRY RUN complete — no database rows updated.");
      return;
    }

    let backupPath: string | null = null;
    if (toApply.length > 0) {
      backupPath = await backupSqliteOnce(runId);
      if (backupPath) console.log(`[media:urls:fix] SQLite backup ${backupPath}`);
    }

    const rollback: RollbackRecord[] = [];
    let updated = 0;
    for (const change of toApply) {
      await applyChange(change, false);
      rollback.push({
        model: change.model,
        id: change.id,
        field: change.field,
        oldValue: change.oldValue,
        newValue: change.newValue,
        isJson: change.isJson,
      });
      completed.add(change.key);
      updated += 1;
      await appendReport(runId, {
        event: "updated",
        key: change.key,
        oldValue: change.oldValue.slice(0, 300),
        newValue: change.newValue.slice(0, 300),
      });
      await writeFile(
        PROGRESS_PATH,
        JSON.stringify(
          {
            runId,
            completedKeys: [...completed],
            updatedAt: new Date().toISOString(),
          } satisfies ProgressState,
          null,
          2
        ),
        "utf8"
      );
    }

    if (rollback.length > 0) {
      const rollbackPath = path.join(STATE_DIR, `rollback-${runId}.json`);
      await writeFile(rollbackPath, JSON.stringify(rollback, null, 2), "utf8");
      console.log(
        `[media:urls:fix] rollback manifest ${rollbackPath} (${rollback.length} change(s))`
      );
    }

    // Idempotent second pass check — remaining planned after apply should shrink.
    const remaining = [
      ...(await planTextChanges(sourceMap, completed)),
      ...(await planJsonChanges(sourceMap, new Set(completed))),
    ];
    console.log(
      `[media:urls:fix] complete — updated=${updated} remaining=${remaining.length} backup=${backupPath ?? "none"}`
    );
  } finally {
    await releaseLock();
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("[media:urls:fix] fatal", error);
  process.exit(1);
});
