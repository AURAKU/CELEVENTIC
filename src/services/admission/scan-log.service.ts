import { prisma } from "@/lib/prisma";

/**
 * One chronological log of every admission event at a gate.
 *
 * Scans live in four tables — legacy guest/ticket QR, Guest Entry Pass
 * admissions, vendor access-card entries and shared access passes. Reading only
 * one of them is why the gate screen could look empty while people were walking
 * in, so this merges all four into a single dated feed.
 */

export type ScanLogSource = "qr" | "entry_pass" | "vendor_pass" | "shared_access";

export type ScanLogStatus = "ADMITTED" | "RE_ENTRY" | "DENIED" | "DUPLICATE" | "INFO";

export interface ScanLogRow {
  id: string;
  source: ScanLogSource;
  createdAt: string;
  status: ScanLogStatus;
  /** Short human label, e.g. "Admitted", "Re-entry", "Refused". */
  outcome: string;
  displayName: string;
  passType: string;
  code: string | null;
  quantity: number;
  gate: string | null;
  scannerName: string | null;
  /** qr | manual_code | dashboard | offline */
  channel: string | null;
  seat: string | null;
  table: string | null;
  /** Denial reason or any extra note worth showing the operator. */
  detail: string | null;
  guestId: string | null;
  entryCycle: number | null;
  offline: boolean;
}

export interface ScanLogPage {
  items: ScanLogRow[];
  total: number;
  page: number;
  pages: number;
  limit: number;
  /** Per-source totals, so the UI can explain what it is showing. */
  breakdown: Record<ScanLogSource, number>;
}

/** Hard ceiling on the over-fetch each source does to answer a deep page. */
const MAX_SOURCE_WINDOW = 500;

const QR_STATUS: Record<string, ScanLogStatus> = {
  VALID: "ADMITTED",
  ALREADY_USED: "DUPLICATE",
  INVALID: "DENIED",
  EXPIRED: "DENIED",
  WRONG_EVENT: "DENIED",
  REVOKED: "DENIED",
};

const QR_OUTCOME: Record<string, string> = {
  VALID: "Admitted",
  ALREADY_USED: "Already used",
  INVALID: "Invalid",
  EXPIRED: "Expired",
  WRONG_EVENT: "Wrong event",
  REVOKED: "Revoked",
};

const ADMISSION_ACTION_OUTCOME: Record<string, { status: ScanLogStatus; label: string }> = {
  ADMIT: { status: "ADMITTED", label: "Admitted" },
  PARTIAL_ADMIT: { status: "ADMITTED", label: "Partly admitted" },
  RE_ENTRY: { status: "RE_ENTRY", label: "Re-entry" },
  DENY: { status: "DENIED", label: "Refused" },
  UNDO: { status: "INFO", label: "Undone" },
  RESET: { status: "INFO", label: "Reset" },
  MANUAL_OVERRIDE: { status: "ADMITTED", label: "Manual override" },
};

function matches(q: string, ...values: (string | null | undefined)[]): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  return values.some((v) => (v ?? "").toLowerCase().includes(needle));
}

export async function getUnifiedScanLog(
  eventId: string,
  options: { page?: number; limit?: number; q?: string } = {}
): Promise<ScanLogPage> {
  const limit = Math.min(100, Math.max(1, Math.trunc(options.limit ?? 20)));
  const page = Math.max(1, Math.trunc(options.page ?? 1));
  const q = (options.q ?? "").trim();
  // Merging four sorted streams needs every candidate that could land on this
  // page, so each source contributes its own top `skip + limit`.
  const window = Math.min(MAX_SOURCE_WINDOW, page * limit);

  const [qrScans, admissionEvents, vendorEntries, sharedScans] = await Promise.all([
    prisma.qrScan.findMany({
      where: { eventId },
      orderBy: { createdAt: "desc" },
      take: window,
      select: {
        id: true,
        result: true,
        gate: true,
        deviceInfo: true,
        createdAt: true,
        guestId: true,
        scanner: { select: { name: true } },
        guest: {
          select: {
            id: true,
            name: true,
            manualCode: true,
            seatingAssignments: { select: { tableNumber: true, seatLabel: true }, take: 1 },
          },
        },
        ticket: { select: { name: true } },
        guestPass: { select: { code: true, displayName: true } },
      },
    }),
    prisma.admissionEvent.findMany({
      where: { eventId },
      orderBy: { createdAt: "desc" },
      take: window,
      select: {
        id: true,
        action: true,
        admittedQuantity: true,
        reason: true,
        notes: true,
        scannerUserId: true,
        offlineCreatedAt: true,
        createdAt: true,
        guestId: true,
        invitation: {
          select: {
            name: true,
            guestPasses: {
              orderBy: { tokenVersion: "desc" },
              take: 1,
              select: { code: true, displayName: true },
            },
          },
        },
      },
    }),
    prisma.vendorTeamPassAdmission.findMany({
      where: { eventId },
      orderBy: { createdAt: "desc" },
      take: window,
      select: {
        id: true,
        quantity: true,
        outcome: true,
        denialReason: true,
        entryCycle: true,
        channel: true,
        gate: true,
        offline: true,
        notes: true,
        scannedById: true,
        createdAt: true,
        pass: {
          select: {
            title: true,
            vendorName: true,
            passType: true,
            admissionCode: true,
            teamCapacity: true,
          },
        },
      },
    }),
    prisma.sharedAccessPassScan.findMany({
      where: { eventId },
      orderBy: { createdAt: "desc" },
      take: window,
      select: {
        id: true,
        result: true,
        gate: true,
        vendorLabel: true,
        offline: true,
        scannedById: true,
        createdAt: true,
        pass: { select: { displayName: true, manualCode: true } },
      },
    }),
  ]);

  // Scanner ids live as plain columns on some tables — resolve every name in
  // one read rather than per row.
  const userIds = new Set<string>();
  for (const row of admissionEvents) if (row.scannerUserId) userIds.add(row.scannerUserId);
  for (const row of vendorEntries) if (row.scannedById) userIds.add(row.scannedById);
  for (const row of sharedScans) if (row.scannedById) userIds.add(row.scannedById);
  const users = userIds.size
    ? await prisma.user.findMany({
        where: { id: { in: [...userIds] } },
        select: { id: true, name: true, email: true },
      })
    : [];
  const nameById = new Map(users.map((u) => [u.id, u.name ?? u.email ?? null]));

  const rows: ScanLogRow[] = [];

  for (const scan of qrScans) {
    const seat = scan.guest?.seatingAssignments?.[0] ?? null;
    const displayName =
      scan.guestPass?.displayName ?? scan.guest?.name ?? scan.ticket?.name ?? "Unknown pass";
    const code = scan.guestPass?.code ?? scan.guest?.manualCode ?? null;
    if (!matches(q, displayName, code, scan.gate, seat?.seatLabel, seat?.tableNumber)) continue;
    rows.push({
      id: `qr:${scan.id}`,
      source: "qr",
      createdAt: scan.createdAt.toISOString(),
      status: QR_STATUS[scan.result] ?? "INFO",
      outcome: QR_OUTCOME[scan.result] ?? scan.result,
      displayName,
      passType: scan.ticket ? "Ticket" : "Guest QR",
      code,
      quantity: scan.result === "VALID" ? 1 : 0,
      gate: scan.gate,
      scannerName: scan.scanner?.name ?? null,
      channel: scan.deviceInfo?.includes("manual") ? "manual_code" : "qr",
      seat: seat?.seatLabel ?? null,
      table: seat?.tableNumber ?? null,
      detail: null,
      guestId: scan.guestId ?? scan.guest?.id ?? null,
      entryCycle: null,
      offline: false,
    });
  }

  for (const row of admissionEvents) {
    const pass = row.invitation?.guestPasses?.[0] ?? null;
    const displayName = pass?.displayName ?? row.invitation?.name ?? "Guest pass";
    const outcome = ADMISSION_ACTION_OUTCOME[row.action] ?? {
      status: "INFO" as ScanLogStatus,
      label: row.action,
    };
    if (!matches(q, displayName, pass?.code, row.reason)) continue;
    rows.push({
      id: `pass:${row.id}`,
      source: "entry_pass",
      createdAt: row.createdAt.toISOString(),
      status: outcome.status,
      outcome: outcome.label,
      displayName,
      passType: "Guest entry pass",
      code: pass?.code ?? null,
      quantity: row.admittedQuantity,
      gate: null,
      scannerName: row.scannerUserId ? (nameById.get(row.scannerUserId) ?? null) : null,
      channel: row.offlineCreatedAt ? "offline" : "qr",
      seat: null,
      table: null,
      detail: row.reason ?? row.notes ?? null,
      guestId: row.guestId ?? null,
      entryCycle: null,
      offline: Boolean(row.offlineCreatedAt),
    });
  }

  for (const row of vendorEntries) {
    const displayName = `${row.pass.title} · ${row.pass.vendorName}`;
    if (!matches(q, displayName, row.pass.admissionCode, row.gate, row.denialReason)) continue;
    const admitted = row.outcome !== "DENIED";
    rows.push({
      id: `vendor:${row.id}`,
      source: "vendor_pass",
      createdAt: row.createdAt.toISOString(),
      status: admitted ? (row.entryCycle > 1 ? "RE_ENTRY" : "ADMITTED") : "DENIED",
      outcome: admitted ? (row.entryCycle > 1 ? "Re-entry" : "Admitted") : "Refused",
      displayName,
      passType: "Vendor access card",
      code: row.pass.admissionCode,
      quantity: row.quantity,
      gate: row.gate,
      scannerName: row.scannedById ? (nameById.get(row.scannedById) ?? null) : null,
      channel: row.channel ?? (row.offline ? "offline" : "qr"),
      seat: null,
      table: null,
      detail: row.denialReason ?? row.notes ?? null,
      guestId: null,
      entryCycle: row.entryCycle,
      offline: row.offline,
    });
  }

  for (const row of sharedScans) {
    const displayName = row.vendorLabel ?? row.pass?.displayName ?? "Shared access pass";
    if (!matches(q, displayName, row.pass?.manualCode, row.gate)) continue;
    const admitted = row.result === "VALID";
    rows.push({
      id: `shared:${row.id}`,
      source: "shared_access",
      createdAt: row.createdAt.toISOString(),
      status: admitted ? "ADMITTED" : "DENIED",
      outcome: admitted ? "Admitted" : row.result.replace(/_/g, " ").toLowerCase(),
      displayName,
      passType: "Shared access pass",
      code: row.pass?.manualCode ?? null,
      quantity: admitted ? 1 : 0,
      gate: row.gate,
      scannerName: row.scannedById ? (nameById.get(row.scannedById) ?? null) : null,
      channel: row.offline ? "offline" : "qr",
      seat: null,
      table: null,
      detail: null,
      guestId: null,
      entryCycle: null,
      offline: row.offline,
    });
  }

  rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const breakdown: Record<ScanLogSource, number> = {
    qr: 0,
    entry_pass: 0,
    vendor_pass: 0,
    shared_access: 0,
  };
  for (const row of rows) breakdown[row.source]++;

  const total = rows.length;
  const start = (page - 1) * limit;
  return {
    items: rows.slice(start, start + limit),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
    limit,
    breakdown,
  };
}
