"use client";

/**
 * Level 1 offline runtime (browser side).
 *
 * Registers the guide service worker only after a published guide has loaded
 * online, keeps the last good payload in IndexedDB, and recovers from a stale
 * deploy without ever looping.
 *
 * Storage shape follows `src/lib/admission/offline-store.ts` so there is one
 * IndexedDB idiom in this codebase, not two.
 */

import {
  CHUNK_RECOVERY_FLAG,
  GUIDE_DB_NAME,
  GUIDE_DB_VERSION,
  GUIDE_PAYLOAD_STORE,
  GUIDE_SW_PATH,
  GUIDE_SW_SCOPE,
  cachesForToken,
  guidePayloadUrl,
  isChunkLoadError,
  type StoredGuidePayload,
} from "./offline-cache";
import type { EventGuidePayload } from "./types";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("Offline storage is not available in this browser"));
      return;
    }
    const request = indexedDB.open(GUIDE_DB_NAME, GUIDE_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(GUIDE_PAYLOAD_STORE)) {
        db.createObjectStore(GUIDE_PAYLOAD_STORE, { keyPath: "publicToken" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open offline storage"));
  });
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(GUIDE_PAYLOAD_STORE, mode);
        const request = run(transaction.objectStore(GUIDE_PAYLOAD_STORE));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error("Offline storage write failed"));
        transaction.oncomplete = () => db.close();
      })
  );
}

export async function saveGuidePayload(
  publicToken: string,
  payload: EventGuidePayload
): Promise<StoredGuidePayload> {
  const record: StoredGuidePayload = {
    publicToken,
    version: payload.version,
    syncedAt: new Date().toISOString(),
    payload,
  };
  await tx("readwrite", (store) => store.put(record));
  return record;
}

export async function loadGuidePayload(publicToken: string): Promise<StoredGuidePayload | null> {
  try {
    const result = await tx<StoredGuidePayload | undefined>("readonly", (store) =>
      store.get(publicToken)
    );
    return result ?? null;
  } catch {
    return null;
  }
}

/** Called when the server says a guide is revoked, expired or unpublished. */
export async function purgeGuide(publicToken: string): Promise<void> {
  await tx("readwrite", (store) => store.delete(publicToken)).catch(() => undefined);

  if (typeof caches === "undefined") return;
  const names = await caches.keys().catch(() => [] as string[]);
  await Promise.all(cachesForToken(names, publicToken).map((name) => caches.delete(name)));

  if ("serviceWorker" in navigator) {
    const registration = await navigator.serviceWorker
      .getRegistration(GUIDE_SW_SCOPE)
      .catch(() => null);
    registration?.active?.postMessage({ type: "purge-guide", publicToken });
  }
}

/**
 * Register the guide worker.
 *
 * Only called from a successfully loaded, published guide — a draft or revoked
 * guide never reaches this code, so a guest never caches unapproved content.
 */
export async function registerGuideWorker(
  publicToken: string,
  version: number
): Promise<boolean> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return false;
  // A non-secure origin (the venue-local HTTP address) has no worker by design.
  if (!window.isSecureContext) return false;

  try {
    const registration = await navigator.serviceWorker.register(GUIDE_SW_PATH, {
      scope: GUIDE_SW_SCOPE,
    });
    const worker = registration.active ?? registration.waiting ?? registration.installing;
    worker?.postMessage({ type: "activate-guide", publicToken, version });
    return true;
  } catch {
    return false;
  }
}

export interface GuideFetchResult {
  status: "fresh" | "cached" | "revoked" | "offline";
  payload: EventGuidePayload | null;
  syncedAt: string | null;
  reason?: string;
}

/**
 * Refresh the payload from the network, falling back to the stored copy.
 *
 * A `410` means the guide was genuinely retired, so the local copy is purged.
 * Any other failure is treated as "we are offline" — a transient 500 must never
 * destroy a guest's working offline guide mid-event.
 */
export async function refreshGuidePayload(publicToken: string): Promise<GuideFetchResult> {
  try {
    const response = await fetch(guidePayloadUrl(publicToken), {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });

    if (response.status === 410) {
      const body = (await response.json().catch(() => null)) as { reason?: string } | null;
      await purgeGuide(publicToken);
      return { status: "revoked", payload: null, syncedAt: null, reason: body?.reason };
    }

    if (response.ok) {
      const body = (await response.json()) as { available: boolean; payload?: EventGuidePayload };
      if (body.available && body.payload) {
        const stored = await saveGuidePayload(publicToken, body.payload).catch(() => null);
        return {
          status: "fresh",
          payload: body.payload,
          syncedAt: stored?.syncedAt ?? new Date().toISOString(),
        };
      }
    }
  } catch {
    // Fall through to the cached copy below.
  }

  const stored = await loadGuidePayload(publicToken);
  return stored
    ? { status: "cached", payload: stored.payload as EventGuidePayload, syncedAt: stored.syncedAt }
    : { status: "offline", payload: null, syncedAt: null };
}

/**
 * Recover from a stale service worker after a deploy.
 *
 * Unregisters, clears this guide's caches and reloads exactly once. The
 * sessionStorage guard means a genuinely broken build shows an error rather
 * than reloading forever.
 */
export async function recoverFromStaleChunks(publicToken: string): Promise<void> {
  if (typeof window === "undefined") return;
  if (sessionStorage.getItem(CHUNK_RECOVERY_FLAG) === publicToken) return;
  sessionStorage.setItem(CHUNK_RECOVERY_FLAG, publicToken);

  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations().catch(() => []);
    await Promise.all(
      registrations
        .filter((r) => r.scope.includes(GUIDE_SW_SCOPE))
        .map((r) => r.unregister().catch(() => false))
    );
  }

  if (typeof caches !== "undefined") {
    const names = await caches.keys().catch(() => [] as string[]);
    await Promise.all(cachesForToken(names, publicToken).map((name) => caches.delete(name)));
  }

  window.location.reload();
}

/** Clears the guard once the page has rendered successfully. */
export function clearChunkRecoveryFlag(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(CHUNK_RECOVERY_FLAG);
}

export function installChunkErrorRecovery(publicToken: string): () => void {
  if (typeof window === "undefined") return () => undefined;

  const onError = (event: ErrorEvent) => {
    if (isChunkLoadError(event.error) || isChunkLoadError(event)) {
      void recoverFromStaleChunks(publicToken);
    }
  };
  const onRejection = (event: PromiseRejectionEvent) => {
    if (isChunkLoadError(event.reason)) {
      void recoverFromStaleChunks(publicToken);
    }
  };

  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);
  return () => {
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onRejection);
  };
}
