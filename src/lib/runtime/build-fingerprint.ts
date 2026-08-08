import { readFileSync } from "node:fs";
import { join } from "node:path";
import { EMBEDDED_BUILD_META } from "@/lib/runtime/build-meta.generated";

/**
 * Identity of the running build, for answering one question after a deploy:
 * *is the code I just shipped actually the code that is serving guests?*
 *
 * Commit must come from the **build** that produced `.next`, not from a stale
 * PM2 / `.env` value. Live used to report an old SHA (e.g. 0fa4bd4…) after a
 * successful deploy of a newer main tip because `CELEVENTIC_COMMIT_SHA` in the
 * process environment outlived the build. Prefer the module written by
 * `scripts/write-build-meta.mjs` at `prebuild` time — it is compiled into the
 * server bundle and cannot drift on `pm2 restart`.
 */

function sanitizeCommit(value: string | undefined | null): string | null {
  if (!value) return null;
  const hex = value.trim().toLowerCase().match(/^[0-9a-f]{7,40}$/);
  return hex ? hex[0] : null;
}

function shortSha(value: string | null): string | null {
  return value ? value.slice(0, 12) : null;
}

function resolveCommitFromEnv(): string | null {
  return (
    sanitizeCommit(process.env.CELEVENTIC_BUILD_COMMIT) ??
    sanitizeCommit(process.env.CELEVENTIC_COMMIT_SHA) ??
    sanitizeCommit(process.env.CELEVENTIC_GIT_COMMIT || process.env.GIT_COMMIT_SHA) ??
    sanitizeCommit(process.env.SOURCE_COMMIT) ??
    sanitizeCommit(process.env.VERCEL_GIT_COMMIT_SHA) ??
    null
  );
}

/**
 * Prefer embedded build meta (immutable), then `.next/celeventic-build-meta.json`,
 * then process env (legacy / CI). Env is last so a stale PM2 value cannot win.
 */
function resolveCommit(): string | null {
  const embedded = sanitizeCommit(EMBEDDED_BUILD_META.commit);
  if (embedded) return embedded.length >= 40 ? embedded.slice(0, 40) : embedded;

  try {
    const distDir = process.env.NEXT_DIST_DIR || ".next";
    const raw = readFileSync(join(process.cwd(), distDir, "celeventic-build-meta.json"), "utf8");
    const parsed = JSON.parse(raw) as { commit?: string };
    const fromDisk = sanitizeCommit(parsed.commit);
    if (fromDisk) return fromDisk.length >= 40 ? fromDisk.slice(0, 40) : fromDisk;
  } catch {
    /* missing in older builds */
  }

  const fromEnv = resolveCommitFromEnv();
  if (fromEnv) return fromEnv.length >= 40 ? fromEnv.slice(0, 40) : fromEnv;
  return null;
}

function resolveBuiltAt(): string | null {
  if (EMBEDDED_BUILD_META.builtAt) return EMBEDDED_BUILD_META.builtAt;
  try {
    const distDir = process.env.NEXT_DIST_DIR || ".next";
    const raw = readFileSync(join(process.cwd(), distDir, "celeventic-build-meta.json"), "utf8");
    const parsed = JSON.parse(raw) as { builtAt?: string };
    if (typeof parsed.builtAt === "string" && parsed.builtAt) return parsed.builtAt;
  } catch {
    /* ignore */
  }
  return process.env.CELEVENTIC_BUILD_BUILT_AT?.trim() || null;
}

let cachedBuildId: string | null | undefined;

/**
 * Next writes `.next/BUILD_ID` at build time and it changes on every build, so
 * it distinguishes two deploys of the same commit. Read from disk rather than
 * via `generateBuildId`, because overriding that config would change asset
 * URLs and cache behaviour — too invasive for a diagnostic.
 */
function resolveBuildId(): string | null {
  if (cachedBuildId !== undefined) return cachedBuildId;
  cachedBuildId = null;
  try {
    const distDir = process.env.NEXT_DIST_DIR || ".next";
    const raw = readFileSync(join(process.cwd(), distDir, "BUILD_ID"), "utf8").trim();
    if (/^[\w-]{1,64}$/.test(raw)) cachedBuildId = raw;
  } catch {
    // Dev server, or a standalone layout without the file. Not an error.
  }
  return cachedBuildId;
}

/** Process boot time — reveals whether a deploy actually restarted the server. */
const startedAt = new Date().toISOString();

export interface BuildFingerprint {
  /** Full (or longest known) Git SHA used to create this build. */
  commit: string | null;
  /** First 12 hex chars of `commit`. */
  shortCommit: string | null;
  buildId: string | null;
  /** ISO timestamp when the production build metadata was written. */
  builtAt: string | null;
  /** ISO timestamp when this Node process started. */
  startedAt: string;
  /** `NODE_ENV` (alias also exposed as `env` for older probes). */
  environment: string;
  /** @deprecated Prefer `environment`. Kept for existing smoke scripts. */
  env: string;
}

export function getBuildFingerprint(): BuildFingerprint {
  const commit = resolveCommit();
  const environment = process.env.NODE_ENV ?? "unknown";
  return {
    commit,
    shortCommit: shortSha(commit) ?? sanitizeCommit(EMBEDDED_BUILD_META.shortCommit)?.slice(0, 12) ?? null,
    buildId: resolveBuildId(),
    builtAt: resolveBuiltAt(),
    startedAt,
    environment,
    env: environment,
  };
}

/** True when `reported` matches `expected` as full or short SHA. */
export function commitsMatch(expected: string, reported: string | null | undefined): boolean {
  const a = sanitizeCommit(expected);
  const b = sanitizeCommit(reported);
  if (!a || !b) return false;
  if (a === b) return true;
  return a.slice(0, 12) === b.slice(0, 12) || a.startsWith(b) || b.startsWith(a);
}
