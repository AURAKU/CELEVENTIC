/**
 * One-time / re-runnable backfill: converts every pre-existing invitation video under
 * `public/uploads/invitations/` (or `UPLOAD_DIR` in production) that isn't already a browser-
 * universal MP4 into one via the same `processVideoFile` engine the live upload route uses, then
 * safely rewrites every database reference (text columns + JSON fields) from the old URL to the
 * new processed URL.
 *
 * Usage:
 *   npm run video:backfill -- --dry-run              # report only, touches nothing
 *   npm run video:backfill                            # convert + update DB
 *   npm run video:backfill -- --limit=20               # cap this run to 20 files
 *   npm run video:backfill -- --user-id=<id>           # only that user's uploads
 *   npm run video:backfill -- --resume                 # continue after a previous interrupted run
 *   npm run video:backfill -- --rollback=var/video-backfill/rollback-<runId>.json
 *
 * Safety:
 *   - NEVER deletes or modifies the original source file — only ever writes new files under a
 *     `processed/` subdirectory.
 *   - NEVER runs `prisma migrate reset` / `db push --force-reset` / touches `.env`.
 *   - Backs up the SQLite database file once per run before the first write (skipped for
 *     non-SQLite `DATABASE_URL`s — back up with your normal DB tooling instead).
 *   - Idempotent: a manifest on disk (`var/video-backfill/manifest.json`) records the outcome of
 *     every source file by relative path + size + mtime; re-running (with or without `--resume`)
 *     never reprocesses a file that's already `DONE`/`SKIPPED_COMPATIBLE` for its current bytes.
 *   - Resumable: the manifest is flushed to disk after every single file, so a killed/crashed run
 *     picks up exactly where it left off.
 *   - One-at-a-time: files are processed sequentially (matches `VIDEO_PROCESSOR_CONCURRENCY=1`
 *     production default) — no concurrent ffmpeg/converter runs from this script.
 *   - A rollback manifest is written for every DB mutation this run makes, so `--rollback` can
 *     put affected rows back to their exact prior value (it does NOT delete the generated
 *     processed video files — those are harmless to leave in place).
 */
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, stat, writeFile, appendFile, copyFile, unlink } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

import { getUploadRoot, storeUploadFile } from "../src/lib/uploads/file-storage";
import { processVideoFile, generateThumbnail, probeVideoFile, isAlreadyBrowserCompatible } from "../src/lib/video/video-processor";
import {
  isBackfillCandidatePath,
  parseInvitationUploadPath,
  buildOldUrlCandidates,
  buildProcessedRelativePaths,
  deepReplaceUrlsInJson,
  buildReplacementMap,
  manifestEntryIsUpToDate,
  createEmptyManifest,
  toPosixRelative,
  type BackfillManifest,
  type BackfillManifestEntry,
  type RollbackRecord,
} from "../src/lib/video/backfill-utils";

const prisma = new PrismaClient();

const PROJECT_ROOT = path.join(__dirname, "..");
// Overridable for isolated test runs (`VIDEO_BACKFILL_STATE_DIR`) — defaults to the repo-relative
// `var/video-backfill/` used in normal operation (manifest, audit logs, backups, lock file).
const STATE_DIR = process.env.VIDEO_BACKFILL_STATE_DIR
  ? path.resolve(process.env.VIDEO_BACKFILL_STATE_DIR)
  : path.join(PROJECT_ROOT, "var", "video-backfill");
const MANIFEST_PATH = path.join(STATE_DIR, "manifest.json");
const LOCK_PATH = path.join(STATE_DIR, ".lock");
const BACKUP_DIR = path.join(STATE_DIR, "backups");

// Text (String) columns that may hold a direct invitation-video URL.
const TEXT_FIELD_TARGETS: Array<{ model: "invitationMedia" | "invitationGalleryItem" | "invitationOrder"; field: string }> = [
  { model: "invitationMedia", field: "url" },
  { model: "invitationGalleryItem", field: "url" },
  { model: "invitationOrder", field: "previewUrl" },
  { model: "invitationOrder", field: "previewVideoUrl" },
];

// JSON columns (stored as TEXT under SQLite) that may embed an invitation-video URL anywhere
// inside nested design/gallery/inspiration structures.
const JSON_FIELD_TARGETS: Array<{ model: "invitation" | "invitationOrder"; table: string; field: string }> = [
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
  userId: string | null;
  resume: boolean;
  rollbackFile: string | null;
  help: boolean;
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = { dryRun: false, limit: null, userId: null, resume: false, rollbackFile: null, help: false };
  for (const arg of argv) {
    if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--resume") options.resume = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg.startsWith("--limit=")) options.limit = Number(arg.slice("--limit=".length)) || null;
    else if (arg.startsWith("--user-id=")) options.userId = arg.slice("--user-id=".length);
    else if (arg.startsWith("--rollback=")) options.rollbackFile = arg.slice("--rollback=".length);
  }
  return options;
}

function printHelp() {
  console.log(`
Backfill invitation videos to browser-universal MP4 playback + fix DB references.

Options:
  --dry-run            Report what would happen; writes nothing (no files, no DB, no manifest).
  --limit=N            Process at most N files this run.
  --user-id=<id>       Only scan invitations/<id>/...
  --resume             Required to continue past a previous run that didn't shut down cleanly.
  --rollback=<file>    Revert every DB change recorded in the given rollback-*.json file, then exit.
  --help               Show this message.
`);
}

// ─── Manifest I/O ───────────────────────────────────────────────────────────

async function loadManifest(): Promise<BackfillManifest> {
  try {
    const raw = await readFile(MANIFEST_PATH, "utf8");
    const parsed = JSON.parse(raw) as BackfillManifest;
    if (parsed && parsed.version === 1 && parsed.entries) return parsed;
  } catch {
    /* no manifest yet, or unreadable — start fresh */
  }
  return createEmptyManifest();
}

async function saveManifest(manifest: BackfillManifest): Promise<void> {
  manifest.updatedAt = new Date().toISOString();
  await mkdir(STATE_DIR, { recursive: true });
  const tmpPath = `${MANIFEST_PATH}.tmp`;
  await writeFile(tmpPath, JSON.stringify(manifest, null, 2), "utf8");
  // Atomic-ish replace — avoids ever leaving a half-written manifest.json behind on a crash.
  await import("node:fs/promises").then((fs) => fs.rename(tmpPath, MANIFEST_PATH));
}

async function appendAudit(runId: string, entry: Record<string, unknown>): Promise<void> {
  await mkdir(STATE_DIR, { recursive: true });
  const line = JSON.stringify({ ts: new Date().toISOString(), runId, ...entry }) + "\n";
  await appendFile(path.join(STATE_DIR, `audit-${runId}.jsonl`), line, "utf8");
}

// ─── Filesystem scan ────────────────────────────────────────────────────────

interface CandidateFile {
  absolutePath: string;
  relativePath: string; // POSIX, relative to the upload root, e.g. "invitations/u1/clip.mov"
  userId: string;
  sizeBytes: number;
  mtimeMs: number;
}

async function scanCandidates(uploadRoot: string, userIdFilter: string | null): Promise<CandidateFile[]> {
  const invitationsRoot = path.join(uploadRoot, "invitations");
  if (!existsSync(invitationsRoot)) return [];

  const results: CandidateFile[] = [];

  async function walk(dir: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(abs);
        continue;
      }
      if (!entry.isFile()) continue;
      const relativePath = toPosixRelative(path.relative(uploadRoot, abs));
      if (!isBackfillCandidatePath(relativePath)) continue;
      const info = parseInvitationUploadPath(relativePath);
      if (!info) continue;
      if (userIdFilter && info.userId !== userIdFilter) continue;
      const stats = await stat(abs);
      results.push({ absolutePath: abs, relativePath, userId: info.userId, sizeBytes: stats.size, mtimeMs: stats.mtimeMs });
    }
  }

  await walk(invitationsRoot);
  // Deterministic order — makes `--limit` + `--resume` predictable across runs.
  results.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  return results;
}

// ─── SQLite backup ──────────────────────────────────────────────────────────

function resolveSqliteFilePath(): string | null {
  const url = process.env.DATABASE_URL ?? "";
  if (!url.startsWith("file:")) return null;
  const withoutScheme = url.slice("file:".length).split("?")[0];
  // Prisma resolves sqlite `file:` URLs relative to the schema file's directory (prisma/), not cwd.
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

// ─── DB reference rewriting ─────────────────────────────────────────────────

async function updateTextFieldReferences(
  target: { model: "invitationMedia" | "invitationGalleryItem" | "invitationOrder"; field: string },
  replacements: Map<string, string>,
  dryRun: boolean,
  rollback: RollbackRecord[]
): Promise<number> {
  let touched = 0;
  const delegate = (prisma as unknown as Record<string, { findMany: Function; update: Function }>)[target.model];
  for (const [oldUrl, newUrl] of replacements) {
    const rows: Array<Record<string, unknown>> = await delegate.findMany({
      where: { [target.field]: { contains: oldUrl } },
    });
    for (const row of rows) {
      const oldValue = String(row[target.field] ?? "");
      const newValue = oldValue.split(oldUrl).join(newUrl);
      if (newValue === oldValue) continue;
      if (!dryRun) {
        await delegate.update({ where: { id: row.id as string }, data: { [target.field]: newValue } });
      }
      rollback.push({ model: target.model, id: row.id as string, field: target.field, oldValue, newValue, isJson: false });
      touched++;
    }
  }
  return touched;
}

async function updateJsonFieldReferences(
  target: { model: "invitation" | "invitationOrder"; table: string; field: string },
  needle: string,
  replacements: Map<string, string>,
  dryRun: boolean,
  rollback: RollbackRecord[]
): Promise<number> {
  let touched = 0;
  const likePattern = `%${needle}%`;
  // Raw SQL is used here (not the Prisma Json filter API) because "does this JSON blob contain
  // this substring anywhere, at any nesting depth" isn't portably expressible as a Prisma Json
  // filter, and the underlying column is plain TEXT under SQLite anyway. Table/column names are
  // fixed internal constants (never user input) — only the search value is parameterized.
  //
  // NOTE: Prisma's raw-query engine auto-deserializes columns it knows are `Json` in the schema
  // (via the alias) into JS objects/arrays even through $queryRawUnsafe — it does NOT hand back
  // the raw TEXT. `row.value` can therefore be a string (older/edge-case shapes) OR an already-
  // parsed object/array; handle both rather than assuming `JSON.parse` is always needed.
  const rows = await prisma.$queryRawUnsafe<Array<{ id: string; value: unknown }>>(
    `SELECT id, ${target.field} as value FROM ${target.table} WHERE ${target.field} LIKE ?`,
    likePattern
  );
  for (const row of rows) {
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
    const { value: nextValue, changed } = deepReplaceUrlsInJson(parsed, replacements);
    if (!changed) continue;
    const nextJsonString = JSON.stringify(nextValue);
    if (!dryRun) {
      await prisma.$executeRawUnsafe(`UPDATE ${target.table} SET ${target.field} = ? WHERE id = ?`, nextJsonString, row.id);
    }
    rollback.push({ model: target.model, id: row.id, field: target.field, oldValue: originalAsString, newValue: nextJsonString, isJson: true });
    touched++;
  }
  return touched;
}

async function updateAllDbReferences(
  relativePath: string,
  newUrl: string,
  dryRun: boolean,
  rollback: RollbackRecord[]
): Promise<number> {
  const oldCandidates = buildOldUrlCandidates(relativePath);
  const replacements = buildReplacementMap(oldCandidates, newUrl);
  if (replacements.size === 0) return 0;

  let total = 0;
  for (const target of TEXT_FIELD_TARGETS) {
    total += await updateTextFieldReferences(target, replacements, dryRun, rollback);
  }
  const needle = path.posix.basename(relativePath);
  for (const target of JSON_FIELD_TARGETS) {
    total += await updateJsonFieldReferences(target, needle, replacements, dryRun, rollback);
  }
  return total;
}

// ─── Rollback ───────────────────────────────────────────────────────────────

async function runRollback(rollbackFile: string): Promise<void> {
  const absPath = path.isAbsolute(rollbackFile) ? rollbackFile : path.join(PROJECT_ROOT, rollbackFile);
  const raw = await readFile(absPath, "utf8");
  const records = JSON.parse(raw) as RollbackRecord[];
  console.log(`[rollback] reverting ${records.length} change(s) from ${absPath}`);

  // Reverse order — later writes to the same row are undone first.
  for (const record of [...records].reverse()) {
    if (record.isJson) {
      const table = record.model === "invitation" ? "invitations" : "invitation_orders";
      await prisma.$executeRawUnsafe(`UPDATE ${table} SET ${record.field} = ? WHERE id = ?`, record.oldValue, record.id);
    } else {
      const delegate = (prisma as unknown as Record<string, { update: Function }>)[record.model];
      await delegate.update({ where: { id: record.id }, data: { [record.field]: record.oldValue } });
    }
  }
  console.log(`[rollback] done — ${records.length} row(s) restored.`);
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function acquireLock(resume: boolean): Promise<void> {
  await mkdir(STATE_DIR, { recursive: true });
  if (existsSync(LOCK_PATH)) {
    if (!resume) {
      throw new Error(
        `A previous backfill run's lock file exists at ${LOCK_PATH} (it may have been interrupted). ` +
          `Pass --resume to continue safely, or delete the lock file manually if you're certain no other run is active.`
      );
    }
    await unlink(LOCK_PATH).catch(() => {});
  }
  await writeFile(LOCK_PATH, JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }), "utf8");
}

async function releaseLock(): Promise<void> {
  await unlink(LOCK_PATH).catch(() => {});
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
    const uploadRoot = getUploadRoot();
    const manifest = await loadManifest();
    const rollback: RollbackRecord[] = [];

    console.log(`[backfill] scanning ${path.join(uploadRoot, "invitations")} ...`);
    const candidates = await scanCandidates(uploadRoot, options.userId);
    console.log(`[backfill] found ${candidates.length} raw video file(s) under invitations/${options.userId ? ` (user ${options.userId})` : ""}`);

    const pending = candidates.filter(
      (c) => !manifestEntryIsUpToDate(manifest.entries[c.relativePath], c.sizeBytes, c.mtimeMs)
    );
    const alreadyDone = candidates.length - pending.length;
    console.log(`[backfill] ${alreadyDone} already up to date (skipped) — ${pending.length} to process this run`);

    const toProcess = options.limit ? pending.slice(0, options.limit) : pending;
    if (options.dryRun) {
      console.log(`[backfill] DRY RUN — would process ${toProcess.length} file(s), no files or DB rows will be written.`);
      for (const file of toProcess) {
        console.log(`  - ${file.relativePath} (${(file.sizeBytes / 1024 / 1024).toFixed(1)} MB)`);
      }
      return;
    }

    let backedUpDbPath: string | null = null;
    if (toProcess.length > 0) {
      backedUpDbPath = await backupSqliteOnce(runId);
      if (backedUpDbPath) console.log(`[backfill] SQLite backup written to ${backedUpDbPath}`);
      else console.log(`[backfill] DATABASE_URL is not a local SQLite file — skipped file backup (back up with your normal DB tooling).`);
    }

    let converted = 0;
    let skippedCompatible = 0;
    let failed = 0;

    for (const file of toProcess) {
      await appendAudit(runId, { event: "scan", relativePath: file.relativePath, sizeBytes: file.sizeBytes });
      try {
        const buffer = await readFile(file.absolutePath);
        const probe = await probeVideoFile(file.absolutePath).catch(() => null);
        const extensionHint = path.extname(file.relativePath).replace(".", "");

        const result = await processVideoFile(buffer, { extensionHint });
        if (!result.success || !result.outputBuffer) {
          failed++;
          const entry: BackfillManifestEntry = {
            relativePath: file.relativePath,
            userId: file.userId,
            status: "FAILED",
            sourceSizeBytes: file.sizeBytes,
            sourceMtimeMs: file.mtimeMs,
            error: result.error ?? "Video processing failed.",
            processedAt: new Date().toISOString(),
          };
          manifest.entries[file.relativePath] = entry;
          await saveManifest(manifest);
          await appendAudit(runId, { event: "failed", relativePath: file.relativePath, error: entry.error });
          console.error(`[backfill] FAILED  ${file.relativePath} — ${entry.error}`);
          continue;
        }

        const baseId = `${Date.now()}-${randomUUID().slice(0, 8)}`;
        const { url: playbackUrl } = await storeUploadFile(
          "invitations",
          `${file.userId}/processed`,
          `${baseId}-playback.mp4`,
          result.outputBuffer
        );

        let posterUrl: string | null = null;
        let thumbnailUrl: string | null = null;
        if (result.posterBuffer) {
          const poster = await storeUploadFile("invitations", `${file.userId}/processed`, `${baseId}-poster.jpg`, result.posterBuffer);
          posterUrl = poster.url;
          const thumbBuffer = await generateThumbnail(result.posterBuffer).catch(() => null);
          if (thumbBuffer) {
            const thumb = await storeUploadFile("invitations", `${file.userId}/processed`, `${baseId}-thumbnail.jpg`, thumbBuffer);
            thumbnailUrl = thumb.url;
          } else {
            thumbnailUrl = posterUrl;
          }
        }

        const dbRowsUpdated = await updateAllDbReferences(file.relativePath, playbackUrl, false, rollback);
        const wasAlreadyCompatible = probe ? isAlreadyBrowserCompatible(probe) : false;

        const paths = buildProcessedRelativePaths(file.userId, baseId);
        const entry: BackfillManifestEntry = {
          relativePath: file.relativePath,
          userId: file.userId,
          status: wasAlreadyCompatible && result.method === "ffmpeg-remux" ? "SKIPPED_COMPATIBLE" : "DONE",
          sourceSizeBytes: file.sizeBytes,
          sourceMtimeMs: file.mtimeMs,
          playbackRelativePath: paths.playback,
          posterRelativePath: paths.poster,
          thumbnailRelativePath: paths.thumbnail,
          playbackUrl,
          posterUrl,
          thumbnailUrl,
          method: result.method,
          durationSeconds: result.metadata.durationSeconds,
          width: result.metadata.width,
          height: result.metadata.height,
          processedAt: new Date().toISOString(),
          dbRowsUpdated,
        };
        manifest.entries[file.relativePath] = entry;
        await saveManifest(manifest);
        await appendAudit(runId, { event: "converted", relativePath: file.relativePath, playbackUrl, dbRowsUpdated, method: result.method });

        if (entry.status === "SKIPPED_COMPATIBLE") skippedCompatible++;
        else converted++;
        console.log(
          `[backfill] OK  ${file.relativePath} -> ${playbackUrl} (${result.method}, ${dbRowsUpdated} DB reference(s) updated)`
        );
      } catch (error) {
        failed++;
        const message = error instanceof Error ? error.message : "Unknown error";
        manifest.entries[file.relativePath] = {
          relativePath: file.relativePath,
          userId: file.userId,
          status: "FAILED",
          sourceSizeBytes: file.sizeBytes,
          sourceMtimeMs: file.mtimeMs,
          error: message,
          processedAt: new Date().toISOString(),
        };
        await saveManifest(manifest);
        await appendAudit(runId, { event: "error", relativePath: file.relativePath, error: message });
        console.error(`[backfill] ERROR ${file.relativePath} — ${message}`);
      }
    }

    if (rollback.length > 0) {
      await mkdir(STATE_DIR, { recursive: true });
      const rollbackPath = path.join(STATE_DIR, `rollback-${runId}.json`);
      await writeFile(rollbackPath, JSON.stringify(rollback, null, 2), "utf8");
      console.log(`[backfill] rollback manifest written to ${rollbackPath} (${rollback.length} DB change(s))`);
    }

    console.log(
      `[backfill] run complete — converted=${converted} skipped_compatible=${skippedCompatible} failed=${failed} remaining=${pending.length - toProcess.length}`
    );
    if (backedUpDbPath) console.log(`[backfill] DB backup: ${backedUpDbPath}`);
    if (pending.length - toProcess.length > 0) {
      console.log(`[backfill] Run again (optionally with --resume) to continue with the remaining files.`);
    }
  } finally {
    await releaseLock();
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("[backfill] fatal error", error);
  process.exit(1);
});
