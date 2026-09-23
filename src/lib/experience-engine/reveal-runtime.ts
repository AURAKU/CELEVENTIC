/**
 * Reveal runtime helpers — scroll lock, completion, and replay without
 * rewriting individual reveal UIs.
 *
 * Scroll locking is centralized in invitation-scroll-lock.ts.
 */

export {
  lockRevealScroll,
  unlockRevealScroll,
  forceUnlockRevealScroll,
  forceUnlockInvitationViewport,
  assertPortalViewportInteractive,
  getInvitationScrollLockCountForTests,
} from "@/lib/experience-engine/invitation-scroll-lock";

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
