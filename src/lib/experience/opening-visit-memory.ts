/**
 * Opening-ceremony visit memory.
 *
 * A guest should experience the full cinematic opening once. On every later
 * visit to the same link the invitation itself should be there immediately —
 * the ceremony is then only available on demand through "Replay opening".
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
