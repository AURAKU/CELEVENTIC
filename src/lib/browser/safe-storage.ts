/**
 * Storage helpers that never throw.
 *
 * Safari private mode, some Android WebViews (WhatsApp / Instagram in-app
 * browsers), and blocked-cookie policies make `localStorage` throw on access.
 * Providers that touch storage at mount must use these helpers so invitations
 * and system pages still hydrate.
 */

export function safeLocalStorage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    const probe = "__celeventic_storage_probe__";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return null;
  }
}

export function safeSessionStorage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    const probe = "__celeventic_session_probe__";
    window.sessionStorage.setItem(probe, "1");
    window.sessionStorage.removeItem(probe);
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function storageGet(key: string): string | null {
  try {
    return safeLocalStorage()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function storageSet(key: string, value: string): boolean {
  try {
    const store = safeLocalStorage();
    if (!store) return false;
    store.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function storageRemove(key: string): void {
  try {
    safeLocalStorage()?.removeItem(key);
  } catch {
    /* ignore */
  }
}

/** Safari / older WebKit AudioContext constructor. */
export function createAudioContext(
  options?: ConstructorParameters<typeof AudioContext>[0]
): AudioContext | null {
  try {
    if (typeof window === "undefined") return null;
    const Ctor =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    return new Ctor(options);
  } catch {
    return null;
  }
}
