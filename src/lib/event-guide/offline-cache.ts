/**
 * Level 1 offline cache contract.
 *
 * The cache name carries both the public token and the publication version, so
 * two events can never share a cache and a republished guide can never serve
 * yesterday's programme. `public/event-guide-sw.js` implements exactly these
 * rules; this module is the shared, testable definition of them.
 */

export const GUIDE_CACHE_PREFIX = "event-guide";
export const GUIDE_CACHE_SCHEMA = "v1";
export const GUIDE_SW_PATH = "/event-guide-sw.js";
export const GUIDE_SW_SCOPE = "/event-guide/";

export function guideCacheName(publicToken: string, publishedVersion: number): string {
  return `${GUIDE_CACHE_PREFIX}:${GUIDE_CACHE_SCHEMA}:${publicToken}:${publishedVersion}`;
}

export function isGuideCacheName(name: string): boolean {
  return name.startsWith(`${GUIDE_CACHE_PREFIX}:`);
}

export function parseGuideCacheName(
  name: string
): { schema: string; token: string; version: number } | null {
  const parts = name.split(":");
  if (parts.length !== 4 || parts[0] !== GUIDE_CACHE_PREFIX) return null;
  const version = Number(parts[3]);
  if (!Number.isFinite(version)) return null;
  return { schema: parts[1]!, token: parts[2]!, version };
}

/**
 * Which caches to delete when `keep` becomes the live cache.
 *
 * Drops every other guide cache: older versions of this token, caches from a
 * previous schema, and any cache belonging to a different event. Non-guide
 * caches owned by the rest of the app are never touched.
 */
export function cachesToEvict(existing: string[], keep: string): string[] {
  return existing.filter((name) => isGuideCacheName(name) && name !== keep);
}

/** Every cache for one token — used when a guide is revoked or unpublished. */
export function cachesForToken(existing: string[], publicToken: string): string[] {
  return existing.filter((name) => parseGuideCacheName(name)?.token === publicToken);
}

export function guidePayloadUrl(publicToken: string): string {
  return `/api/public/event-guide/${encodeURIComponent(publicToken)}`;
}

export function guidePageUrl(publicToken: string): string {
  return `/event-guide/${encodeURIComponent(publicToken)}`;
}

/** IndexedDB names — mirrors the admission offline store's conventions. */
export const GUIDE_DB_NAME = "celeventic-event-guide";
export const GUIDE_DB_VERSION = 1;
export const GUIDE_PAYLOAD_STORE = "payloads";

export interface StoredGuidePayload {
  /** Primary key. */
  publicToken: string;
  version: number;
  /** ISO timestamp of the last successful online fetch. */
  syncedAt: string;
  payload: unknown;
}

export function formatLastSync(syncedAt: string | null, now: Date = new Date()): string {
  if (!syncedAt) return "not yet synced";
  const then = new Date(syncedAt);
  if (Number.isNaN(then.getTime())) return "not yet synced";

  const seconds = Math.max(0, Math.round((now.getTime() - then.getTime()) / 1000));
  if (seconds < 60) return "moments ago";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

/** Guard so a broken deploy can never put the guide into a reload loop. */
export const CHUNK_RECOVERY_FLAG = "celeventic-guide-chunk-recovery";

export function isChunkLoadError(error: unknown): boolean {
  if (!error) return false;
  const name = (error as { name?: unknown }).name;
  if (name === "ChunkLoadError") return true;
  const message = (error as { message?: unknown }).message;
  if (typeof message !== "string") return false;
  return (
    message.includes("ChunkLoadError") ||
    message.includes("Loading chunk") ||
    message.includes("Failed to fetch dynamically imported module") ||
    message.includes("error loading dynamically imported module")
  );
}
