const STORAGE_PREFIX = "celeventic_offline_";

export interface OfflinePackage {
  eventId: string;
  syncedAt: string;
  guests: { id: string; name: string; qrToken: string | null; status: string }[];
  tickets: { id: string; name: string; qrToken: string | null; status: string }[];
  checksum: string;
}

export interface OfflineScanLog {
  id: string;
  qrToken: string;
  result: string;
  guestId?: string;
  ticketId?: string;
  scannedAt: string;
  synced: boolean;
}

function packageKey(eventId: string) {
  return `${STORAGE_PREFIX}pkg_${eventId}`;
}

function scansKey(eventId: string) {
  return `${STORAGE_PREFIX}scans_${eventId}`;
}

export function saveOfflinePackage(eventId: string, pkg: OfflinePackage) {
  if (typeof window === "undefined") return;
  localStorage.setItem(packageKey(eventId), JSON.stringify(pkg));
}

export function getOfflinePackage(eventId: string): OfflinePackage | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(packageKey(eventId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as OfflinePackage;
  } catch {
    return null;
  }
}

export function validateOfflineToken(eventId: string, token: string): {
  result: "VALID" | "ALREADY_USED" | "INVALID" | "WRONG_EVENT";
  guestId?: string;
  ticketId?: string;
  name?: string;
} {
  const pkg = getOfflinePackage(eventId);
  if (!pkg) return { result: "INVALID" };

  const scans = getOfflineScans(eventId);
  if (scans.some((s) => s.qrToken === token && s.result === "VALID")) {
    return { result: "ALREADY_USED" };
  }

  const guest = pkg.guests.find((g) => g.qrToken === token);
  if (guest) {
    if (guest.status === "CHECKED_IN") return { result: "ALREADY_USED", guestId: guest.id, name: guest.name };
    return { result: "VALID", guestId: guest.id, name: guest.name };
  }

  const ticket = pkg.tickets.find((t) => t.qrToken === token);
  if (ticket) {
    if (ticket.status === "USED") return { result: "ALREADY_USED", ticketId: ticket.id, name: ticket.name };
    return { result: "VALID", ticketId: ticket.id, name: ticket.name };
  }

  return { result: "INVALID" };
}

export function getOfflineScans(eventId: string): OfflineScanLog[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(scansKey(eventId));
  if (!raw) return [];
  try {
    return JSON.parse(raw) as OfflineScanLog[];
  } catch {
    return [];
  }
}

export function recordOfflineScan(eventId: string, scan: Omit<OfflineScanLog, "id" | "synced">) {
  const scans = getOfflineScans(eventId);
  const entry: OfflineScanLog = {
    ...scan,
    id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    synced: false,
  };
  scans.unshift(entry);
  localStorage.setItem(scansKey(eventId), JSON.stringify(scans.slice(0, 500)));
  return entry;
}

export function markScansSynced(eventId: string, ids: string[]) {
  const scans = getOfflineScans(eventId).map((s) =>
    ids.includes(s.id) ? { ...s, synced: true } : s
  );
  localStorage.setItem(scansKey(eventId), JSON.stringify(scans));
}

export function getPendingOfflineScans(eventId: string) {
  return getOfflineScans(eventId).filter((s) => !s.synced);
}
