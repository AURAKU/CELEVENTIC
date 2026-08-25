#!/usr/bin/env node
/**
 * Bake the Git commit into the Next.js build so /api/health reports the SHA
 * that produced `.next`, not a stale PM2 / .env value from an older deploy.
 *
 * Writes ONLY gitignored / build-output paths — never mutates tracked source
 * (avoids "Tracked working tree is dirty" after production builds).
 *
 * Usage:
 *   CELEVENTIC_BUILD_COMMIT=$(git rev-parse HEAD) node scripts/write-build-meta.mjs
 *   node scripts/write-build-meta.mjs --emit-next   # after `next build`
 */
import { execSync } from "node:child_process";
import { writeFileSync, existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function sanitizeCommit(value) {
  if (!value || typeof value !== "string") return null;
  const hex = value.trim().toLowerCase().match(/^[0-9a-f]{7,40}$/);
  return hex ? hex[0] : null;
}

function resolveCommit() {
  const fromEnv =
    sanitizeCommit(process.env.CELEVENTIC_BUILD_COMMIT) ||
    sanitizeCommit(process.env.CELEVENTIC_COMMIT_SHA) ||
    sanitizeCommit(process.env.CELEVENTIC_GIT_COMMIT) ||
    sanitizeCommit(process.env.GIT_COMMIT_SHA) ||
    sanitizeCommit(process.env.SOURCE_COMMIT) ||
    sanitizeCommit(process.env.VERCEL_GIT_COMMIT_SHA);

  if (fromEnv) return fromEnv.length >= 40 ? fromEnv.slice(0, 40) : fromEnv;

  try {
    const sha = execSync("git rev-parse HEAD", {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return sanitizeCommit(sha);
  } catch {
    return null;
  }
}

function resolveBuiltAt() {
  return (
    process.env.CELEVENTIC_BUILD_BUILT_AT?.trim() ||
    new Date().toISOString()
  );
}

const commit = resolveCommit();
const shortCommit = commit ? commit.slice(0, 12) : null;
const builtAt = resolveBuiltAt();
const source = process.env.CELEVENTIC_BUILD_COMMIT
  ? "CELEVENTIC_BUILD_COMMIT"
  : commit
    ? "git-rev-parse"
    : "unset";

const meta = {
  commit,
  shortCommit,
  builtAt,
  source,
};

// Repo-root JSON is gitignored (.celeventic-build-meta.json).
const outJson = join(root, ".celeventic-build-meta.json");
writeFileSync(outJson, `${JSON.stringify(meta, null, 2)}\n`, "utf8");

const emitNext = process.argv.includes("--emit-next");
if (emitNext) {
  const distDir = process.env.NEXT_DIST_DIR || ".next";
  const nextDir = join(root, distDir);
  if (!existsSync(nextDir)) {
    console.warn(`[write-build-meta] ${distDir} missing — skip --emit-next`);
  } else {
    writeFileSync(
      join(nextDir, "celeventic-build-meta.json"),
      `${JSON.stringify(meta, null, 2)}\n`,
      "utf8"
    );
    try {
      const buildId = readFileSync(join(nextDir, "BUILD_ID"), "utf8").trim();
      meta.buildId = buildId;
      writeFileSync(
        join(nextDir, "celeventic-build-meta.json"),
        `${JSON.stringify(meta, null, 2)}\n`,
        "utf8"
      );
    } catch {
      /* BUILD_ID may arrive slightly later; meta without it is still useful */
    }
  }
}

console.log(
  `[write-build-meta] commit=${shortCommit ?? "null"} builtAt=${builtAt} source=${source}`
);
