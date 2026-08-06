"use client";

import type { OfflinePackage } from "@/services/admission/offline-admission.service";
import { dequeue, listQueue, loadPackage, savePackage } from "@/lib/admission/offline-store";

/**
 * Shared offline gate plumbing for every surface that touches the gate pack.
 *
 * The pack itself lives in IndexedDB (see `offline-store`); this module owns the
 * network side: registering the device, downloading the pack, replaying the
 * queue, and telling other mounted components that the local state moved.
 *
 * The device id is persisted because sync is useless if a page reload forgets
 * which device captured the queued admissions.
 */

export const OFFLINE_PACK_EVENT = "celeventic:offline-pack";

function deviceKey(eventId: string): string {
  return `celeventic_gate_device_${eventId}`;
}

export function getGateDeviceId(eventId: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(deviceKey(eventId));
  } catch {
    return null;
  }
}

function rememberGateDevice(eventId: string, deviceId: string): void {
  try {
    window.localStorage.setItem(deviceKey(eventId), deviceId);
  } catch {
    /* private mode — sync still works for the life of this tab */
  }
}

/** Broadcast so the gate panel and the pack card never disagree on state. */
export function notifyPackChanged(eventId: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OFFLINE_PACK_EVENT, { detail: { eventId } }));
}

export async function registerGateDevice(eventId: string): Promise<string | null> {
  try {
    const res = await fetch("/api/admission/offline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "register",
        eventId,
        deviceName:
          typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 60) : "gate-device",
      }),
    });
    const json = await res.json();
    if (!json.success) return null;
    rememberGateDevice(eventId, json.data.deviceId);
    return json.data.deviceId as string;
  } catch {
    return null;
  }
}

export interface GatePackCounts {
  passes: number;
  guests: number;
  vendorCards: number;
  vendorSeats: number;
  codes: number;
}

export function packCounts(pkg: OfflinePackage | null): GatePackCounts {
  if (!pkg) return { passes: 0, guests: 0, vendorCards: 0, vendorSeats: 0, codes: 0 };
  const vendors = pkg.vendorTeamPasses ?? [];
  return {
    passes: pkg.passes.length,
    guests: pkg.passes.reduce((sum, p) => sum + Math.max(1, p.p), 0),
    vendorCards: vendors.length,
    vendorSeats: vendors.reduce((sum, v) => sum + Math.max(1, v.teamCapacity), 0),
    codes:
      pkg.passes.filter((p) => Boolean(p.c)).length +
      vendors.filter((v) => Boolean(v.admissionCode)).length,
  };
}

export function packAgeMinutes(pkg: OfflinePackage | null): number | null {
  if (!pkg) return null;
  return Math.max(0, Math.round((Date.now() - new Date(pkg.issuedAt).getTime()) / 60_000));
}

/** A pack past its TTL still admits, but the operator deserves a warning. */
export function isPackStale(pkg: OfflinePackage | null): boolean {
  const age = packAgeMinutes(pkg);
  if (age == null || !pkg) return false;
  const ttl = pkg.settings?.offlinePackageTtlMinutes ?? 240;
  return age > ttl;
}

export async function downloadGatePack(eventId: string): Promise<OfflinePackage> {
  const [pkgRes, deviceId] = await Promise.all([
    fetch(`/api/admission/offline?eventId=${encodeURIComponent(eventId)}`, { cache: "no-store" }),
    registerGateDevice(eventId),
  ]);
  const pkgJson = await pkgRes.json().catch(() => ({}));
  if (!pkgRes.ok || !pkgJson?.success) {
    throw new Error(pkgJson?.error ?? "Could not download the offline gate pack.");
  }
  await savePackage(pkgJson.data as OfflinePackage);
  if (deviceId) rememberGateDevice(eventId, deviceId);
  notifyPackChanged(eventId);
  return pkgJson.data as OfflinePackage;
}

export interface GateSyncResult {
  applied: number;
  conflicts: number;
  duplicates: number;
  rejected: number;
  pending: number;
}

/**
 * Replay everything captured offline. Records the server could not resolve stay
 * queued — a gate must never quietly lose an admission it already waved through.
 */
export async function syncGateQueue(eventId: string): Promise<GateSyncResult> {
  const pending = await listQueue(eventId);
  if (!pending.length) {
    return { applied: 0, conflicts: 0, duplicates: 0, rejected: 0, pending: 0 };
  }

  const deviceId = getGateDeviceId(eventId) ?? (await registerGateDevice(eventId));
  if (!deviceId) {
    throw new Error("Could not register this device for sync. Reconnect and refresh the pack.");
  }

  const res = await fetch("/api/admission/offline", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "sync",
      eventId,
      deviceId,
      records: pending.map((r) => ({
        clientRecordId: r.clientRecordId,
        tokenHash: r.tokenHash,
        code: r.code,
        quantity: r.quantity,
        guestIds: r.guestIds,
        capturedAt: r.capturedAt,
        usedManualCode: r.usedManualCode,
      })),
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.success) throw new Error(json?.error ?? "Sync failed");

  const settled = (json.data.outcomes as Array<{ state: string; clientRecordId: string }>)
    .filter((o) => o.state !== "rejected")
    .map((o) => o.clientRecordId);
  await dequeue(settled);
  notifyPackChanged(eventId);

  const remaining = await listQueue(eventId);
  return {
    applied: json.data.applied ?? 0,
    conflicts: json.data.conflicts ?? 0,
    duplicates: json.data.duplicates ?? 0,
    rejected: json.data.rejected ?? 0,
    pending: remaining.length,
  };
}

export { loadPackage, listQueue };
