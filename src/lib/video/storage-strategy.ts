/**
 * Single source of truth for "should this video upload go direct-to-S3, or fall back to
 * local disk + VPS FFmpeg?" Pure/testable — no env reads, no I/O — so callers (API routes)
 * pass in the already-read env values and this just makes the decision.
 *
 * Design intent: a missing/incomplete S3 configuration is an environment gap, NOT a reason
 * to dead-end a legitimate upload. Production (Hostinger VPS) may run indefinitely without
 * S3 — `VIDEO_PROCESSOR=ffmpeg` + local disk is a fully supported, permanent deployment mode,
 * not just a dev fallback. The only way to get the old hard-block behavior back is the
 * explicit opt-out `VIDEO_LOCAL_FALLBACK_ENABLED=false`.
 */

export type VideoStorageStrategy = "s3" | "local";

export interface VideoStorageDecision {
  strategy: VideoStorageStrategy;
  /** True only when an operator explicitly disabled the local fallback and S3 isn't usable. */
  blocked: boolean;
}

const DEFAULT_PROVIDER = "s3";

/** `MEDIA_STORAGE_PROVIDER` — trimmed/lowercased; unset/blank defaults to "s3" (the historical default). */
export function normalizeProvider(raw: string | undefined | null): string {
  const trimmed = (raw ?? "").trim().toLowerCase();
  return trimmed || DEFAULT_PROVIDER;
}

/** `VIDEO_LOCAL_FALLBACK_ENABLED` — defaults to enabled; only the literal string "false" disables it. */
export function isLocalFallbackEnabled(raw: string | undefined | null): boolean {
  return (raw ?? "true").trim().toLowerCase() !== "false";
}

export interface ResolveVideoStorageStrategyInput {
  /** Raw `process.env.MEDIA_STORAGE_PROVIDER` value. */
  providerEnv: string | undefined | null;
  /** Whether S3 credentials are actually present and a client could be built right now. */
  s3Ready: boolean;
  /** Raw `process.env.VIDEO_LOCAL_FALLBACK_ENABLED` value. */
  localFallbackEnabledEnv: string | undefined | null;
}

export function resolveVideoStorageStrategy(input: ResolveVideoStorageStrategyInput): VideoStorageDecision {
  const provider = normalizeProvider(input.providerEnv);
  const wantsS3 = provider === "s3";
  const s3Usable = wantsS3 && input.s3Ready;

  if (s3Usable) return { strategy: "s3", blocked: false };

  if (isLocalFallbackEnabled(input.localFallbackEnabledEnv)) {
    return { strategy: "local", blocked: false };
  }

  return { strategy: "local", blocked: true };
}
