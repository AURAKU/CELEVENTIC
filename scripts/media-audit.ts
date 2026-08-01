/**
 * Media audit — classifies disk sources using the backfill source→playback map so
 * already-converted MOV/incompatible MP4 files are not reported as needing conversion.
 *
 * Usage:
 *   npm run media:audit -- --dry-run
 *   npm run media:audit -- --limit=50
 *   npm run media:audit -- --event-id=<eventId>
 *   npm run media:audit -- --write-map
 */
import { createWriteStream } from "node:fs";
import { access, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { getUploadRoot } from "../src/lib/uploads/file-storage";
import {
  classifyMediaFile,
  createEmptySourcePlaybackMap,
  isLegacyLocalUploadUrl,
  isLocalhostMediaUrl,
  isProcessedPlaybackPath,
  isVideoSourceExtension,
  lookupPlaybackForSource,
  mergeSourcePlaybackMaps,
  normalizeStoredMediaUrl,
  shouldUpdateStoredMediaUrl,
  sourcePlaybackMapFromManifest,
  type MediaAuditKind,
  type SourcePlaybackMap,
} from "../src/lib/video/media-audit-utils";
import {
  createEmptyManifest,
  isBackfillCandidatePath,
  toPosixRelative,
  type BackfillManifest,
} from "../src/lib/video/backfill-utils";
import { probeVideoFile, isAlreadyBrowserCompatible } from "../src/lib/video/video-processor";

const prisma = new PrismaClient();
const PROJECT_ROOT = path.join(__dirname, "..");
const STATE_DIR = path.join(PROJECT_ROOT, "var", "media-audit");
const BACKFILL_STATE_DIR = process.env.VIDEO_BACKFILL_STATE_DIR
  ? path.resolve(process.env.VIDEO_BACKFILL_STATE_DIR)
  : path.join(PROJECT_ROOT, "var", "video-backfill");
const MANIFEST_PATH = path.join(BACKFILL_STATE_DIR, "manifest.json");
const SOURCE_MAP_PATH = path.join(BACKFILL_STATE_DIR, "source-playback-map.json");

type Finding = {
  kind: MediaAuditKind | "legacy_api_url" | "localhost_url";
  relativePath?: string;
  url?: string;
  detail?: string;
  playbackRelativePath?: string;
};

function parseArgs(argv: string[]) {
  const flags = new Set(argv.filter((a) => a.startsWith("--") && !a.includes("=")));
  const opts: Record<string, string> = {};
  for (const arg of argv) {
    const m = arg.match(/^--([^=]+)=(.*)$/);
    if (m) opts[m[1]] = m[2];
  }
  return {
    dryRun: flags.has("--dry-run") || process.env.MEDIA_AUDIT_DRY_RUN === "1" || !flags.has("--apply"),
    limit: opts.limit ? parseInt(opts.limit, 10) : undefined,
    eventId: opts["event-id"],
    writeMap: flags.has("--write-map"),
    backfill: flags.has("--backfill"),
    resume: flags.has("--resume"),
  };
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function loadJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function* walkFiles(dir: string): AsyncGenerator<string> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkFiles(full);
    } else if (entry.isFile()) {
      yield full;
    }
  }
}

function toRelative(full: string, root: string): string {
  return toPosixRelative(path.relative(root, full));
}

async function loadSourceMap(): Promise<SourcePlaybackMap> {
  const manifest = await loadJsonFile<BackfillManifest>(MANIFEST_PATH, createEmptyManifest());
  const fromManifest = sourcePlaybackMapFromManifest(manifest);
  const persisted = await loadJsonFile<SourcePlaybackMap>(
    SOURCE_MAP_PATH,
    createEmptySourcePlaybackMap()
  );
  // Manifest is authoritative when both exist.
  return mergeSourcePlaybackMaps(fromManifest, persisted);
}

async function probeCompatible(absolutePath: string): Promise<{
  compatible: boolean | null;
  failed: boolean;
  detail?: string;
}> {
  try {
    const probe = await probeVideoFile(absolutePath);
    return { compatible: isAlreadyBrowserCompatible(probe), failed: false };
  } catch (error) {
    return {
      compatible: null,
      failed: true,
      detail: error instanceof Error ? error.message : "probe failed",
    };
  }
}

async function auditDisk(
  root: string,
  sourceMap: SourcePlaybackMap,
  limit?: number
): Promise<{ findings: Finding[]; refreshedMap: SourcePlaybackMap }> {
  const findings: Finding[] = [];
  const refreshedMap = createEmptySourcePlaybackMap();
  refreshedMap.entries = { ...sourceMap.entries };
  let count = 0;

  for await (const full of walkFiles(root)) {
    if (limit && count >= limit) break;
    const relativePath = toRelative(full, root);
    if (relativePath.includes(".gitkeep")) continue;
    count += 1;

    const st = await stat(full);
    if (st.size <= 0) {
      findings.push({
        kind: "failed_processing",
        relativePath,
        detail: "zero-byte file",
      });
      continue;
    }

    const processed = isProcessedPlaybackPath(relativePath);
    if (processed) {
      const probe = await probeCompatible(full);
      const kind = classifyMediaFile({
        relativePath,
        isProcessedOutput: true,
        browserCompatible: probe.compatible,
        probeFailed: probe.failed,
      });
      findings.push({
        kind,
        relativePath,
        detail: probe.detail,
      });
      continue;
    }

    if (!isVideoSourceExtension(relativePath)) {
      findings.push({ kind: "ok_non_video", relativePath });
      continue;
    }

    // Only invitation backfill candidates get conversion classifications.
    if (!isBackfillCandidatePath(relativePath) && !relativePath.startsWith("invitations/")) {
      const probe = /\.(mp4|m4v|mov|webm)$/i.test(relativePath)
        ? await probeCompatible(full)
        : { compatible: true as boolean | null, failed: false };
      findings.push({
        kind:
          probe.compatible === true
            ? "ready_original_compatible"
            : "ok_non_video",
        relativePath,
        detail: probe.detail,
      });
      continue;
    }

    const mapEntry = lookupPlaybackForSource(sourceMap, relativePath);
    let playbackExists = false;
    let playbackCompatible: boolean | null = null;
    if (mapEntry?.playbackRelativePath) {
      const playbackAbs = path.join(root, mapEntry.playbackRelativePath);
      playbackExists = await pathExists(playbackAbs);
      if (playbackExists) {
        const playbackProbe = await probeCompatible(playbackAbs);
        playbackCompatible = playbackProbe.failed ? false : playbackProbe.compatible;
        if (playbackCompatible) {
          refreshedMap.entries[relativePath] = {
            ...mapEntry,
            verifiedAt: new Date().toISOString(),
          };
        }
      }
    }

    const sourceProbe =
      /\.(mp4|m4v)$/i.test(relativePath) && !mapEntry
        ? await probeCompatible(full)
        : /\.(mp4|m4v)$/i.test(relativePath)
          ? await probeCompatible(full)
          : { compatible: false as boolean | null, failed: false, detail: undefined };

    // MOV is never "browser compatible" as an original for our purposes.
    const browserCompatible = /\.(mov|qt)$/i.test(relativePath)
      ? false
      : sourceProbe.compatible;

    const kind = classifyMediaFile({
      relativePath,
      isProcessedOutput: false,
      browserCompatible,
      probeFailed: sourceProbe.failed,
      mapEntry,
      playbackExists,
      playbackCompatible,
      sourceExists: true,
    });

    findings.push({
      kind,
      relativePath,
      playbackRelativePath: mapEntry?.playbackRelativePath,
      detail:
        kind === "source_converted"
          ? `mapped playback ${mapEntry?.playbackRelativePath ?? ""}`
          : sourceProbe.detail,
    });
  }

  refreshedMap.updatedAt = new Date().toISOString();
  return { findings, refreshedMap };
}

async function auditDbUrls(
  sourceMap: SourcePlaybackMap,
  eventId?: string
): Promise<Finding[]> {
  const findings: Finding[] = [];

  const pushUrl = (url: string, detail: string) => {
    if (!url?.trim()) return;
    if (!shouldUpdateStoredMediaUrl(url, sourceMap) && !isLegacyLocalUploadUrl(url) && !isLocalhostMediaUrl(url)) {
      return;
    }
    const normalized = normalizeStoredMediaUrl(url, sourceMap);
    if (normalized === url.trim()) return;
    findings.push({
      kind: isLocalhostMediaUrl(url) ? "localhost_url" : "legacy_api_url",
      url,
      detail: `${detail} → ${normalized}`,
    });
  };

  const media = await prisma.invitationMedia.findMany({
    select: { id: true, url: true },
    take: 50_000,
  });
  for (const row of media) pushUrl(row.url ?? "", `invitationMedia:${row.id}`);

  const gallery = await prisma.invitationGalleryItem.findMany({
    select: { id: true, url: true },
    take: 50_000,
  });
  for (const row of gallery) pushUrl(row.url ?? "", `gallery:${row.id}`);

  const memories = await prisma.eventMemoryUpload.findMany({
    where: eventId ? { eventId } : undefined,
    select: { id: true, mediaUrl: true, thumbnailUrl: true },
    take: 50_000,
  });
  for (const row of memories) {
    pushUrl(row.mediaUrl ?? "", `memory.mediaUrl:${row.id}`);
    pushUrl(row.thumbnailUrl ?? "", `memory.thumbnailUrl:${row.id}`);
  }

  const orders = await prisma.invitationOrder.findMany({
    where: eventId ? { eventId } : undefined,
    select: { id: true, previewUrl: true, previewVideoUrl: true },
    take: 50_000,
  });
  for (const row of orders) {
    pushUrl(row.previewUrl ?? "", `invitationOrder.previewUrl:${row.id}`);
    pushUrl(row.previewVideoUrl ?? "", `invitationOrder.previewVideoUrl:${row.id}`);
  }

  return findings;
}

/** Map entries whose source file is gone (mapping left behind after manual cleanup). */
async function auditMappedOrphans(
  root: string,
  sourceMap: SourcePlaybackMap
): Promise<Finding[]> {
  const findings: Finding[] = [];
  for (const [sourceRelativePath, entry] of Object.entries(sourceMap.entries)) {
    const sourceAbs = path.join(root, sourceRelativePath);
    if (await pathExists(sourceAbs)) continue;
    findings.push({
      kind: "orphaned_source",
      relativePath: sourceRelativePath,
      playbackRelativePath: entry.playbackRelativePath || undefined,
      detail: "map entry has no source file on disk (original may have been removed manually)",
    });
  }
  return findings;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  await mkdir(STATE_DIR, { recursive: true });
  await mkdir(BACKFILL_STATE_DIR, { recursive: true });
  const runId = new Date().toISOString().replace(/[:.]/g, "-");
  const reportPath = path.join(STATE_DIR, `audit-${runId}.jsonl`);

  console.log(
    `[media:audit] root=${getUploadRoot()} dryRun=${args.dryRun} limit=${args.limit ?? "∞"} map=${SOURCE_MAP_PATH}`
  );

  const uploadRoot = getUploadRoot();
  const sourceMap = await loadSourceMap();
  const { findings: diskFindings, refreshedMap } = await auditDisk(
    uploadRoot,
    sourceMap,
    args.limit
  );
  const orphanFindings = await auditMappedOrphans(uploadRoot, refreshedMap);
  const dbFindings = await auditDbUrls(refreshedMap, args.eventId);
  const findings = [...diskFindings, ...orphanFindings, ...dbFindings];

  // Always refresh the durable map from the authoritative manifest + verified probes
  // so subsequent audits do not reclassify converted sources as needing conversion.
  await writeFile(SOURCE_MAP_PATH, JSON.stringify(refreshedMap, null, 2), "utf8");
  console.log(
    `[media:audit] source-playback map ${SOURCE_MAP_PATH} (${Object.keys(refreshedMap.entries).length} entries)`
  );

  const stream = createWriteStream(reportPath, { flags: "a" });
  for (const finding of findings) {
    stream.write(`${JSON.stringify(finding)}\n`);
  }
  stream.end();

  const summary = findings.reduce<Record<string, number>>((acc, f) => {
    acc[f.kind] = (acc[f.kind] ?? 0) + 1;
    return acc;
  }, {});

  const summaryPath = path.join(STATE_DIR, `summary-${runId}.json`);
  await writeFile(
    summaryPath,
    JSON.stringify(
      {
        runId,
        summary,
        args,
        mappedSources: Object.keys(refreshedMap.entries).length,
        needsConversion: summary.source_needs_conversion ?? 0,
        converted: summary.source_converted ?? 0,
        legacyUrls: (summary.legacy_api_url ?? 0) + (summary.localhost_url ?? 0),
      },
      null,
      2
    )
  );

  console.log("[media:audit] summary", summary);
  console.log(`[media:audit] report ${reportPath}`);

  if ((summary.source_needs_conversion ?? 0) > 0) {
    console.log("[media:audit] run `npm run media:backfill` for remaining sources needing conversion.");
  }
  if ((summary.legacy_api_url ?? 0) + (summary.localhost_url ?? 0) > 0) {
    console.log("[media:audit] run `npm run media:urls:fix -- --dry-run` then without --dry-run to repair DB URLs.");
  }

  if (args.backfill) {
    const { spawn } = await import("node:child_process");
    const backfillArgs = ["tsx", "scripts/backfill-video-playback.ts"];
    if (args.dryRun) backfillArgs.push("--dry-run");
    if (args.limit) backfillArgs.push(`--limit=${args.limit}`);
    if (args.resume) backfillArgs.push("--resume");
    await new Promise<void>((resolve, reject) => {
      const child = spawn("npx", backfillArgs, { stdio: "inherit", cwd: PROJECT_ROOT });
      child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`backfill exit ${code}`))));
    });
  }
}

main()
  .catch((error) => {
    console.error("[media:audit] failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
