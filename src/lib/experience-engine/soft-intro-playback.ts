/**
 * Pure helpers for the Celeventic invitation soft-intro video beat.
 * Kept free of React so Node tests can cover autoplay / fallback policy.
 */

import { safeSessionStorage } from "@/lib/browser/safe-storage";

/** Canonical intro assets — cache-bust when playback policy / component changes. */
export const INTRO_VIDEO_SRC = "/brand/celeventic-invitation-intro.mp4?v=20260802c";
export const INTRO_POSTER_SRC = "/brand/celeventic-invitation-intro-poster.jpg?v=20260802c";

/** Absolute ceiling — invite must reveal by this time if the clip never ends cleanly. */
export const INTRO_UNKNOWN_DURATION_FALLBACK_MS = 14_000;

/** Never finish before the video has had a fair chance to start buffering/playing. */
export const INTRO_MIN_START_GRACE_MS = 4_000;

/** Brief poster hold after a hard media failure before revealing the invite. */
export const INTRO_ERROR_POSTER_HOLD_MS = 1_600;

/** Stall / waiting grace before treating the stream as failed. */
export const INTRO_STALL_GRACE_MS = 8_000;

const SESSION_PREFIX = "celeventic:soft-intro:session:v1";

/**
 * Invitation-scoped session key — uses invite link (or id), never a global
 * `introSeen` / `hasSeenIntro` key.
 */
export function softIntroSessionKey(invitationLinkOrId: string): string {
  const id = invitationLinkOrId.trim() || "unknown";
  return `${SESSION_PREFIX}:${id}`;
}

export function hasSeenSoftIntroThisSession(invitationLinkOrId: string): boolean {
  if (!invitationLinkOrId.trim()) return false;
  try {
    return safeSessionStorage()?.getItem(softIntroSessionKey(invitationLinkOrId)) === "1";
  } catch {
    return false;
  }
}

export function rememberSoftIntroThisSession(invitationLinkOrId: string): void {
  if (!invitationLinkOrId.trim()) return;
  try {
    safeSessionStorage()?.setItem(softIntroSessionKey(invitationLinkOrId), "1");
  } catch {
    /* private mode / blocked storage — intro simply plays again */
  }
}

export function forgetSoftIntroThisSession(invitationLinkOrId: string): void {
  if (!invitationLinkOrId.trim()) return;
  try {
    safeSessionStorage()?.removeItem(softIntroSessionKey(invitationLinkOrId));
  } catch {
    /* ignore */
  }
}

/**
 * Cap at 14s. Prefer real media duration. Always wait at least
 * INTRO_MIN_START_GRACE_MS so a bogus short duration cannot finish instantly.
 */
export function softIntroTimeoutMs(durationSeconds: number | null | undefined): number {
  const max = INTRO_UNKNOWN_DURATION_FALLBACK_MS;
  const min = INTRO_MIN_START_GRACE_MS;
  if (
    typeof durationSeconds === "number" &&
    Number.isFinite(durationSeconds) &&
    durationSeconds > 0 &&
    durationSeconds < 120
  ) {
    const fromDuration = Math.ceil(durationSeconds * 1000) + 500;
    return Math.min(max, Math.max(min, fromDuration));
  }
  return max;
}

export type IntroPlayAttemptResult = {
  ok: boolean;
  reason?: string;
  name?: string;
};

export function isAutoplayPolicyRejection(result: IntroPlayAttemptResult): boolean {
  if (result.ok) return false;
  const blob = `${result.name ?? ""} ${result.reason ?? ""}`.toLowerCase();
  return (
    blob.includes("notallowed") ||
    blob.includes("not allowed") ||
    blob.includes("user didn't interact") ||
    blob.includes("user gesture") ||
    blob.includes("play() failed") ||
    blob.includes("interrupted")
  );
}

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

/**
 * Production autoplay policy:
 * 1) try muted first (Safari-safe)
 * 2) if a caller already tried unmuted and it failed, fall back to muted
 * Never treat autoplay policy rejection as a media load failure.
 */
export async function playIntroWithMutedFallback(
  video: Pick<HTMLVideoElement, "play" | "muted" | "defaultMuted" | "paused" | "ended">,
  preferUnmuted = false
): Promise<{
  playing: boolean;
  muted: boolean;
  needsGesture: boolean;
  unmutedRejected?: IntroPlayAttemptResult;
  mutedResult?: IntroPlayAttemptResult;
}> {
  if (preferUnmuted) {
    const unmuted = await attemptVideoPlay(video, { muted: false });
    if (unmuted.ok) {
      return { playing: true, muted: false, needsGesture: false };
    }
    const muted = await attemptVideoPlay(video, { muted: true });
    if (muted.ok) {
      return {
        playing: true,
        muted: true,
        needsGesture: false,
        unmutedRejected: unmuted,
        mutedResult: muted,
      };
    }
    return {
      playing: false,
      muted: true,
      needsGesture: isAutoplayPolicyRejection(unmuted) || isAutoplayPolicyRejection(muted),
      unmutedRejected: unmuted,
      mutedResult: muted,
    };
  }

  const muted = await attemptVideoPlay(video, { muted: true });
  if (muted.ok) {
    return { playing: true, muted: true, needsGesture: false, mutedResult: muted };
  }
  return {
    playing: false,
    muted: true,
    needsGesture: isAutoplayPolicyRejection(muted),
    mutedResult: muted,
  };
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

/** Dev / live diagnostics — never include tokens or guest PII. */
export function logIntroDiagnostics(
  label: string,
  diagnostics: IntroVideoDiagnostics
): void {
  console.info(`[celeventic-soft-intro] ${label}`, {
    currentSrc: diagnostics.currentSrc,
    readyState: diagnostics.readyState,
    networkState: diagnostics.networkState,
    paused: diagnostics.paused,
    ended: diagnostics.ended,
    muted: diagnostics.muted,
    autoplay: diagnostics.autoplay,
    errorCode: diagnostics.errorCode,
    playRejection: diagnostics.playRejection,
  });
}

/** Always emit onError diagnostics (no PII) so live failures are inspectable. */
export function logIntroErrorDiagnostics(diagnostics: IntroVideoDiagnostics): void {
  console.info("[celeventic-soft-intro] onError", {
    currentSrc: diagnostics.currentSrc,
    errorCode: diagnostics.errorCode,
    networkState: diagnostics.networkState,
    readyState: diagnostics.readyState,
  });
}

/** Ensure iOS Safari treats the element as inline + muted for autoplay policy. */
export function prepareIntroVideoElement(video: HTMLVideoElement, muted = true): void {
  video.defaultMuted = muted;
  video.muted = muted;
  video.playsInline = true;
  video.setAttribute("playsinline", "");
  video.setAttribute("webkit-playsinline", "");
  if (muted) video.setAttribute("muted", "");
  else video.removeAttribute("muted");
  video.preload = "auto";
  video.controls = false;
  try {
    video.disablePictureInPicture = true;
  } catch {
    /* older WebKit */
  }
}
