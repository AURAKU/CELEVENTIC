import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Identity of the running build, for answering one question after a deploy:
 * *is the code I just shipped actually the code that is serving guests?*
 *
 * Live invitation parity bugs were repeatedly misdiagnosed because there was no
 * way to tell a stale process from a bad commit. A guest reported a blank
 * invitation, the fix was deployed, the guest still saw it — and nobody could
 * prove whether the running server had the fix, had a warm `.next` cache, or
 * had never restarted at all.
 *
 * Deliberately narrow: a short commit and the build id, nothing else. This
 * endpoint is public, so it must never become a way to enumerate the
 * environment. No env dumps, no paths, no versions of internal packages.
 */

/** Only ever expose a short hex prefix, never a raw env value. */
function sanitizeCommit(value: string | undefined): string | null {
  if (!value) return null;
  const hex = value.trim().toLowerCase().match(/^[0-9a-f]{7,40}$/);
  return hex ? hex[0].slice(0, 12) : null;
}

function resolveCommit(): string | null {
  // Ordered by specificity: our own deploy script first, then common CI vars.
  return (
    sanitizeCommit(process.env.CELEVENTIC_COMMIT_SHA) ??
    sanitizeCommit(process.env.GIT_COMMIT_SHA) ??
    sanitizeCommit(process.env.SOURCE_COMMIT) ??
    sanitizeCommit(process.env.VERCEL_GIT_COMMIT_SHA) ??
    null
  );
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
    const raw = readFileSync(join(process.cwd(), ".next", "BUILD_ID"), "utf8").trim();
    // Guard against a truncated or unexpected file becoming response payload.
    if (/^[\w-]{1,64}$/.test(raw)) cachedBuildId = raw;
  } catch {
    // Dev server, or a standalone layout without the file. Not an error.
  }
  return cachedBuildId;
}

/** Process boot time — reveals whether a deploy actually restarted the server. */
const startedAt = new Date().toISOString();

export interface BuildFingerprint {
  commit: string | null;
  buildId: string | null;
  startedAt: string;
  env: string;
}

export function getBuildFingerprint(): BuildFingerprint {
  return {
    commit: resolveCommit(),
    buildId: resolveBuildId(),
    startedAt,
    env: process.env.NODE_ENV ?? "unknown",
  };
}
