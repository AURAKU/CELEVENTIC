"use client";

import type { OfflinePackage, OfflinePassRecord } from "@/services/admission/offline-admission.service";

/**
 * Offline gate storage (IndexedDB).
 *
 * Two stores: the downloaded admission package (guest list keyed by token
 * hash) and the queue of admissions captured while the device was offline.
 * The queue is the source of truth until a sync confirms each record, so
 * closing the browser mid-event never loses an admitted guest.
 */

const DB_NAME = "celeventic-admission";
const DB_VERSION = 1;
const PACKAGE_STORE = "packages";
const QUEUE_STORE = "queue";

export interface QueuedAdmission {
  clientRecordId: string;
  eventId: string;
  tokenHash: string | null;
  code: string | null;
  quantity: number;
  guestIds?: string[];
  capturedAt: string;
  usedManualCode: boolean;
  displayName: string;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("Offline storage is not available in this browser"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PACKAGE_STORE)) {
        db.createObjectStore(PACKAGE_STORE, { keyPath: "eventId" });
      }
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        const store = db.createObjectStore(QUEUE_STORE, { keyPath: "clientRecordId" });
        store.createIndex("eventId", "eventId", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open offline storage"));
  });
}

function tx<T>(
  storeName: string,
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(storeName, mode);
        const request = run(transaction.objectStore(storeName));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error("Offline storage write failed"));
        transaction.oncomplete = () => db.close();
      })
  );
}

export async function savePackage(pkg: OfflinePackage): Promise<void> {
  await tx(PACKAGE_STORE, "readwrite", (store) => store.put(pkg));
}

export async function loadPackage(eventId: string): Promise<OfflinePackage | null> {
  const result = await tx<OfflinePackage | undefined>(PACKAGE_STORE, "readonly", (store) =>
    store.get(eventId)
  );
  return result ?? null;
}

export async function clearPackage(eventId: string): Promise<void> {
  await tx(PACKAGE_STORE, "readwrite", (store) => store.delete(eventId));
}

export async function enqueue(record: QueuedAdmission): Promise<void> {
  await tx(QUEUE_STORE, "readwrite", (store) => store.put(record));
}

export async function listQueue(eventId: string): Promise<QueuedAdmission[]> {
  const all = await tx<QueuedAdmission[]>(QUEUE_STORE, "readonly", (store) => store.getAll());
  return all.filter((r) => r.eventId === eventId);
}

export async function dequeue(clientRecordIds: string[]): Promise<void> {
  if (!clientRecordIds.length) return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(QUEUE_STORE, "readwrite");
    const store = transaction.objectStore(QUEUE_STORE);
    for (const id of clientRecordIds) store.delete(id);
    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("Could not clear synced records"));
  });
}

/** SHA-256 of a scanned token, matching the server's `hashPassToken`. */
export async function hashTokenInBrowser(token: string): Promise<string> {
  const bytes = new TextEncoder().encode(token.trim());
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Apply the queue on top of the downloaded package so the operator sees the
 * true local state (a party admitted 20 minutes ago while offline must not
 * read as "not yet arrived").
 */
export function projectLocalState(
  pkg: OfflinePackage,
  queue: QueuedAdmission[]
): Map<string, OfflinePassRecord> {
  const byHash = new Map<string, OfflinePassRecord>();
  for (const pass of pkg.passes) byHash.set(pass.h, { ...pass });

  const byCode = new Map<string, string>();
  for (const pass of pkg.passes) byCode.set(pass.c, pass.h);

  for (const item of queue) {
    const hash = item.tokenHash ?? (item.code ? byCode.get(item.code) : undefined);
    if (!hash) continue;
    const pass = byHash.get(hash);
    if (!pass) continue;
    pass.a = Math.min(pass.p, pass.a + item.quantity);
    pass.status = pass.a >= pass.p ? "ADMITTED" : "PARTIALLY_ADMITTED";
  }

  return byHash;
}
