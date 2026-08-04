import { randomInt } from "node:crypto";
import type { GuestPass, GuestPassStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import {
  hashPassToken,
  mintPassToken,
  passTokenFromNonce,
  passTokenPrefix,
  safeCodeEquals,
  verifyPassTokenSignature,
} from "@/lib/admission/pass-token";
import {
  codeFromRandom,
  normalizeAdmissionCode,
  resolveCodeLength,
  SHORT_CODE_LENGTH,
} from "@/lib/admission/pass-code";
import {
  resolveAdmissionSettings,
  type ResolvedAdmissionSettings,
} from "@/lib/admission/admission-settings";
import {
  decideAdmission,
  notFoundDecision,
  type AdmissionDecision,
} from "@/lib/admission/pass-decision";
import { applyPassAdmission } from "@/services/admission/admission.service";
import {
  resolveSeatingContinuity,
  type SeatingContinuity,
} from "@/lib/admission/seating-continuity";
import { pickSeatingAssignment } from "@/lib/seating/assignment-pick";

/**
 * Guest Entry Pass lifecycle.
 *
 * One active pass per invitation: a signed QR token plus a human-readable
 * admission code, bounded by the party's allowance. Issuance is idempotent so
 * it can be called from invite creation, guest assignment, publish, and the
 * "enable QR admission" toggle without ever minting duplicates.
 */

const ACTIVE_STATUSES: GuestPassStatus[] = [
  "ACTIVE",
  "PARTIALLY_ADMITTED",
  "ADMITTED",
  "PENDING_SYNC",
  "CONFLICT",
  "MANUAL_REVIEW",
];

const CODE_ALLOCATION_ATTEMPTS = 40;

export interface IssuedPass {
  pass: GuestPass;
  /** Only ever produced in memory — never persisted. */
  token: string;
}

type Tx = Prisma.TransactionClient;

/** Head count a party may bring: stored override, else guests + plus-ones. */
function derivePartySize(
  guests: { plusOnes: number | null }[],
  storedAllowance: number | null
): number {
  if (typeof storedAllowance === "number" && storedAllowance > 0) return storedAllowance;
  const derived = guests.reduce((sum, g) => sum + 1 + Math.max(0, g.plusOnes ?? 0), 0);
  return Math.max(1, derived);
}

/**
 * Allocate an event-unique admission code. Random-first (so codes are not
 * guessable from issuance order) with a deterministic sweep as the fallback,
 * which guarantees termination even when a space is nearly full.
 */
async function allocateCode(tx: Tx, eventId: string, length: number): Promise<string> {
  for (let attempt = 0; attempt < CODE_ALLOCATION_ATTEMPTS; attempt++) {
    const code = codeFromRandom(randomInt(0, 10 ** length), length);
    const taken = await tx.guestPass.findFirst({
      where: { eventId, code },
      select: { id: true },
    });
    if (!taken) return code;
  }

  const used = await tx.guestPass.findMany({
    where: { eventId, code: { not: "" } },
    select: { code: true },
  });
  const taken = new Set(used.map((r) => r.code));
  const space = 10 ** length;
  const start = randomInt(0, space);
  for (let i = 0; i < space; i++) {
    const code = String((start + i) % space).padStart(length, "0");
    if (!taken.has(code)) return code;
  }

  throw new Error(
    `No ${length}-digit admission codes remain for this event. Switch the event to 6-digit codes.`
  );
}

/**
 * Next token version for an invitation.
 *
 * Counts *every* pass ever issued, including revoked and reissued ones, not
 * just the live one. Those rows are deliberately kept so an old printout is
 * recognised and refused at the gate rather than reading as an unknown QR —
 * which means the version number they occupy is taken, and reusing it would
 * collide on `(invitationId, tokenVersion)`. Reached whenever a pass is
 * revoked and later reinstated: a lost phone replaced, or an archived
 * invitation restored.
 */
async function nextTokenVersion(tx: Tx, invitationId: string): Promise<number> {
  const latest = await tx.guestPass.findFirst({
    where: { invitationId },
    orderBy: { tokenVersion: "desc" },
    select: { tokenVersion: true },
  });
  return (latest?.tokenVersion ?? 0) + 1;
}

/** Code length for this event: organiser setting, widened if the list demands it. */
async function resolveEventCodeLength(
  tx: Tx,
  eventId: string,
  configured: number | null
): Promise<number> {
  const existing = await tx.guestPass.count({ where: { eventId } });
  const guests = await tx.invitation.count({ where: { eventId } });
  return resolveCodeLength(Math.max(existing + 1, guests), configured);
}

export async function getEventAdmissionSettings(
  eventId: string
): Promise<ResolvedAdmissionSettings> {
  const [row, event] = await Promise.all([
    prisma.eventAdmissionSettings.findUnique({ where: { eventId } }),
    prisma.event.findUnique({ where: { id: eventId }, select: { startDate: true } }),
  ]);
  return resolveAdmissionSettings(row, event?.startDate ?? null);
}

/**
 * Idempotently ensure an invitation has exactly one active pass.
 *
 * Safe to call repeatedly (invite create, guest assign, group change, publish,
 * QR-enable). Party size is refreshed on every call so adding a plus-one after
 * issuance widens the allowance instead of stranding a guest at the gate.
 */
export async function ensureInvitationPass(
  invitationId: string,
  opts: { refreshPartySize?: boolean } = {}
): Promise<IssuedPass | null> {
  const invitation = await prisma.invitation.findUnique({
    where: { id: invitationId },
    select: {
      id: true,
      eventId: true,
      name: true,
      admissionAllowance: true,
      guests: { select: { id: true, plusOnes: true, groupId: true } },
    },
  });
  if (!invitation) return null;

  const settingsRow = await prisma.eventAdmissionSettings.findUnique({
    where: { eventId: invitation.eventId },
  });
  const configuredLength = settingsRow?.manualCodeLength ?? SHORT_CODE_LENGTH;
  const partySize = derivePartySize(invitation.guests, invitation.admissionAllowance);
  const groupId = invitation.guests.find((g) => g.groupId)?.groupId ?? null;

  return prisma.$transaction(async (tx) => {
    const existing = await tx.guestPass.findFirst({
      where: { invitationId, status: { in: ACTIVE_STATUSES } },
      orderBy: { tokenVersion: "desc" },
    });

    // Issuing a pass always enables the post-admission companion — otherwise
    // guests land on a 404 after the gate scans them in.
    await tx.invitation.updateMany({
      where: { id: invitationId, postAdmissionEnabled: false },
      data: { postAdmissionEnabled: true },
    });

    if (existing) {
      const shouldRefresh = opts.refreshPartySize !== false && partySize !== existing.partySize;
      if (!shouldRefresh) {
        return { pass: existing, token: passTokenFromNonce(existing.tokenNonce) };
      }

      const admittedCount = Math.min(existing.admittedCount, partySize);
      let nextStatus = existing.status;
      if (existing.status === "ADMITTED" || existing.status === "PARTIALLY_ADMITTED" || existing.status === "ACTIVE") {
        if (admittedCount <= 0) nextStatus = "ACTIVE";
        else if (admittedCount >= partySize) nextStatus = "ADMITTED";
        else nextStatus = "PARTIALLY_ADMITTED";
      }

      const pass = await tx.guestPass.update({
        where: { id: existing.id },
        data: {
          partySize,
          admittedCount,
          status: nextStatus,
        },
      });
      return { pass, token: passTokenFromNonce(pass.tokenNonce) };
    }

    const length = await resolveEventCodeLength(tx, invitation.eventId, configuredLength);
    const code = await allocateCode(tx, invitation.eventId, length);
    const { nonce, token } = mintPassToken();

    const pass = await tx.guestPass.create({
      data: {
        eventId: invitation.eventId,
        invitationId,
        groupId,
        tokenHash: hashPassToken(token),
        tokenNonce: nonce,
        tokenPrefix: passTokenPrefix(token),
        tokenVersion: await nextTokenVersion(tx, invitationId),
        code,
        codeLength: length,
        displayName: invitation.name,
        partySize,
        status: "ACTIVE",
      },
    });

    return { pass, token };
  });
}

/** Issue passes for every invitation on an event. Idempotent per invitation. */
export async function ensureEventPasses(eventId: string): Promise<{ issued: number; total: number }> {
  const invitations = await prisma.invitation.findMany({
    where: { eventId },
    select: { id: true },
  });

  let issued = 0;
  for (const invitation of invitations) {
    const before = await prisma.guestPass.count({
      where: { invitationId: invitation.id, status: { in: ACTIVE_STATUSES } },
    });
    await ensureInvitationPass(invitation.id);
    if (before === 0) issued++;
  }

  return { issued, total: invitations.length };
}

/**
 * Replace an invitation's pass. The previous row becomes REISSUED (not
 * deleted) so an old printout is recognised and politely refused at the gate
 * instead of reading as "unknown QR".
 */
export async function regenerateInvitationPass(
  invitationId: string,
  actorUserId: string,
  reason: string
): Promise<IssuedPass | null> {
  const invitation = await prisma.invitation.findUnique({
    where: { id: invitationId },
    select: {
      id: true,
      eventId: true,
      name: true,
      admissionAllowance: true,
      guests: { select: { id: true, plusOnes: true, groupId: true } },
    },
  });
  if (!invitation) return null;

  const settingsRow = await prisma.eventAdmissionSettings.findUnique({
    where: { eventId: invitation.eventId },
  });
  const partySize = derivePartySize(invitation.guests, invitation.admissionAllowance);
  const groupId = invitation.guests.find((g) => g.groupId)?.groupId ?? null;

  const result = await prisma.$transaction(async (tx) => {
    // The most recent pass of any status. Admitted heads carry forward from it
    // even when it was revoked, so reinstating a withdrawn pass cannot let a
    // party that is already inside walk in for a second time.
    const previous = await tx.guestPass.findFirst({
      where: { invitationId },
      orderBy: { tokenVersion: "desc" },
    });

    if (previous && ACTIVE_STATUSES.includes(previous.status)) {
      await tx.guestPass.update({
        where: { id: previous.id },
        data: { status: "REISSUED", revokedAt: new Date(), revokedReason: reason },
      });
    }

    const length = await resolveEventCodeLength(
      tx,
      invitation.eventId,
      settingsRow?.manualCodeLength ?? SHORT_CODE_LENGTH
    );
    const code = await allocateCode(tx, invitation.eventId, length);
    const { nonce, token } = mintPassToken();

    const pass = await tx.guestPass.create({
      data: {
        eventId: invitation.eventId,
        invitationId,
        groupId,
        tokenHash: hashPassToken(token),
        tokenNonce: nonce,
        tokenPrefix: passTokenPrefix(token),
        tokenVersion: (previous?.tokenVersion ?? 0) + 1,
        code,
        codeLength: length,
        displayName: invitation.name,
        partySize,
        // Carry admitted heads forward: reissuing a lost pass must not let a
        // party that is already inside walk in a second time.
        admittedCount: previous?.admittedCount ?? 0,
        status:
          (previous?.admittedCount ?? 0) >= partySize && partySize > 0
            ? "ADMITTED"
            : (previous?.admittedCount ?? 0) > 0
              ? "PARTIALLY_ADMITTED"
              : "ACTIVE",
        firstAdmittedAt: previous?.firstAdmittedAt ?? null,
        lastAdmittedAt: previous?.lastAdmittedAt ?? null,
        reissuedFromId: previous?.id ?? null,
      },
    });

    return { pass, token };
  });

  await createAuditLog({
    userId: actorUserId,
    action: "UPDATE",
    entity: "guest_pass",
    entityId: result.pass.id,
    details: {
      kind: "pass_regenerated",
      invitationId,
      tokenVersion: result.pass.tokenVersion,
      reason,
    },
  });

  return result;
}

/** Revoke a pass outright (lost/compromised, guest disinvited). */
export async function revokeInvitationPass(
  invitationId: string,
  actorUserId: string,
  reason: string
): Promise<GuestPass | null> {
  const pass = await prisma.guestPass.findFirst({
    where: { invitationId, status: { in: ACTIVE_STATUSES } },
    orderBy: { tokenVersion: "desc" },
  });
  if (!pass) return null;

  const revoked = await prisma.guestPass.update({
    where: { id: pass.id },
    data: { status: "REVOKED", revokedAt: new Date(), revokedReason: reason },
  });

  await createAuditLog({
    userId: actorUserId,
    action: "UPDATE",
    entity: "guest_pass",
    entityId: pass.id,
    details: { kind: "pass_revoked", invitationId, reason },
  });

  return revoked;
}

export interface PassLookup {
  pass: GuestPass;
  matchedBy: "qr" | "manual_code";
}

/**
 * Resolve a scanned token to its pass.
 *
 * The HMAC tag is checked before the database is touched, so forged or
 * mistyped QRs cost nothing and never widen the lookup surface.
 */
export async function findPassByToken(token: string): Promise<GuestPass | null> {
  if (!verifyPassTokenSignature(token)) return null;
  return prisma.guestPass.findUnique({ where: { tokenHash: hashPassToken(token) } });
}

/**
 * Bridge existing guest QR credentials into invitation-level admission.
 * This keeps old printed/shared guest QRs useful while making GuestPass the
 * single authoritative counter for partial and repeat arrivals.
 */
export async function findPassByLegacyToken(
  eventId: string,
  rawToken: string
): Promise<GuestPass | null> {
  const token = rawToken.trim();
  if (!token) return null;

  const guest = await prisma.guest.findFirst({
    where: {
      eventId,
      OR: [
        { qrToken: token },
        { qrCodes: { some: { token, eventId } } },
      ],
    },
    select: { invitationId: true },
  });
  if (!guest?.invitationId) return null;

  return prisma.guestPass.findFirst({
    where: {
      eventId,
      invitationId: guest.invitationId,
      status: { in: ACTIVE_STATUSES },
    },
    orderBy: { tokenVersion: "desc" },
  });
}

/**
 * Resolve a typed admission code within one event. The final comparison is
 * constant-time so response timing cannot be used to confirm a partial code.
 */
export async function findPassByCode(
  eventId: string,
  rawCode: string
): Promise<GuestPass | null> {
  const code = normalizeAdmissionCode(rawCode);
  if (code.length !== SHORT_CODE_LENGTH && code.length !== 6) return null;

  const candidate = await prisma.guestPass.findFirst({
    where: { eventId, code, status: { in: ACTIVE_STATUSES } },
  });
  if (!candidate) return null;
  return safeCodeEquals(candidate.code, code) ? candidate : null;
}

export interface AdmitInput {
  eventId: string;
  /** Signed pass token from the camera. */
  token?: string;
  /** Existing guest QR token; resolved to its invitation's active pass. */
  legacyToken?: string;
  /** Admission code typed by the operator. */
  code?: string;
  /** Heads to admit. Defaults to the whole remaining party. */
  quantity?: number;
  /** Named party members the operator ticked off, when the list is shown. */
  guestIds?: string[];
  scannerUserId: string | null;
  scannerDeviceId?: string | null;
  gate?: string | null;
  deviceInfo?: string | null;
  /** Preview only — evaluate and log, but never write an admission. */
  dryRun?: boolean;
  /**
   * The operator has answered "how many are arriving now". Suppresses the
   * quantity prompt so the admit writes on this call.
   */
  quantityConfirmed?: boolean;
  /** Replaying an offline record; timestamps come from the device. */
  offlineCreatedAt?: Date | null;
}

export interface AdmitResult {
  decision: AdmissionDecision;
  pass: GuestPass | null;
  invitationId: string | null;
  /** Party roster for the scanner's partial-arrival UI. */
  party: { id: string; name: string; plusOnes: number; admitted: boolean }[];
  seating: { tableNumber: string; seatLabel: string | null } | null;
  /** Which of the party's seats are live and which are still held. */
  seatingContinuity: SeatingContinuity | null;
  eventTitle: string | null;
}

/**
 * Evaluate and (unless `dryRun`) apply an admission.
 *
 * The write path is a single transaction guarded by the pass `revision`
 * counter: two scanners racing on the same pass produce one admission and one
 * "already admitted", never a double count.
 */
export async function admitByPass(input: AdmitInput): Promise<AdmitResult> {
  const settings = await getEventAdmissionSettings(input.eventId);
  const now = input.offlineCreatedAt ?? new Date();
  const source = input.token || input.legacyToken ? "qr" : "manual_code";

  const pass = input.token
    ? await findPassByToken(input.token)
    : input.legacyToken
      ? await findPassByLegacyToken(input.eventId, input.legacyToken)
    : input.code
      ? await findPassByCode(input.eventId, input.code)
      : null;

  if (!pass) {
    await logScan(input, null, "INVALID");
    return {
      decision: notFoundDecision(source),
      pass: null,
      invitationId: null,
      party: [],
      seating: null,
      seatingContinuity: null,
      eventTitle: null,
    };
  }

  const context = await loadPassContext(pass, settings);

  const requestedQuantity =
    input.guestIds && input.guestIds.length
      ? context.party
          .filter((m) => input.guestIds!.includes(m.id) && !m.admitted)
          .reduce((sum, m) => sum + 1 + Math.max(0, m.plusOnes), 0)
      : input.quantity;

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
      eventId: input.eventId,
      now,
      requestedQuantity,
      source,
      quantityConfirmed: input.quantityConfirmed,
    }
  );

  if (input.dryRun || decision.admitQuantity === 0) {
    await logScan(input, pass, scanResultFor(decision));
    return { decision, pass, ...context };
  }

  const applied = await applyPassAdmission({
    passId: pass.id,
    expectedRevision: pass.revision,
    admitQuantity: decision.admitQuantity,
    guestIds: input.guestIds ?? null,
    scannerUserId: input.scannerUserId,
    scannerDeviceId: input.scannerDeviceId ?? null,
    offlineCreatedAt: input.offlineCreatedAt ?? null,
    portalUnlockPolicy: settings.portalUnlockPolicy,
  });

  if (!applied) {
    // Lost the race — re-read and report the true state rather than guessing.
    const fresh = await prisma.guestPass.findUnique({ where: { id: pass.id } });
    const freshContext = fresh ? await loadPassContext(fresh, settings) : context;
    const replay = fresh
      ? decideAdmission(
          {
            eventId: fresh.eventId,
            status: fresh.status,
            partySize: fresh.partySize,
            admittedCount: fresh.admittedCount,
            expiresAt: fresh.expiresAt,
            firstAdmittedAt: fresh.firstAdmittedAt,
            lastAdmittedAt: fresh.lastAdmittedAt,
          },
          settings,
          {
            eventId: input.eventId,
            now,
            requestedQuantity,
            source,
            quantityConfirmed: input.quantityConfirmed,
          }
        )
      : decision;
    await logScan(input, fresh ?? pass, "ALREADY_USED");
    return { decision: replay, pass: fresh ?? pass, ...freshContext };
  }

  await logScan(input, applied.pass, "VALID");
  const refreshed = await loadPassContext(applied.pass, settings);
  return { decision, pass: applied.pass, ...refreshed };
}

function scanResultFor(decision: AdmissionDecision) {
  switch (decision.reason) {
    case "ALREADY_ADMITTED":
    case "DUPLICATE_BLOCKED":
      return "ALREADY_USED" as const;
    case "EXPIRED":
      return "EXPIRED" as const;
    case "NOT_YET_VALID":
      // QrScanResult has no pre-valid state. Never mislabel an authentic pass
      // as expired; the decision response still carries the precise
      // NOT_YET_VALID reason and operator message.
      return "INVALID" as const;
    case "WRONG_EVENT":
      return "WRONG_EVENT" as const;
    case "OK":
    case "OK_PARTIAL":
    case "OK_RE_ENTRY":
      return "VALID" as const;
    default:
      return "INVALID" as const;
  }
}

async function logScan(
  input: AdmitInput,
  pass: GuestPass | null,
  result: "VALID" | "INVALID" | "ALREADY_USED" | "EXPIRED" | "WRONG_EVENT"
) {
  try {
    await prisma.qrScan.create({
      data: {
        eventId: pass?.eventId ?? input.eventId,
        guestPassId: pass?.id ?? null,
        scannedBy: input.scannerUserId ?? undefined,
        gate: input.gate ?? undefined,
        result,
        deviceInfo: input.deviceInfo ?? undefined,
      },
    });
  } catch (error) {
    // A gate must keep admitting even if the audit write hiccups.
    console.error("[admission] scan log failed", error);
  }
}

async function loadPassContext(
  pass: GuestPass,
  settings: ResolvedAdmissionSettings
): Promise<Omit<AdmitResult, "decision" | "pass">> {
  const invitation = await prisma.invitation.findUnique({
    where: { id: pass.invitationId },
    select: {
      id: true,
      event: { select: { title: true } },
      guests: {
        where: { archivedAt: null },
        select: {
          id: true,
          name: true,
          plusOnes: true,
          status: true,
          seatingAssignments: {
            select: {
              tableNumber: true,
              seatLabel: true,
              zone: true,
              seatingPlan: { select: { planType: true } },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!invitation) {
    return {
      invitationId: pass.invitationId,
      party: [],
      seating: null,
      seatingContinuity: null,
      eventTitle: null,
    };
  }

  const seatingSource =
    invitation.guests
      .map((g) => pickSeatingAssignment(g.seatingAssignments))
      .find((a) => a != null) ?? null;
  const revealSeating =
    !settings.hideSeatingUntilAdmitted || pass.admittedCount > 0;

  const continuity = resolveSeatingContinuity(
    invitation.guests
      .map((g) => {
        const seating = pickSeatingAssignment(g.seatingAssignments);
        if (!seating) return null;
        return {
          guestId: g.id,
          guestName: g.name,
          tableNumber: seating.tableNumber,
          seatLabel: seating.seatLabel,
          zone: seating.zone,
          admitted: g.status === "CHECKED_IN",
        };
      })
      .filter((row): row is NonNullable<typeof row> => row != null),
    pass.partySize,
    pass.admittedCount
  );

  return {
    invitationId: invitation.id,
    party: invitation.guests.map((g) => ({
      id: g.id,
      name: g.name,
      plusOnes: Math.max(0, g.plusOnes ?? 0),
      admitted: g.status === "CHECKED_IN",
    })),
    seating:
      seatingSource && revealSeating
        ? { tableNumber: seatingSource.tableNumber, seatLabel: seatingSource.seatLabel }
        : null,
    seatingContinuity: revealSeating ? continuity : null,
    eventTitle: invitation.event.title,
  };
}

/** Server-rendered pass payload for the published invitation. */
export async function getInvitationPassView(invitationId: string) {
  const issued = await ensureInvitationPass(invitationId);
  if (!issued) return null;

  const settings = await getEventAdmissionSettings(issued.pass.eventId);
  return { ...issued, settings };
}
