const PREFIX = "celeventic-guide:";

export function guideStorageKey(kind: string, id: string): string {
  return `${PREFIX}${kind}:${id}`;
}

export function rememberVideoPosition(slug: string, seconds: number) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(guideStorageKey("pos", slug), String(Math.max(0, Math.floor(seconds))));
  } catch {
    /* ignore */
  }
}

export function loadVideoPosition(slug: string): number {
  if (typeof window === "undefined") return 0;
  try {
    const v = localStorage.getItem(guideStorageKey("pos", slug));
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function rememberTourCompletion(tourId: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(guideStorageKey("tour", tourId), JSON.stringify({ completedAt: Date.now() }));
  } catch {
    /* ignore */
  }
}

export function isTourCompleted(tourId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return !!localStorage.getItem(guideStorageKey("tour", tourId));
  } catch {
    return false;
  }
}

export function clearTourCompletion(tourId: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(guideStorageKey("tour", tourId));
  } catch {
    /* ignore */
  }
}

const PENDING_WELCOME_TOUR = "pending-welcome-tour";

/** Mark that Finish Setup should open the navigation tutor on the next dashboard visit. */
export function markPendingWelcomeTour() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(guideStorageKey("flag", PENDING_WELCOME_TOUR), "1");
  } catch {
    /* ignore */
  }
}

/** Returns true once, then clears — so the tour only auto-starts after setup. */
export function consumePendingWelcomeTour(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const key = guideStorageKey("flag", PENDING_WELCOME_TOUR);
    const pending = localStorage.getItem(key) === "1";
    if (pending) localStorage.removeItem(key);
    return pending;
  } catch {
    return false;
  }
}
