/**
 * Pure, testable helpers for the invitation-video backfill CLI
 * (`scripts/backfill-video-playback.ts`). No filesystem/ffmpeg/Prisma access happens in this
 * module — that keeps it unit-testable the same way as the rest of `src/lib/video/__tests__`
 * (no ffmpeg/DB required in CI), and lets the CLI stay a thin orchestration layer around
 * logic that's easy to reason about and verify in isolation.
 */

import path from "node:path";
import { ALLOWED_VIDEO_EXTENSIONS } from "@/lib/video/constants";

const VIDEO_EXT_SET = new Set<string>(ALLOWED_VIDEO_EXTENSIONS);

/** Directories that hold files our own pipeline generated — never re-scanned as raw candidates. */
const OWNED_SEGMENTS = new Set(["processed", "originals"]);

/** Filename fragments our own pipeline writes — defence-in-depth even if a file is ever moved. */
const OWNED_SUFFIXES = ["-playback.mp4", "-poster.jpg", "-thumbnail.jpg", "-original"];

export interface InvitationUploadPathInfo {
  /** POSIX-style relative path, e.g. "invitations/<userId>/clip.mov" (relative to the upload root). */
  relativePath: string;
  userId: string;
  fileName: string;
  /** Lowercased extension without the leading dot, e.g. "mov". */
  extension: string;
}

/** Normalizes any OS path-separator style to POSIX for stable comparisons/manifests. */
export function toPosixRelative(relativePath: string): string {
  return relativePath.split(path.sep).join("/").replace(/^\/+/, "");
}

/** Parses the `invitations/<userId>/...` structure produced by `storeUploadFile("invitations", userId, ...)`. */
export function parseInvitationUploadPath(relativePath: string): InvitationUploadPathInfo | null {
  const normalized = toPosixRelative(relativePath);
  const parts = normalized.split("/").filter(Boolean);
  if (parts.length < 3 || parts[0] !== "invitations") return null;
  const userId = parts[1];
  if (!userId) return null;
  const fileName = parts[parts.length - 1];
  const dotIndex = fileName.lastIndexOf(".");
  const extension = dotIndex > -1 ? fileName.slice(dotIndex + 1).toLowerCase() : "";
  return { relativePath: normalized, userId, fileName, extension };
}

/**
 * True when a discovered file under `public/uploads/invitations/` should be treated as a
 * raw-upload backfill candidate: a recognized video extension, not already living under an
 * `originals/`/`processed/` directory we manage ourselves, and not already named like one of
 * our own generated outputs (idempotency guard for re-runs).
 */
export function isBackfillCandidatePath(relativePath: string): boolean {
  const info = parseInvitationUploadPath(relativePath);
  if (!info) return false;
  if (!VIDEO_EXT_SET.has(info.extension)) return false;
  const segments = info.relativePath.split("/");
  if (segments.some((segment) => OWNED_SEGMENTS.has(segment))) return false;
  const lowerName = info.fileName.toLowerCase();
  if (OWNED_SUFFIXES.some((suffix) => lowerName.includes(suffix))) return false;
  return true;
}

/**
 * Every URL string form this app has ever returned for a given upload-relative path — all of
 * them must be located and replaced in the database (older code paths / manual data entry may
 * have used any of these shapes).
 */
export function buildOldUrlCandidates(relativePath: string): string[] {
  const normalized = toPosixRelative(relativePath);
  return [`/api/uploads/${normalized}`, `/uploads/${normalized}`, normalized];
}

export function buildProcessedRelativePaths(
  userId: string,
  baseId: string
): { playback: string; poster: string; thumbnail: string } {
  return {
    playback: `invitations/${userId}/processed/${baseId}-playback.mp4`,
    poster: `invitations/${userId}/processed/${baseId}-poster.jpg`,
    thumbnail: `invitations/${userId}/processed/${baseId}-thumbnail.jpg`,
  };
}

export interface JsonReplaceResult {
  value: unknown;
  changed: boolean;
  replacements: number;
}

/**
 * Recursively walks a JSON-compatible value (the shape Prisma `Json` columns decode to) and
 * replaces every occurrence of any `oldUrl -> newUrl` mapping found inside string values.
 * Handles both exact-match strings (the common case — a media asset's `url` field) and `oldUrl`
 * appearing as a substring of a longer string (an absolute URL with a domain prefix, or a URL
 * embedded inside a larger text block). Never mutates the input — returns a new value so callers
 * can diff/verify (and log a rollback record) before writing.
 */
export function deepReplaceUrlsInJson(value: unknown, replacements: Map<string, string>): JsonReplaceResult {
  let count = 0;

  function replaceInString(input: string): string {
    let out = input;
    for (const [oldUrl, newUrl] of replacements) {
      if (!oldUrl || oldUrl === newUrl) continue;
      if (out.includes(oldUrl)) {
        const before = out;
        out = out.split(oldUrl).join(newUrl);
        if (out !== before) count++;
      }
    }
    return out;
  }

  function walk(input: unknown): unknown {
    if (typeof input === "string") return replaceInString(input);
    if (Array.isArray(input)) return input.map(walk);
    if (input && typeof input === "object") {
      const result: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(input as Record<string, unknown>)) {
        result[key] = walk(val);
      }
      return result;
    }
    return input;
  }

  const next = walk(value);
  return { value: next, changed: count > 0, replacements: count };
}

export type BackfillItemStatus = "PENDING" | "DONE" | "SKIPPED_COMPATIBLE" | "FAILED";

export interface BackfillManifestEntry {
  relativePath: string;
  userId: string;
  status: BackfillItemStatus;
  sourceSizeBytes: number;
  sourceMtimeMs: number;
  playbackRelativePath?: string;
  posterRelativePath?: string;
  thumbnailRelativePath?: string;
  playbackUrl?: string;
  posterUrl?: string | null;
  thumbnailUrl?: string | null;
  method?: string;
  durationSeconds?: number | null;
  width?: number | null;
  height?: number | null;
  error?: string;
  processedAt?: string;
  dbRowsUpdated?: number;
}

export interface BackfillManifest {
  version: 1;
  updatedAt: string;
  entries: Record<string, BackfillManifestEntry>;
}

export function createEmptyManifest(): BackfillManifest {
  return { version: 1, updatedAt: new Date().toISOString(), entries: {} };
}

/**
 * True when a manifest entry already reflects the exact file currently on disk (same size +
 * mtime) and was already terminally processed — safe to skip on a re-run/`--resume` without
 * reprocessing (idempotency).
 */
export function manifestEntryIsUpToDate(
  entry: BackfillManifestEntry | undefined,
  sourceSizeBytes: number,
  sourceMtimeMs: number
): boolean {
  if (!entry) return false;
  if (entry.status !== "DONE" && entry.status !== "SKIPPED_COMPATIBLE") return false;
  return entry.sourceSizeBytes === sourceSizeBytes && entry.sourceMtimeMs === sourceMtimeMs;
}

export interface RollbackRecord {
  model: string;
  id: string;
  field: string;
  oldValue: string | null;
  newValue: string;
  isJson: boolean;
}

/** Builds the `{ oldUrl: string -> newUrl: string }` replacement map for one converted file. */
export function buildReplacementMap(oldCandidates: string[], newUrl: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const oldUrl of oldCandidates) {
    if (oldUrl && oldUrl !== newUrl) map.set(oldUrl, newUrl);
  }
  return map;
}
