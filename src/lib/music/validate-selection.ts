import type { MusicSelection } from "@/lib/music/music-types";
import { MUSIC_CLIP_MAX_SEC, MUSIC_CLIP_MIN_SEC } from "@/lib/music/music-constants";

export function clipDurationSec(selection: Pick<MusicSelection, "startSec" | "endSec">) {
  return Math.max(0, selection.endSec - selection.startSec);
}

export function validateMusicSelection(
  selection: MusicSelection | null | undefined
): string | null {
  if (!selection) return null;
  if (!selection.url?.trim()) return "Music URL is required.";
  if (!Number.isFinite(selection.startSec) || selection.startSec < 0) {
    return "Invalid start time.";
  }
  if (!Number.isFinite(selection.endSec) || selection.endSec <= selection.startSec) {
    return "End time must be after start time.";
  }

  const duration = clipDurationSec(selection);
  if (duration < MUSIC_CLIP_MIN_SEC) {
    return `Clip must be at least ${MUSIC_CLIP_MIN_SEC} seconds (currently ${Math.round(duration)}s).`;
  }
  if (duration > MUSIC_CLIP_MAX_SEC) {
    return `Clip must be at most ${MUSIC_CLIP_MAX_SEC} seconds (currently ${Math.round(duration)}s).`;
  }

  if (
    selection.originalDurationSec != null &&
    selection.endSec > selection.originalDurationSec + 0.5
  ) {
    return "End time exceeds track length.";
  }

  return null;
}

export function defaultTrimRange(durationSec: number): { startSec: number; endSec: number } {
  const safeDuration = Math.max(0, durationSec);
  const endSec = Math.min(MUSIC_CLIP_MAX_SEC, safeDuration);
  const startSec = 0;
  if (endSec - startSec < MUSIC_CLIP_MIN_SEC && safeDuration >= MUSIC_CLIP_MIN_SEC) {
    return { startSec: 0, endSec: Math.min(MUSIC_CLIP_MAX_SEC, safeDuration) };
  }
  if (safeDuration < MUSIC_CLIP_MIN_SEC) {
    return { startSec: 0, endSec: safeDuration };
  }
  return { startSec, endSec: Math.max(MUSIC_CLIP_MIN_SEC, endSec) };
}

export function resolveMusicUrl(url: string, baseUrl?: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) {
    const origin = baseUrl ?? (typeof window !== "undefined" ? window.location.origin : "");
    return origin ? `${origin}${url}` : url;
  }
  return url;
}

export function parseMusicSelection(raw: unknown): MusicSelection | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.url !== "string" || !o.url) return null;
  if (o.source !== "library" && o.source !== "upload") return null;
  return {
    source: o.source,
    libraryTrackId: typeof o.libraryTrackId === "string" ? o.libraryTrackId : undefined,
    url: o.url,
    title: typeof o.title === "string" ? o.title : undefined,
    startSec: typeof o.startSec === "number" ? o.startSec : 0,
    endSec: typeof o.endSec === "number" ? o.endSec : MUSIC_CLIP_MAX_SEC,
    originalDurationSec: typeof o.originalDurationSec === "number" ? o.originalDurationSec : undefined,
  };
}
