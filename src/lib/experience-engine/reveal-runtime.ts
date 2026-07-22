/**
 * Reveal runtime helpers — scroll lock, completion, and replay without
 * rewriting individual reveal UIs.
 */

let lockCount = 0;
let previousOverflow = "";
let previousTouchAction = "";

/** Lock body scroll while a fullscreen reveal is active (nested-safe). */
export function lockRevealScroll(): () => void {
  if (typeof document === "undefined") return () => undefined;
  lockCount += 1;
  if (lockCount === 1) {
    previousOverflow = document.body.style.overflow;
    previousTouchAction = document.body.style.touchAction;
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    document.documentElement.classList.add("reveal-scroll-locked");
  }
  return () => unlockRevealScroll();
}

export function unlockRevealScroll(): void {
  if (typeof document === "undefined") return;
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    document.body.style.overflow = previousOverflow;
    document.body.style.touchAction = previousTouchAction;
    document.documentElement.classList.remove("reveal-scroll-locked");
  }
}

export type RevealCompletionState = "idle" | "active" | "complete";

export interface RevealSession {
  state: RevealCompletionState;
  completedAt: number | null;
  replayCount: number;
}

export function createRevealSession(): RevealSession {
  return { state: "idle", completedAt: null, replayCount: 0 };
}

export function markRevealActive(session: RevealSession): RevealSession {
  return { ...session, state: "active" };
}

export function markRevealComplete(session: RevealSession): RevealSession {
  return {
    ...session,
    state: "complete",
    completedAt: Date.now(),
  };
}

/** Reset for REPLAY action — increments replay counter. */
export function resetRevealForReplay(session: RevealSession): RevealSession {
  return {
    state: "idle",
    completedAt: null,
    replayCount: session.replayCount + 1,
  };
}

export function isRevealComplete(session: RevealSession): boolean {
  return session.state === "complete";
}
