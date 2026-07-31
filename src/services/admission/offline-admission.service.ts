import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { getEventAdmissionSettings } from "@/services/admission/guest-pass.service";
import { applyPassAdmission } from "@/services/admission/admission.service";
import { decideAdmission } from "@/lib/admission/pass-decision";
import type { ResolvedAdmissionSettings } from "@/lib/admission/admission-settings";
import { pickSeatingAssignment } from "@/lib/seating/assignment-pick";

/**
 * Offline admission: the downloadable gate package and its reconciliation.
 *
 * The package never carries a usable token — only `sha256(token)`. An offline
 * device hashes what it scans and matches locally, which proves the guest held
 * a real pass without ever putting the signing secret on a phone at the gate.
 */

/**
 * v2 adds per-member seats, the remaining count, and a short admission history
 * so an offline gate can run partial group admission — and explain a party's
 * held seats — with no network. Devices still holding a v1 package keep
 * working: every v2 field is optional on read and derived when absent.
 */
export const OFFLINE_PACKAGE_VERSION = 2;

export interface OfflinePartyMember {
  id: string;
  name: string;
  plusOnes: number;
  admitted: boolean;
  /** Seat held for this member, when the event has assigned one. */
  table?: string | null;
  seat?: string | null;
}

/** One line of the append-only ledger, trimmed for the gate's storage budget. */
export interface OfflineHistoryEntry {
  /** ISO timestamp. */
  at: string;
  action: string;
  qty: number;
}

export interface OfflinePassRecord {
  /** sha256 of the signed token — the device's local lookup key. */
  h: string;
  /** Admission code, for the manual path. */
  c: string;
  /** Display name shown to the operator. */
  n: string;
  /** Party size (allowance). */
  p: number;
  /** Heads already admitted when the package was built. */
  a: number;
  /** Heads still to arrive. Derived from `p - a`; carried so the gate never has
   *  to recompute an allowance it might get wrong. */
  r?: number;
  status: string;
  expiresAt: string | null;
  /** Party roster for partial arrivals. */
  members: OfflinePartyMember[];
  table: string | null;
  seat: string | null;
  /** Most recent admission activity, newest first. */
  history?: OfflineHistoryEntry[];
}

/** Ledger rows carried per pass. Enough to explain a party, small enough to cache. */
const HISTORY_PER_PASS = 5;

export interface OfflinePackage {
  version: number;
  eventId: string;
  eventTitle: string;
  issuedAt: string;
  expiresAt: string;
  settings: Pick<
    ResolvedAdmissionSettings,
    | "manualCodeEnabled"
    | "offlineAdmissionEnabled"
    | "allowPartialArrival"
    | "allowSeparateArrival"
    | "allowReEntry"
    | "reEntryWindowMinutes"
    | "requireScannerConfirmation"
    | "fastAdmissionMode"
    | "duplicatePolicy"
    | "offlinePackageTtlMinutes"
    | "showTableOnPass"
    | "showSeatOnPass"
  > & { validFrom: string | null; validUntil: string | null };
  passes: OfflinePassRecord[];
  checksum: string;
}

/** Hard cap so a runaway guest list can never blow up a phone's storage. */
const MAX_OFFLINE_PASSES = 10_000;

export async function buildOfflinePackage(eventId: string): Promise<OfflinePackage> {
  const [event, settings] = await Promise.all([
    prisma.event.findUnique({ where: { id: eventId }, select: { id: true, title: true } }),
    getEventAdmissionSettings(eventId),
  ]);
  if (!event) throw new Error("Event not found");
  if (!settings.offlineAdmissionEnabled) {
    throw new Error("Offline admission is disabled for this event");
  }

  const passes = await prisma.guestPass.findMany({
    where: {
      eventId,
      status: { in: ["ACTIVE", "PARTIALLY_ADMITTED", "ADMITTED", "PENDING_SYNC"] },
    },
    take: MAX_OFFLINE_PASSES,
    orderBy: { createdAt: "asc" },
    select: {
      tokenHash: true,
      code: true,
      displayName: true,
      partySize: true,
      admittedCount: true,
      status: true,
      expiresAt: true,
      invitationId: true,
      invitation: {
        select: {
          guests: {
            select: {
              id: true,
              name: true,
              plusOnes: true,
              status: true,
              seatingAssignments: {
                select: {
                  tableNumber: true,
                  seatLabel: true,
                  seatingPlan: { select: { planType: true } },
                },
              },
            },
            orderBy: { createdAt: "asc" },
          },
        },
      },
    },
  });

  // One grouped read rather than a query per pass — a 2,000-guest gate pack
  // must not become 2,000 round trips.
  const history = await prisma.admissionEvent.findMany({
    where: { invitationId: { in: passes.map((p) => p.invitationId) } },
    orderBy: { createdAt: "desc" },
    take: passes.length * HISTORY_PER_PASS,
    select: {
      invitationId: true,
      action: true,
      admittedQuantity: true,
      createdAt: true,
    },
  });
  const historyByInvitation = new Map<string, OfflineHistoryEntry[]>();
  for (const row of history) {
    const list = historyByInvitation.get(row.invitationId) ?? [];
    if (list.length >= HISTORY_PER_PASS) continue;
    list.push({
      at: row.createdAt.toISOString(),
      action: row.action,
      qty: row.admittedQuantity,
    });
    historyByInvitation.set(row.invitationId, list);
  }

  const issuedAt = new Date();
  const records: OfflinePassRecord[] = passes.map((p) => {
    const seating =
      p.invitation.guests
        .map((g) => pickSeatingAssignment(g.seatingAssignments))
        .find((a) => a != null) ?? null;
    return {
      h: p.tokenHash,
      c: p.code,
      n: p.displayName,
      p: p.partySize,
      a: p.admittedCount,
      r: Math.max(0, p.partySize - p.admittedCount),
      status: p.status,
      expiresAt: p.expiresAt ? p.expiresAt.toISOString() : null,
      members: p.invitation.guests.map((g) => {
        const memberSeat = pickSeatingAssignment(g.seatingAssignments);
        return {
          id: g.id,
          name: g.name,
          plusOnes: Math.max(0, g.plusOnes ?? 0),
          admitted: g.status === "CHECKED_IN",
          table: settings.showTableOnPass
            ? (memberSeat?.tableNumber ?? null)
            : null,
          seat: settings.showSeatOnPass ? (memberSeat?.seatLabel ?? null) : null,
        };
      }),
      table: settings.showTableOnPass ? (seating?.tableNumber ?? null) : null,
      seat: settings.showSeatOnPass ? (seating?.seatLabel ?? null) : null,
      history: historyByInvitation.get(p.invitationId) ?? [],
    };
  });

  const body = {
    version: OFFLINE_PACKAGE_VERSION,
    eventId,
    eventTitle: event.title,
    issuedAt: issuedAt.toISOString(),
    expiresAt: new Date(
      issuedAt.getTime() + settings.offlinePackageTtlMinutes * 60_000
    ).toISOString(),
    settings: {
      manualCodeEnabled: settings.manualCodeEnabled,
      offlineAdmissionEnabled: settings.offlineAdmissionEnabled,
      allowPartialArrival: settings.allowPartialArrival,
      allowSeparateArrival: settings.allowSeparateArrival,
      allowReEntry: settings.allowReEntry,
      reEntryWindowMinutes: settings.reEntryWindowMinutes,
      requireScannerConfirmation: settings.requireScannerConfirmation,
      fastAdmissionMode: settings.fastAdmissionMode,
      duplicatePolicy: settings.duplicatePolicy,
      offlinePackageTtlMinutes: settings.offlinePackageTtlMinutes,
      showTableOnPass: settings.showTableOnPass,
      showSeatOnPass: settings.showSeatOnPass,
      validFrom: settings.validFrom ? settings.validFrom.toISOString() : null,
      validUntil: settings.validUntil ? settings.validUntil.toISOString() : null,
    },
    passes: records,
  };

  return {
    ...body,
    checksum: createHash("sha256").update(JSON.stringify(body)).digest("hex").slice(0, 32),
  };
}

export interface OfflineAdmissionRecord {
  /** Client-generated id — the idempotency key for this record. */
  clientRecordId: string;
  /** sha256 of the scanned token, or null when the operator typed a code. */
  tokenHash?: string | null;
  code?: string | null;
  quantity: number;
  guestIds?: string[];
  capturedAt: string;
  usedManualCode?: boolean;
}

export interface ReconcileOutcome {
  clientRecordId: string;
  state: "applied" | "duplicate" | "conflict" | "rejected";
  reason: string;
  passCode?: string;
}

export interface ReconcileResult {
  applied: number;
  duplicates: number;
  conflicts: number;
  rejected: number;
  outcomes: ReconcileOutcome[];
}

/**
 * Replay offline admissions against the live database.
 *
 * Every record is idempotent on `clientRecordId`, so a retried sync is free.
 * A record that would push a party past its allowance is *never* silently
 * accepted: the pass is flagged CONFLICT for organiser review.
 */
export async function reconcileOfflineAdmissions(
  deviceId: string,
  eventId: string,
  records: OfflineAdmissionRecord[],
  actorUserId: string
): Promise<ReconcileResult> {
  const device = await prisma.offlineDevice.findUnique({ where: { id: deviceId } });
  if (!device) throw new Error("Device not found");
  if (device.eventId !== eventId) throw new Error("Device is registered to a different event");
  if (!device.isAuthorized) throw new Error("This device is no longer authorised to admit guests");

  const settings = await getEventAdmissionSettings(eventId);
  const outcomes: ReconcileOutcome[] = [];
  let applied = 0;
  let duplicates = 0;
  let conflicts = 0;
  let rejected = 0;

  // Oldest first so a party's partial arrivals replay in the order they happened.
  const ordered = [...records].sort(
    (a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime()
  );

  for (const record of ordered) {
    const existing = await prisma.offlineCheckin.findUnique({
      where: { clientRecordId: record.clientRecordId },
    });
    if (existing) {
      duplicates++;
      outcomes.push({
        clientRecordId: record.clientRecordId,
        state: "duplicate",
        reason: "Already synced from this device.",
      });
      continue;
    }

    const pass = record.tokenHash
      ? await prisma.guestPass.findUnique({ where: { tokenHash: record.tokenHash } })
      : record.code
        ? await prisma.guestPass.findFirst({ where: { eventId, code: record.code } })
        : null;

    if (!pass || pass.eventId !== eventId) {
      rejected++;
      await recordOffline(deviceId, record, null, "INVALID", true, "No matching pass");
      outcomes.push({
        clientRecordId: record.clientRecordId,
        state: "rejected",
        reason: "No matching pass for this event.",
      });
      continue;
    }

    const capturedAt = new Date(record.capturedAt);
    const decision = decideAdmission(
      {
        eventId: pass.eventId,
        status: pass.status,
        partySize: pass.partySize,
        admittedCount: pass.admittedCount,
        expiresAt: pass.expiresAt,
        firstAdmittedAt: pass.firstAdmittedAt,
        lastAdmittedAt: pass.lastAdmittedAt,
      },
      settings,
      {
        eventId,
        now: capturedAt,
        requestedQuantity: record.quantity,
        source: record.usedManualCode ? "manual_code" : "qr",
      }
    );

    if (decision.admitQuantity === 0) {
      // The gate let them in offline but the live state disagrees — surface it
      // to the organiser rather than pretending nothing happened.
      conflicts++;
      await prisma.guestPass.update({
        where: { id: pass.id },
        data: { status: "CONFLICT" },
      });
      await recordOffline(deviceId, record, pass.id, "ALREADY_USED", true, decision.message);
      outcomes.push({
        clientRecordId: record.clientRecordId,
        state: "conflict",
        reason: decision.message,
        passCode: pass.code,
      });
      continue;
    }

    const result = await applyPassAdmission({
      passId: pass.id,
      expectedRevision: pass.revision,
      admitQuantity: decision.admitQuantity,
      guestIds: record.guestIds?.length ? record.guestIds : null,
      scannerUserId: device.userId,
      scannerDeviceId: deviceId,
      offlineCreatedAt: capturedAt,
      portalUnlockPolicy: settings.portalUnlockPolicy,
    });

    if (!result) {
      conflicts++;
      await prisma.guestPass.update({ where: { id: pass.id }, data: { status: "CONFLICT" } });
      await recordOffline(
        deviceId,
        record,
        pass.id,
        "ALREADY_USED",
        true,
        "Another device admitted this party first"
      );
      outcomes.push({
        clientRecordId: record.clientRecordId,
        state: "conflict",
        reason: "Another device admitted this party while this one was offline.",
        passCode: pass.code,
      });
      continue;
    }

    applied++;
    await recordOffline(deviceId, record, pass.id, "VALID", false, null);
    outcomes.push({
      clientRecordId: record.clientRecordId,
      state: "applied",
      reason: decision.message,
      passCode: pass.code,
    });
  }

  await prisma.offlineSyncLog.create({
    data: {
      deviceId,
      action: "SYNC_PASS_ADMISSIONS",
      records: applied,
      conflicts,
      payload: { duplicates, rejected, total: records.length },
    },
  });
  await prisma.offlineDevice.update({
    where: { id: deviceId },
    data: { lastSyncAt: new Date() },
  });

  await createAuditLog({
    userId: actorUserId,
    action: "UPDATE",
    entity: "admission",
    entityId: eventId,
    details: { kind: "offline_sync", deviceId, applied, conflicts, duplicates, rejected },
  });

  return { applied, duplicates, conflicts, rejected, outcomes };
}

async function recordOffline(
  deviceId: string,
  record: OfflineAdmissionRecord,
  guestPassId: string | null,
  result: "VALID" | "INVALID" | "ALREADY_USED",
  conflict: boolean,
  conflictReason: string | null
) {
  await prisma.offlineCheckin.create({
    data: {
      deviceId,
      guestPassId,
      clientRecordId: record.clientRecordId,
      qrToken: record.tokenHash ?? record.code ?? "",
      result,
      admittedQuantity: Math.max(1, record.quantity),
      usedManualCode: Boolean(record.usedManualCode),
      conflict,
      conflictReason,
      checkedInAt: new Date(record.capturedAt),
      synced: true,
      syncedAt: new Date(),
    },
  });
}

/** Passes awaiting organiser review after an offline sync conflict. */
export async function listConflicts(eventId: string) {
  return prisma.guestPass.findMany({
    where: { eventId, status: { in: ["CONFLICT", "MANUAL_REVIEW"] } },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      code: true,
      displayName: true,
      partySize: true,
      admittedCount: true,
      status: true,
      updatedAt: true,
      offlineCheckins: {
        where: { conflict: true },
        orderBy: { checkedInAt: "desc" },
        take: 5,
        select: {
          id: true,
          checkedInAt: true,
          admittedQuantity: true,
          conflictReason: true,
          usedManualCode: true,
        },
      },
    },
  });
}

/** Organiser decision on a conflicted pass. */
export async function resolveConflict(
  passId: string,
  actorUserId: string,
  resolution: "accept" | "reject",
  reason: string
) {
  const pass = await prisma.guestPass.findUnique({ where: { id: passId } });
  if (!pass) throw new Error("Pass not found");

  const settings = await getEventAdmissionSettings(pass.eventId);

  if (resolution === "accept") {
    const remaining = Math.max(0, pass.partySize - pass.admittedCount);
    if (remaining > 0) {
      await applyPassAdmission({
        passId,
        expectedRevision: pass.revision,
        admitQuantity: remaining,
        guestIds: null,
        scannerUserId: actorUserId,
        scannerDeviceId: null,
        offlineCreatedAt: null,
        portalUnlockPolicy: settings.portalUnlockPolicy,
      });
    }
  }

  const updated = await prisma.guestPass.update({
    where: { id: passId },
    data: {
      status:
        resolution === "accept"
          ? pass.admittedCount + 1 >= pass.partySize
            ? "ADMITTED"
            : "PARTIALLY_ADMITTED"
          : "ACTIVE",
    },
  });

  await createAuditLog({
    userId: actorUserId,
    action: "UPDATE",
    entity: "guest_pass",
    entityId: passId,
    details: { kind: "conflict_resolved", resolution, reason },
  });

  return updated;
}
