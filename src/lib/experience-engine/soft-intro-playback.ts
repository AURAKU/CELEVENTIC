/**
 * Pure helpers for the Celeventic invitation soft-intro video beat.
 * Kept free of React so Node tests can cover autoplay / fallback policy.
 */

import { safeSessionStorage } from "@/lib/browser/safe-storage";

/** Exact production assets — no cache-busting query that can confuse CDN/range caches. */
export const INTRO_VIDEO_SRC = "/brand/celeventic-invitation-intro.mp4";
export const INTRO_POSTER_SRC = "/brand/celeventic-invitation-intro-poster.jpg";

/** When duration is unknown, reveal the invitation after this many ms. */
export const INTRO_UNKNOWN_DURATION_FALLBACK_MS = 14_000;

/** Brief poster hold after a hard media failure before revealing the invite. */
export const INTRO_ERROR_POSTER_HOLD_MS = 1_600;

/** Stall / waiting grace before treating the stream as failed. */
export const INTRO_STALL_GRACE_MS = 8_000;

const SESSION_PREFIX = "celeventic:soft-intro:session:v1";

/** Invitation-scoped session key — never a global `introSeen` / `hasSeenIntro`. */
export function softIntroSessionKey(invitationId: string): string {
  const id = invitationId.trim() || "unknown";
  return `${SESSION_PREFIX}:${id}`;
}

export function hasSeenSoftIntroThisSession(invitationId: string): boolean {
  if (!invitationId.trim()) return false;
  try {
    return safeSessionStorage()?.getItem(softIntroSessionKey(invitationId)) === "1";
  } catch {
    return false;
  }
}

export function rememberSoftIntroThisSession(invitationId: string): void {
  if (!invitationId.trim()) return;
  try {
    safeSessionStorage()?.setItem(softIntroSessionKey(invitationId), "1");
  } catch {
    /* private mode / blocked storage — intro simply plays again */
  }
}

export function forgetSoftIntroThisSession(invitationId: string): void {
  if (!invitationId.trim()) return;
  try {
    safeSessionStorage()?.removeItem(softIntroSessionKey(invitationId));
  } catch {
    /* ignore */
  }
}

/**
 * Prefer real media duration when available; otherwise 14s so guests are never
 * trapped on a blank intro.
 */
export function softIntroTimeoutMs(durationSeconds: number | null | undefined): number {
  if (
    typeof durationSeconds === "number" &&
    Number.isFinite(durationSeconds) &&
    durationSeconds > 0 &&
    durationSeconds < 120
  ) {
    return Math.ceil(durationSeconds * 1000) + 750;
  }
  return INTRO_UNKNOWN_DURATION_FALLBACK_MS;
}

export type IntroPlayAttemptResult = {
  ok: boolean;
  reason?: string;
  name?: string;
};

/** Attempt `video.play()` and always catch the promise rejection. */
export async function attemptVideoPlay(
  video: Pick<HTMLVideoElement, "play" | "muted" | "defaultMuted" | "paused" | "ended">,
  options?: { muted?: boolean }
): Promise<IntroPlayAttemptResult> {
  if (options?.muted !== undefined) {
    video.defaultMuted = options.muted;
    video.muted = options.muted;
  }
  try {
    const playback = video.play();
    if (playback && typeof (playback as Promise<void>).then === "function") {
      await playback;
    }
    return { ok: true };
  } catch (error) {
    const name = error instanceof Error ? error.name : "Error";
    const reason = error instanceof Error ? error.message : String(error);
    return { ok: false, name, reason };
  }
}

export type IntroVideoDiagnostics = {
  currentSrc: string;
  readyState: number;
  networkState: number;
  paused: boolean;
  ended: boolean;
  muted: boolean;
  autoplay: boolean;
  errorCode: number | null;
  playRejection?: string;
};

export function collectIntroVideoDiagnostics(
  video: HTMLVideoElement,
  playRejection?: string
): IntroVideoDiagnostics {
  return {
    currentSrc: video.currentSrc || video.src || "",
    readyState: video.readyState,
    networkState: video.networkState,
    paused: video.paused,
    ended: video.ended,
    muted: video.muted,
    autoplay: video.autoplay,
    errorCode: video.error?.code ?? null,
    playRejection,
  };
}

export function shouldEnableIntroDebug(): boolean {
  if (typeof process !== "undefined" && process.env.NODE_ENV !== "production") {
    return true;
  }
  try {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).has("introDebug");
  } catch {
    return false;
  }
}

/** Dev / `?introDebug` logs — never include tokens or guest PII. */
export function logIntroDiagnostics(
  label: string,
  diagnostics: IntroVideoDiagnostics
): void {
  if (!shouldEnableIntroDebug()) return;
  console.info(`[celeventic-soft-intro] ${label}`, diagnostics);
}

/** Ensure iOS Safari treats the element as inline + muted for autoplay policy. */
export function prepareIntroVideoElement(video: HTMLVideoElement): void {
  video.defaultMuted = true;
  video.muted = true;
  video.playsInline = true;
  video.setAttribute("playsinline", "");
  video.setAttribute("webkit-playsinline", "");
  video.setAttribute("muted", "");
  video.preload = "auto";
  video.controls = false;
  try {
    video.disablePictureInPicture = true;
  } catch {
    /* older WebKit */
  }
}
