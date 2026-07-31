/**
 * Idempotent media audit — finds broken/legacy local media URLs and reports (or repairs via
 * the existing video backfill + URL normalisation).
 *
 * Usage:
 *   npm run media:audit -- --dry-run
 *   npm run media:audit -- --limit=50
 *   npm run media:audit -- --event-id=<eventId>
 *   npm run media:backfill -- --dry-run
 *   npm run media:backfill -- --limit=20
 *   npm run media:backfill -- --resume
 *   npm run media:backfill -- --only-failed
 */
import { createWriteStream } from "node:fs";
import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { getUploadRoot } from "../src/lib/uploads/file-storage";
import { resolvePublicMediaUrl } from "../src/lib/uploads/media-url";
import { probeVideoFile, isAlreadyBrowserCompatible } from "../src/lib/video/video-processor";

const prisma = new PrismaClient();
const PROJECT_ROOT = path.join(__dirname, "..");
const STATE_DIR = path.join(PROJECT_ROOT, "var", "media-audit");

type Finding = {
  kind:
    | "missing_file"
    | "zero_byte"
    | "legacy_api_url"
    | "localhost_url"
    | "mov_needs_mp4"
    | "hevc_needs_transcode"
    | "incompatible_mp4"
    | "ok";
  relativePath?: string;
  url?: string;
  detail?: string;
};

function parseArgs(argv: string[]) {
  const flags = new Set(argv.filter((a) => a.startsWith("--") && !a.includes("=")));
  const opts: Record<string, string> = {};
  for (const arg of argv) {
    const m = arg.match(/^--([^=]+)=(.*)$/);
    if (m) opts[m[1]] = m[2];
  }
  return {
    dryRun: flags.has("--dry-run") || process.env.MEDIA_AUDIT_DRY_RUN === "1",
    limit: opts.limit ? parseInt(opts.limit, 10) : undefined,
    eventId: opts["event-id"],
    onlyFailed: flags.has("--only-failed"),
    resume: flags.has("--resume"),
    backfill: flags.has("--backfill") || argv.includes("backfill"),
  };
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
      if (entry.name === "processed" || entry.name === "raw") {
        // still walk — processed outputs matter for audit
      }
      yield* walkFiles(full);
    } else if (entry.isFile()) {
      yield full;
    }
  }
}

function toRelative(full: string, root: string): string {
  return path.relative(root, full).split(path.sep).join("/");
}

async function auditDisk(root: string, limit?: number): Promise<Finding[]> {
  const findings: Finding[] = [];
  let count = 0;
  for await (const full of walkFiles(root)) {
    if (limit && count >= limit) break;
    const relativePath = toRelative(full, root);
    if (relativePath.includes(".gitkeep")) continue;
    count += 1;
    const st = await stat(full);
    if (st.size <= 0) {
      findings.push({ kind: "zero_byte", relativePath, detail: "zero-byte file" });
      continue;
    }
    const lower = relativePath.toLowerCase();
    if (/\.(mov|qt)$/.test(lower)) {
      findings.push({ kind: "mov_needs_mp4", relativePath, detail: "MOV source — needs browser MP4" });
      continue;
    }
    if (/\.(mp4|m4v)$/.test(lower) && !relativePath.includes("/processed/")) {
      try {
        const probe = await probeVideoFile(full);
        if (probe.isHevc) {
          findings.push({ kind: "hevc_needs_transcode", relativePath, detail: "HEVC codec" });
        } else if (!isAlreadyBrowserCompatible(probe)) {
          findings.push({ kind: "incompatible_mp4", relativePath, detail: "MP4 needs remux/transcode" });
        } else {
          findings.push({ kind: "ok", relativePath });
        }
      } catch (error) {
        findings.push({
          kind: "incompatible_mp4",
          relativePath,
          detail: error instanceof Error ? error.message : "probe failed",
        });
      }
    } else {
      findings.push({ kind: "ok", relativePath });
    }
  }
  return findings;
}

async function auditDbUrls(eventId?: string): Promise<Finding[]> {
  const findings: Finding[] = [];
  const media = await prisma.invitationMedia.findMany({
    where: eventId ? { invitation: { eventId } } : undefined,
    select: { id: true, url: true },
    take: 5000,
  });
  for (const row of media) {
    const url = row.url ?? "";
    if (/localhost|127\.0\.0\.1/i.test(url)) {
      findings.push({ kind: "localhost_url", url, detail: `invitationMedia:${row.id}` });
    } else if (url.includes("/api/uploads/")) {
      findings.push({
        kind: "legacy_api_url",
        url,
        detail: `normalises to ${resolvePublicMediaUrl(url)}`,
      });
    }
  }

  const gallery = await prisma.invitationGalleryItem.findMany({
    where: eventId ? { invitation: { eventId } } : undefined,
    select: { id: true, url: true },
    take: 5000,
  });
  for (const row of gallery) {
    const url = row.url ?? "";
    if (/localhost|127\.0\.0\.1/i.test(url)) {
      findings.push({ kind: "localhost_url", url, detail: `gallery:${row.id}` });
    } else if (url.includes("/api/uploads/")) {
      findings.push({
        kind: "legacy_api_url",
        url,
        detail: `normalises to ${resolvePublicMediaUrl(url)}`,
      });
    }
  }

  const memories = await prisma.eventMemoryUpload.findMany({
    where: eventId ? { eventId } : undefined,
    select: { id: true, mediaUrl: true },
    take: 5000,
  });
  for (const row of memories) {
    const url = row.mediaUrl ?? "";
    if (/localhost|127\.0\.0\.1/i.test(url)) {
      findings.push({ kind: "localhost_url", url, detail: `memory:${row.id}` });
    } else if (url.includes("/api/uploads/")) {
      findings.push({
        kind: "legacy_api_url",
        url,
        detail: `normalises to ${resolvePublicMediaUrl(url)}`,
      });
    }
  }

  return findings;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  await mkdir(STATE_DIR, { recursive: true });
  const runId = new Date().toISOString().replace(/[:.]/g, "-");
  const reportPath = path.join(STATE_DIR, `audit-${runId}.jsonl`);

  console.log(`[media:audit] root=${getUploadRoot()} dryRun=${args.dryRun} limit=${args.limit ?? "∞"}`);

  const diskFindings = await auditDisk(getUploadRoot(), args.limit);
  const dbFindings = await auditDbUrls(args.eventId);
  const findings = [...diskFindings, ...dbFindings];

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
  await writeFile(summaryPath, JSON.stringify({ runId, summary, args }, null, 2));

  console.log("[media:audit] summary", summary);
  console.log(`[media:audit] report ${reportPath}`);

  const needsBackfill =
    (summary.mov_needs_mp4 ?? 0) +
      (summary.hevc_needs_transcode ?? 0) +
      (summary.incompatible_mp4 ?? 0) >
    0;

  if (args.backfill || (!args.dryRun && needsBackfill && process.argv.includes("media:backfill"))) {
    console.log("[media:audit] launching video backfill for incompatible sources…");
    const { spawn } = await import("node:child_process");
    const backfillArgs = ["tsx", "scripts/backfill-video-playback.ts"];
    if (args.dryRun) backfillArgs.push("--dry-run");
    if (args.limit) backfillArgs.push(`--limit=${args.limit}`);
    if (args.resume) backfillArgs.push("--resume");
    await new Promise<void>((resolve, reject) => {
      const child = spawn("npx", backfillArgs, { stdio: "inherit", cwd: PROJECT_ROOT });
      child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`backfill exit ${code}`))));
    });
  } else if (needsBackfill) {
    console.log("[media:audit] run `npm run media:backfill` to convert incompatible videos.");
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
