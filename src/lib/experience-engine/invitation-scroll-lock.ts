/**
 * Centralized invitation ceremony scroll-lock manager.
 *
 * Snapshots html/body inline styles, applies lock only while a fullscreen
 * reveal genuinely needs it, and restores on completion / unmount / error /
 * portal activation. Idempotent and Strict-Mode safe via a nested lock count.
 */

const LIVE_REVEAL_DIAG_ENABLED =
  typeof process !== "undefined" &&
  (process.env.NODE_ENV === "development" ||
    process.env.NEXT_PUBLIC_CELEVENTIC_LIVE_REVEAL_DIAG === "1" ||
    process.env.CELEVENTIC_LIVE_REVEAL_DIAG === "1");

function logScrollLock(payload: Record<string, unknown>): void {
  if (!LIVE_REVEAL_DIAG_ENABLED) return;
  console.info("[invitation-scroll-lock]", payload);
}

interface StyleSnapshot {
  bodyOverflow: string;
  bodyTouchAction: string;
  bodyPointerEvents: string;
  bodyPosition: string;
  htmlOverflow: string;
  htmlTouchAction: string;
  htmlPointerEvents: string;
}

let lockCount = 0;
let snapshot: StyleSnapshot | null = null;

function readSnapshot(): StyleSnapshot {
  return {
    bodyOverflow: document.body.style.overflow ?? "",
    bodyTouchAction: document.body.style.touchAction ?? "",
    bodyPointerEvents: document.body.style.pointerEvents ?? "",
    bodyPosition: document.body.style.position ?? "",
    htmlOverflow: document.documentElement.style?.overflow ?? "",
    htmlTouchAction: document.documentElement.style?.touchAction ?? "",
    htmlPointerEvents: document.documentElement.style?.pointerEvents ?? "",
  };
}

function applyLockStyles(): void {
  document.body.style.overflow = "hidden";
  document.body.style.touchAction = "none";
  if (document.documentElement.style) {
    document.documentElement.style.overflow = "hidden";
  }
  document.documentElement.classList.add("reveal-scroll-locked");
}

function restoreFromSnapshot(snap: StyleSnapshot | null): void {
  if (!snap) {
    clearLockStylesHard();
    return;
  }
  document.body.style.overflow = snap.bodyOverflow;
  document.body.style.touchAction = snap.bodyTouchAction;
  if (document.body.style.pointerEvents !== undefined) {
    document.body.style.pointerEvents = snap.bodyPointerEvents;
  }
  if (document.body.style.position !== undefined) {
    document.body.style.position = snap.bodyPosition;
  }
  if (document.documentElement.style) {
    document.documentElement.style.overflow = snap.htmlOverflow;
    document.documentElement.style.touchAction = snap.htmlTouchAction;
    if (document.documentElement.style.pointerEvents !== undefined) {
      document.documentElement.style.pointerEvents = snap.htmlPointerEvents;
    }
  }
  document.documentElement.classList.remove("reveal-scroll-locked");
}

function clearLockStylesHard(): void {
  document.body.style.overflow = "";
  document.body.style.touchAction = "";
  if (document.body.style.pointerEvents !== undefined) {
    document.body.style.pointerEvents = "";
  }
  if (document.body.style.position === "fixed") {
    document.body.style.position = "";
  }
  if (document.documentElement.style) {
    document.documentElement.style.overflow = "";
    document.documentElement.style.touchAction = "";
    if (document.documentElement.style.pointerEvents !== undefined) {
      document.documentElement.style.pointerEvents = "";
    }
  }
  document.documentElement.classList.remove("reveal-scroll-locked");
}

/** Lock body/html scroll while a fullscreen reveal is active (nested-safe). */
export function lockRevealScroll(): () => void {
  if (typeof document === "undefined") return () => undefined;
  lockCount += 1;
  if (lockCount === 1) {
    snapshot = readSnapshot();
    applyLockStyles();
    logScrollLock({ action: "acquire", lockCount, phase: "reveal" });
  } else {
    logScrollLock({ action: "acquire-nested", lockCount });
  }
  return () => unlockRevealScroll();
}

export function unlockRevealScroll(): void {
  if (typeof document === "undefined") return;
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    restoreFromSnapshot(snapshot);
    snapshot = null;
    logScrollLock({ action: "release", lockCount: 0 });
  } else {
    logScrollLock({ action: "release-nested", lockCount });
  }
}

/**
 * Final safety invariant — never leave the guest stuck with
 * overflow:hidden / touch-action:none / pointer-events:none on html/body.
 */
export function forceUnlockInvitationViewport(reason = "force"): void {
  if (typeof document === "undefined") return;
  lockCount = 0;
  clearLockStylesHard();
  snapshot = null;

  // Paged invitation scrollport — clear residual ceremony freezes.
  try {
    const scroller = document.querySelector?.(".inv-paged-scroll") as HTMLElement | null;
    if (scroller?.style) {
      if (scroller.style.pointerEvents === "none") {
        scroller.style.pointerEvents = "";
      }
      if (scroller.style.touchAction === "none") {
        scroller.style.touchAction = "";
      }
      if (scroller.style.overflowY === "hidden") {
        scroller.style.overflowY = "";
      }
    }
  } catch {
    /* test mocks may omit querySelector */
  }

  logScrollLock({ action: "force-unlock", reason, phase: "portal" });
}

/** @deprecated Prefer forceUnlockInvitationViewport — kept for call-site compat. */
export function forceUnlockRevealScroll(): void {
  forceUnlockInvitationViewport("legacy-alias");
}

export function getInvitationScrollLockCountForTests(): number {
  return lockCount;
}

/**
 * After portal mount: html/body must allow scrolling and the center pixel
 * must not belong to a reveal overlay.
 */
export function assertPortalViewportInteractive(): {
  ok: boolean;
  bodyTouchAction: string;
  htmlLocked: boolean;
  centerTag: string | null;
  centerIsReveal: boolean;
} {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return {
      ok: true,
      bodyTouchAction: "",
      htmlLocked: false,
      centerTag: null,
      centerIsReveal: false,
    };
  }

  const bodyTouchAction = document.body.style.touchAction || "";
  const htmlLocked = document.documentElement.classList.contains("reveal-scroll-locked");
  const bodyOverflow = document.body.style.overflow || "";
  const pe = document.body.style.pointerEvents || "";

  const el = document.elementFromPoint(
    Math.floor(window.innerWidth / 2),
    Math.floor(window.innerHeight / 2)
  );
  const centerTag = el?.nodeName?.toLowerCase() ?? null;
  const centerIsReveal = Boolean(
    el?.closest?.(
      "[data-envelope-phase], .interactive-reveal-root, [data-reveal-mechanic], [aria-modal='true'][data-envelope-phase]"
    )
  );

  const ok =
    bodyTouchAction !== "none" &&
    pe !== "none" &&
    bodyOverflow !== "hidden" &&
    !htmlLocked &&
    !centerIsReveal;

  if (LIVE_REVEAL_DIAG_ENABLED) {
    logScrollLock({
      action: "portal-invariant",
      ok,
      bodyTouchAction,
      bodyOverflow,
      htmlLocked,
      centerTag,
      centerIsReveal,
    });
  }

  return { ok, bodyTouchAction, htmlLocked, centerTag, centerIsReveal };
}
