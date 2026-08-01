/**
 * Pure helpers for media audit classification and durable source→playback mapping.
 * No filesystem/ffmpeg/Prisma — unit-testable in CI.
 */

import path from "node:path";
import {
  isBackfillCandidatePath,
  parseInvitationUploadPath,
  toPosixRelative,
  type BackfillManifest,
  type BackfillManifestEntry,
} from "@/lib/video/backfill-utils";
import { resolvePublicMediaUrl } from "@/lib/uploads/media-url";

export type MediaAuditKind =
  | "ready_original_compatible"
  | "source_converted"
  | "source_needs_conversion"
  | "processed_ready"
  | "orphaned_source"
  | "legacy_api_url"
  | "localhost_url"
  | "missing_processed_output"
  | "failed_processing"
  | "ok_non_video";

export interface SourcePlaybackMapEntry {
  sourceRelativePath: string;
  playbackRelativePath: string;
  playbackUrl?: string;
  posterRelativePath?: string;
  thumbnailRelativePath?: string;
  status: "DONE" | "SKIPPED_COMPATIBLE" | "FAILED";
  sourceSizeBytes?: number;
  sourceMtimeMs?: number;
  verifiedAt?: string;
  method?: string;
}

export interface SourcePlaybackMap {
  version: 1;
  updatedAt: string;
  entries: Record<string, SourcePlaybackMapEntry>;
}

export function createEmptySourcePlaybackMap(): SourcePlaybackMap {
  return { version: 1, updatedAt: new Date().toISOString(), entries: {} };
}

/** Build durable map from backfill manifest (source relative path → playback). */
export function sourcePlaybackMapFromManifest(manifest: BackfillManifest): SourcePlaybackMap {
  const map = createEmptySourcePlaybackMap();
  for (const [sourceRelativePath, entry] of Object.entries(manifest.entries)) {
    const normalized = toPosixRelative(sourceRelativePath);
    if (!entry.playbackRelativePath && entry.status !== "SKIPPED_COMPATIBLE" && entry.status !== "FAILED") {
      continue;
    }
    map.entries[normalized] = {
      sourceRelativePath: normalized,
      playbackRelativePath: entry.playbackRelativePath
        ? toPosixRelative(entry.playbackRelativePath)
        : "",
      playbackUrl: entry.playbackUrl,
      posterRelativePath: entry.posterRelativePath,
      thumbnailRelativePath: entry.thumbnailRelativePath,
      status:
        entry.status === "FAILED"
          ? "FAILED"
          : entry.status === "SKIPPED_COMPATIBLE"
            ? "SKIPPED_COMPATIBLE"
            : "DONE",
      sourceSizeBytes: entry.sourceSizeBytes,
      sourceMtimeMs: entry.sourceMtimeMs,
      verifiedAt: entry.processedAt,
      method: entry.method,
    };
  }
  map.updatedAt = new Date().toISOString();
  return map;
}

export function mergeSourcePlaybackMaps(
  primary: SourcePlaybackMap,
  secondary: SourcePlaybackMap
): SourcePlaybackMap {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    entries: { ...secondary.entries, ...primary.entries },
  };
}

export function lookupPlaybackForSource(
  map: SourcePlaybackMap | null | undefined,
  sourceRelativePath: string
): SourcePlaybackMapEntry | null {
  if (!map) return null;
  return map.entries[toPosixRelative(sourceRelativePath)] ?? null;
}

export function isProcessedPlaybackPath(relativePath: string): boolean {
  const normalized = toPosixRelative(relativePath).toLowerCase();
  return (
    normalized.includes("/processed/") &&
    (normalized.endsWith("-playback.mp4") || normalized.endsWith(".mp4"))
  );
}

export function isVideoSourceExtension(relativePath: string): boolean {
  return /\.(mov|qt|mp4|m4v|webm|mkv)$/i.test(relativePath);
}

export interface ClassifySourceInput {
  relativePath: string;
  /** True when file is under processed/ and named like our playback output. */
  isProcessedOutput: boolean;
  /** Probe result for this file (optional for non-probed paths). */
  browserCompatible?: boolean | null;
  probeFailed?: boolean;
  /** Manifest/map entry for this source path. */
  mapEntry?: SourcePlaybackMapEntry | null;
  /** Absolute/relative existence of mapped playback file. */
  playbackExists?: boolean;
  /** Mapped playback passes ffprobe as browser-compatible H.264. */
  playbackCompatible?: boolean | null;
  /** Source file still on disk (false ⇒ orphaned mapping only). */
  sourceExists?: boolean;
}

/**
 * Classify one on-disk media file for audit summaries.
 *
 * A MOV / incompatible MP4 must NOT be `source_needs_conversion` when a valid
 * processed playback exists and is mapped (or verified compatible).
 */
export function classifyMediaFile(input: ClassifySourceInput): MediaAuditKind {
  const relativePath = toPosixRelative(input.relativePath);

  if (input.isProcessedOutput) {
    if (input.probeFailed) return "failed_processing";
    if (input.browserCompatible === false) return "failed_processing";
    return "processed_ready";
  }

  if (!isVideoSourceExtension(relativePath)) {
    return "ok_non_video";
  }

  // Candidate raw sources under invitations/ (or other upload roots).
  const mapEntry = input.mapEntry;
  const hasValidPlayback =
    Boolean(mapEntry?.playbackRelativePath) &&
    input.playbackExists === true &&
    input.playbackCompatible !== false &&
    mapEntry?.status !== "FAILED";

  if (mapEntry?.status === "FAILED") {
    return "failed_processing";
  }

  if (hasValidPlayback) {
    return "source_converted";
  }

  // Mapped playback exists but fails browser-compatible probe.
  if (
    mapEntry?.status === "DONE" &&
    mapEntry.playbackRelativePath &&
    input.playbackExists === true &&
    input.playbackCompatible === false
  ) {
    return "failed_processing";
  }

  // Original was already browser-compatible; backfill recorded SKIPPED_COMPATIBLE.
  if (mapEntry?.status === "SKIPPED_COMPATIBLE" || input.browserCompatible === true) {
    return "ready_original_compatible";
  }

  if (mapEntry?.playbackRelativePath && input.playbackExists === false) {
    return "missing_processed_output";
  }

  if (input.sourceExists === false && mapEntry) {
    return "orphaned_source";
  }

  // MOV / incompatible MP4 / probe failure without a verified playback.
  return "source_needs_conversion";
}

/** True when a stored DB URL should be rewritten to `/uploads/...`. */
export function isLegacyLocalUploadUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (/^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|::1)(:\d+)?\//i.test(trimmed)) {
    return true;
  }
  if (trimmed.includes("/api/uploads/")) return true;
  if (/\/public\/uploads\//i.test(trimmed)) return true;
  if (/^public\/uploads\//i.test(trimmed)) return true;
  return false;
}

export function isLocalhostMediaUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return /localhost|127\.0\.0\.1|0\.0\.0\.0|::1/i.test(url);
}

/**
 * Extract the upload-relative path from a stored media URL when it points at local uploads.
 * Returns null for external CDN URLs that should be preserved.
 */
export function uploadRelativePathFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const normalized = normalizeStoredMediaUrl(url);
  if (!normalized.startsWith("/uploads/")) return null;
  const without = normalized.slice("/uploads/".length);
  const q = without.search(/[?#]/);
  return toPosixRelative(q >= 0 ? without.slice(0, q) : without);
}

/**
 * Normalise a DB-stored media URL to the canonical public `/uploads/...` form.
 * When a source→playback map is provided and the URL still points at a converted
 * source, rewrite to the mapped playback URL.
 * Preserves external CDN/S3 URLs that are not local upload paths.
 */
export function normalizeStoredMediaUrl(
  url: string | null | undefined,
  sourceMap?: SourcePlaybackMap | null
): string {
  if (!url) return "";
  const trimmed = url.trim();
  if (!trimmed) return "";

  // External absolute URLs that are not localhost — preserve as-is (CDN/S3).
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      const host = parsed.hostname.toLowerCase();
      const isLocal = host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0" || host === "::1";
      const isUploadPath =
        parsed.pathname.startsWith("/uploads/") ||
        parsed.pathname.startsWith("/api/uploads/") ||
        /\/public\/uploads\//i.test(parsed.pathname);
      if (!isLocal && !isUploadPath) return trimmed;
    } catch {
      /* fall through */
    }
  }

  let value = trimmed;
  value = value.replace(/\\/g, "/");
  value = value.replace(/\/public\/uploads\//gi, "/uploads/");
  value = value.replace(/^public\/uploads\//i, "/uploads/");
  const resolved = resolvePublicMediaUrl(value);

  if (sourceMap) {
    const relative = (() => {
      if (!resolved.startsWith("/uploads/")) return null;
      const without = resolved.slice("/uploads/".length);
      const q = without.search(/[?#]/);
      return toPosixRelative(q >= 0 ? without.slice(0, q) : without);
    })();
    if (relative) {
      const mapped = lookupPlaybackForSource(sourceMap, relative);
      if (
        mapped &&
        mapped.status === "DONE" &&
        mapped.playbackRelativePath &&
        mapped.playbackRelativePath !== relative
      ) {
        return mapped.playbackUrl || `/uploads/${mapped.playbackRelativePath}`;
      }
    }
  }

  return resolved;
}

export function shouldUpdateStoredMediaUrl(
  url: string | null | undefined,
  sourceMap?: SourcePlaybackMap | null
): boolean {
  if (!url) return false;
  const normalized = normalizeStoredMediaUrl(url, sourceMap);
  return Boolean(normalized) && normalized !== url.trim();
}

export function stemFromFileName(fileName: string): string {
  const base = path.posix.basename(fileName);
  const dot = base.lastIndexOf(".");
  return dot > 0 ? base.slice(0, dot) : base;
}

/** Derive a stable source key used when matching without a manifest (best-effort). */
export function sourceKeyFromRelativePath(relativePath: string): string {
  const info = parseInvitationUploadPath(relativePath);
  if (!info) return toPosixRelative(relativePath);
  return `${info.userId}/${stemFromFileName(info.fileName)}`;
}

export function isInvitationVideoCandidate(relativePath: string): boolean {
  return isBackfillCandidatePath(relativePath);
}

export function manifestEntryToMapEntry(
  sourceRelativePath: string,
  entry: BackfillManifestEntry
): SourcePlaybackMapEntry {
  return {
    sourceRelativePath: toPosixRelative(sourceRelativePath),
    playbackRelativePath: entry.playbackRelativePath
      ? toPosixRelative(entry.playbackRelativePath)
      : "",
    playbackUrl: entry.playbackUrl,
    posterRelativePath: entry.posterRelativePath,
    thumbnailRelativePath: entry.thumbnailRelativePath,
    status:
      entry.status === "FAILED"
        ? "FAILED"
        : entry.status === "SKIPPED_COMPATIBLE"
          ? "SKIPPED_COMPATIBLE"
          : "DONE",
    sourceSizeBytes: entry.sourceSizeBytes,
    sourceMtimeMs: entry.sourceMtimeMs,
    verifiedAt: entry.processedAt,
    method: entry.method,
  };
}
