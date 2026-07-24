import { randomUUID } from "crypto";
import type { VideoCategory } from "@/lib/video/constants";
import { RAW_VIDEO_KEY_PREFIX, PROCESSED_VIDEO_KEY_PREFIX } from "@/lib/video/constants";

/**
 * Server-only S3 key generation. Callers NEVER supply a key or bucket —
 * this is the single choke point that prevents path traversal / key injection.
 */
export function buildRawVideoKey(category: VideoCategory, ownerId: string, extension: string): { key: string; id: string } {
  const id = randomUUID();
  const safeOwner = sanitizeSegment(ownerId);
  const safeExt = sanitizeSegment(extension).toLowerCase();
  const key = `${RAW_VIDEO_KEY_PREFIX}/${category.toLowerCase()}/${safeOwner}/${id}.${safeExt}`;
  return { key, id };
}

export function buildProcessedPrefix(category: VideoCategory, assetId: string): string {
  return `${PROCESSED_VIDEO_KEY_PREFIX}/${category.toLowerCase()}/${sanitizeSegment(assetId)}`;
}

/** Strip anything that isn't a safe path segment character — no `..`, `/`, or control chars. */
function sanitizeSegment(input: string): string {
  const cleaned = input.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
  return cleaned || "unknown";
}

/** Sanitize a user-supplied filename for storage/logging only (never used to build the S3 key). */
export function sanitizeDisplayFilename(filename: string): string {
  const base = filename.split(/[/\\]/).pop() ?? "video";
  const trimmed = base.trim().slice(0, 180);
  // eslint-disable-next-line no-control-regex
  return trimmed.replace(/[\x00-\x1f\x7f]/g, "") || "video";
}
