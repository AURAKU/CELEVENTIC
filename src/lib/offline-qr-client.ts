const STORAGE_PREFIX = "celeventic_offline_";

export interface OfflinePackage {
  eventId: string;
  syncedAt: string;
  tokenScheme?: "sha256" | "plain";
  guests: {
    id: string;
    name: string;
    qrToken: string | null;
    manualCode?: string | null;
    status: string;
  }[];
  tickets: { id: string; name: string; qrToken: string | null; status: string }[];
  checksum: string;
}

async function sha256HexBrowser(value: string): Promise<string> {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function storedTokenMatches(stored: string | null | undefined, raw: string, hashed: string): boolean {
  if (!stored) return false;
  return stored === raw || stored === hashed;
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

function alreadyScannedOffline(
  eventId: string,
  tokens: (string | null | undefined)[],
  guestId?: string,
  ticketId?: string
): boolean {
  const scans = getOfflineScans(eventId);
  const tokenSet = new Set(tokens.filter(Boolean) as string[]);
  return scans.some((s) => {
    if (s.result !== "VALID") return false;
    if (tokenSet.has(s.qrToken)) return true;
    if (guestId && s.guestId === guestId) return true;
    if (ticketId && s.ticketId === ticketId) return true;
    return false;
  });
}

export async function validateOfflineToken(
  eventId: string,
  rawToken: string
): Promise<{
  result: "VALID" | "ALREADY_USED" | "INVALID" | "WRONG_EVENT";
  guestId?: string;
  ticketId?: string;
  name?: string;
  /** Canonical admission token to sync when online */
  syncToken?: string;
}> {
  const pkg = getOfflinePackage(eventId);
  if (!pkg) return { result: "INVALID" };

  const token = rawToken.trim();
  const hashed = await sha256HexBrowser(token);

  const guest = pkg.guests.find(
    (g) => storedTokenMatches(g.qrToken, token, hashed) || (g.manualCode != null && g.manualCode === token)
  );
  if (guest) {
    const syncToken = token;
    if (
      guest.status === "CHECKED_IN" ||
      alreadyScannedOffline(eventId, [guest.qrToken, guest.manualCode, token, hashed], guest.id)
    ) {
      return { result: "ALREADY_USED", guestId: guest.id, name: guest.name, syncToken };
    }
    return { result: "VALID", guestId: guest.id, name: guest.name, syncToken };
  }

  const ticket = pkg.tickets.find((t) => storedTokenMatches(t.qrToken, token, hashed));
  if (ticket) {
    if (
      ticket.status === "USED" ||
      alreadyScannedOffline(eventId, [ticket.qrToken, token, hashed], undefined, ticket.id)
    ) {
      return {
        result: "ALREADY_USED",
        ticketId: ticket.id,
        name: ticket.name,
        syncToken: token,
      };
    }
    return {
      result: "VALID",
      ticketId: ticket.id,
      name: ticket.name,
      syncToken: token,
    };
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

  // Reflect check-in in cached package so repeat scans are blocked offline
  if (scan.result === "VALID") {
    const pkg = getOfflinePackage(eventId);
    if (pkg) {
      if (scan.guestId) {
        pkg.guests = pkg.guests.map((g) =>
          g.id === scan.guestId ? { ...g, status: "CHECKED_IN" } : g
        );
      }
      if (scan.ticketId) {
        pkg.tickets = pkg.tickets.map((t) =>
          t.id === scan.ticketId ? { ...t, status: "USED" } : t
        );
      }
      saveOfflinePackage(eventId, pkg);
    }
  }

  return entry;
}

/** After online reset, clear local VALID scans and restore guest status in package. */
export function resetOfflineAdmissionLocal(
  eventId: string,
  opts: { guestId?: string; all?: boolean }
) {
  const pkg = getOfflinePackage(eventId);
  const scans = getOfflineScans(eventId);

  if (opts.all) {
    localStorage.setItem(
      scansKey(eventId),
      JSON.stringify(scans.filter((s) => s.result !== "VALID"))
    );
    if (pkg) {
      pkg.guests = pkg.guests.map((g) =>
        g.status === "CHECKED_IN" ? { ...g, status: "ACCEPTED" } : g
      );
      pkg.tickets = pkg.tickets.map((t) => (t.status === "USED" ? { ...t, status: "PAID" } : t));
      saveOfflinePackage(eventId, pkg);
    }
    return;
  }

  if (opts.guestId) {
    localStorage.setItem(
      scansKey(eventId),
      JSON.stringify(scans.filter((s) => !(s.result === "VALID" && s.guestId === opts.guestId)))
    );
    if (pkg) {
      pkg.guests = pkg.guests.map((g) =>
        g.id === opts.guestId && g.status === "CHECKED_IN" ? { ...g, status: "ACCEPTED" } : g
      );
      saveOfflinePackage(eventId, pkg);
    }
  }
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
