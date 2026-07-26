/**
 * Opening-ceremony visit memory.
 *
 * Tap to Begin and the envelope/gate reveal are never silently skipped —
 * every visit gets the full ceremony, first time or not. What this memory
 * changes is more modest: a guest who has already completed the ceremony
 * once gets a shorter branded preload beat (instead of the full first-visit
 * hold) plus a visible, opt-in "Skip intro" control on that beat, so repeat
 * guests can move along faster themselves without the app deciding for them
 * or ever jumping them straight into mid-invitation.
 *
 * Stored per invitation + guest so a shared device still gives each named
 * guest their own first-time reveal.
 */
const STORAGE_PREFIX = "celeventic:opening-seen:v1";

export function openingMemoryKey(invitationId: string, guestId?: string | null): string {
  return `${STORAGE_PREFIX}:${invitationId}:${guestId ?? "anon"}`;
}

/** Storage is unavailable in private mode / when cookies are blocked. */
function safeStorage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    const probe = "__celeventic_probe__";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return null;
  }
}

export function hasSeenOpening(key: string): boolean {
  return safeStorage()?.getItem(key) === "1";
}

export function rememberOpeningSeen(key: string): void {
  try {
    safeStorage()?.setItem(key, "1");
  } catch {
    /* quota or blocked storage — the ceremony simply plays again */
  }
}

export function forgetOpeningSeen(key: string): void {
  try {
    safeStorage()?.removeItem(key);
  } catch {
    /* ignore */
  }
}
