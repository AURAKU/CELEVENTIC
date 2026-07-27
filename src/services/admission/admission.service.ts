import { randomUUID } from "node:crypto";
import type {
  Prisma,
  AdmissionAction,
  GuestPass,
  GuestStatus,
  PortalUnlockPolicy,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import {
  computeAllowance,
  summarize,
  type AdmissionSummary,
} from "@/lib/admission/admission-logic";

/**
 * Post-Admission Guest Experience — admission projection + reset.
 *
 * Source of truth is `Guest.status = CHECKED_IN` (set by the existing scanner
 * via qrService.checkInQr). `Invitation.admittedCount` / `admissionState` are a
 * recomputed projection, and every transition appends an immutable
 * `AdmissionEvent`. Resets are append-only (a RESET_* row), never destructive to
 * seating / gifts / memories / RSVP / QR unless the organiser opts in.
 */

type Tx = Prisma.TransactionClient;

const HEADS = (plusOnes: number | null | undefined) => 1 + Math.max(0, plusOnes ?? 0);

function admittedHeads(
  guests: { status: GuestStatus; plusOnes: number | null }[]
): number {
  return guests
    .filter((g) => g.status === "CHECKED_IN")
    .reduce((sum, g) => sum + HEADS(g.plusOnes), 0);
}

/** Statuses in which a Guest Entry Pass still governs its invitation. */
const LIVE_PASS_STATUSES = [
  "ACTIVE",
  "PARTIALLY_ADMITTED",
  "ADMITTED",
  "PENDING_SYNC",
  "CONFLICT",
  "MANUAL_REVIEW",
] as const;

/**
 * The invitation's live Guest Entry Pass, when the event uses them.
 *
 * When a pass exists it is authoritative for the admitted head count: it can
 * express "3 of a 5-head family arrived", which guest rows alone cannot.
 */
function livePass(tx: Tx, invitationId: string) {
  return tx.guestPass.findFirst({
    where: { invitationId, status: { in: [...LIVE_PASS_STATUSES] } },
    orderBy: { tokenVersion: "desc" },
  });
}

/** Recompute the invitation projection from its guests inside a transaction. */
async function recomputeProjection(
  tx: Tx,
  invitationId: string,
  opts: {
    action: AdmissionAction;
    guestId?: string | null;
    scannerUserId?: string | null;
    scannerDeviceId?: string | null;
    organiserId?: string | null;
    reason?: string | null;
    notes?: string | null;
    wasReset?: boolean;
    offlineCreatedAt?: Date | null;
  }
): Promise<AdmissionSummary> {
  const invitation = await tx.invitation.findUnique({
    where: { id: invitationId },
    include: { guests: { select: { id: true, status: true, plusOnes: true } } },
  });
  if (!invitation) throw new Error(`Invitation ${invitationId} not found`);

  const pass = await livePass(tx, invitationId);
  const allowance = Math.max(
    computeAllowance(invitation.guests, invitation.admissionAllowance),
    pass?.partySize ?? 0
  );
  const previous = invitation.admittedCount;
  // Guest rows and the pass are two views of the same truth written by two
  // paths (legacy scanner vs. entry pass). Taking the larger keeps them
  // converged; a reset zeroes both first, so it still lands on zero.
  const admitted = Math.min(
    Math.max(admittedHeads(invitation.guests), pass?.admittedCount ?? 0),
    allowance
  );
  const summary = summarize(admitted, allowance, { wasReset: opts.wasReset });

  if (pass && pass.admittedCount !== summary.admittedCount) {
    await tx.guestPass.update({
      where: { id: pass.id },
      data: {
        admittedCount: summary.admittedCount,
        status:
          summary.admittedCount <= 0
            ? "ACTIVE"
            : summary.admittedCount >= allowance
              ? "ADMITTED"
              : "PARTIALLY_ADMITTED",
      },
    });
  }

  const relock = opts.wasReset && admitted === 0;
  await tx.invitation.update({
    where: { id: invitationId },
    data: {
      admittedCount: summary.admittedCount,
      admissionState: summary.state,
      // Bumping the token version relocks any previously issued portal session.
      ...(relock ? { portalTokenVersion: { increment: 1 } } : {}),
    },
  });

  await tx.admissionEvent.create({
    data: {
      eventId: invitation.eventId,
      invitationId,
      guestId: opts.guestId ?? null,
      action: opts.action,
      admittedQuantity: Math.abs(summary.admittedCount - previous),
      previousAdmittedCount: previous,
      resultingAdmittedCount: summary.admittedCount,
      scannerUserId: opts.scannerUserId ?? null,
      scannerDeviceId: opts.scannerDeviceId ?? null,
      organiserId: opts.organiserId ?? null,
      reason: opts.reason ?? null,
      notes: opts.notes ?? null,
      offlineCreatedAt: opts.offlineCreatedAt ?? null,
      syncedAt: opts.offlineCreatedAt ? new Date() : null,
    },
  });

  return summary;
}

/**
 * Called after the scanner flips a guest to CHECKED_IN. Best-effort: the scan
 * has already succeeded, and the projection is always recomputable, so a failure
 * here never fails the check-in.
 */
export async function syncAdmissionAfterCheckIn(params: {
  invitationId: string;
  guestId: string;
  scannerUserId?: string | null;
  scannerDeviceId?: string | null;
}): Promise<AdmissionSummary | null> {
  try {
    return await prisma.$transaction((tx) =>
      recomputeProjection(tx, params.invitationId, {
        action: "ADMIT",
        guestId: params.guestId,
        scannerUserId: params.scannerUserId,
        scannerDeviceId: params.scannerDeviceId,
      })
    );
  } catch (err) {
    console.error("[admission] syncAdmissionAfterCheckIn failed", err);
    return null;
  }
}

export type ResetScope = "individual" | "selected" | "entire";

export interface ResetAdmissionInput {
  invitationId: string;
  scope: ResetScope;
  /** Required for `individual` / `selected`. */
  guestIds?: string[];
  actorUserId: string;
  actorRole?: string | null;
  reason: string;
  notes?: string | null;
  options?: {
    /** Default false — seating is preserved. */
    releaseSeating?: boolean;
    /** Default false — QR is preserved. */
    regenerateQr?: boolean;
  };
}

const RESET_ACTION: Record<ResetScope, AdmissionAction> = {
  individual: "RESET_INDIVIDUAL",
  selected: "RESET_PARTIAL",
  entire: "RESET_ENTIRE_INVITATION",
};

/**
 * Reset admission for one member, selected members, or the whole invitation.
 * Atomic + concurrency-safe (single transaction). Append-only: never deletes
 * prior admission rows. Locks the portal (relock) only when no admitted head
 * remains.
 */
export async function resetAdmission(
  input: ResetAdmissionInput
): Promise<{ summary: AdmissionSummary; resetGuestIds: string[] }> {
  const { invitationId, scope, actorUserId, reason } = input;
  if (!reason?.trim()) throw new Error("A reason is required to reset admission");
  if (scope !== "entire" && !(input.guestIds && input.guestIds.length)) {
    throw new Error("guestIds are required for individual/selected resets");
  }

  const result = await prisma.$transaction(async (tx) => {
    const invitation = await tx.invitation.findUnique({
      where: { id: invitationId },
      include: { guests: { select: { id: true, status: true } } },
    });
    if (!invitation) throw new Error(`Invitation ${invitationId} not found`);

    const admittedIds = new Set(
      invitation.guests.filter((g) => g.status === "CHECKED_IN").map((g) => g.id)
    );
    const requested =
      scope === "entire"
        ? [...admittedIds]
        : (input.guestIds ?? []).filter((id) => admittedIds.has(id));

    // Idempotent: only act on members that are actually admitted.
    if (requested.length > 0) {
      await tx.guest.updateMany({
        where: { id: { in: requested }, invitationId, status: "CHECKED_IN" },
        // Back to a neutral non-admitted status; RSVP records are untouched.
        data: { status: "INVITED" },
      });

      if (input.options?.releaseSeating) {
        await tx.seatingAssignment.deleteMany({ where: { guestId: { in: requested } } });
      }
      if (input.options?.regenerateQr) {
        for (const gid of requested) {
          await tx.guest.update({ where: { id: gid }, data: { qrToken: randomUUID() } });
        }
      }
    }

    // The pass carries the authoritative head count, so a reset has to clear it
    // too — otherwise the projection would immediately re-derive the old total.
    const pass = await livePass(tx, invitationId);
    if (pass) {
      const remaining =
        scope === "entire"
          ? 0
          : Math.max(
              0,
              pass.admittedCount -
                (await tx.guest.findMany({
                  where: { id: { in: requested } },
                  select: { plusOnes: true },
                })).reduce((sum, g) => sum + 1 + Math.max(0, g.plusOnes ?? 0), 0)
            );
      await tx.guestPass.update({
        where: { id: pass.id },
        data: {
          admittedCount: remaining,
          status: remaining <= 0 ? "ACTIVE" : "PARTIALLY_ADMITTED",
          ...(remaining <= 0 ? { firstAdmittedAt: null, lastAdmittedAt: null } : {}),
        },
      });
    }

    const summary = await recomputeProjection(tx, invitationId, {
      action: RESET_ACTION[scope],
      guestId: scope === "individual" ? requested[0] ?? null : null,
      organiserId: actorUserId,
      reason,
      notes: input.notes ?? null,
      wasReset: true,
    });

    return { summary, resetGuestIds: requested };
  });

  await createAuditLog({
    userId: actorUserId,
    action: "UPDATE",
    entity: "admission",
    entityId: invitationId,
    details: {
      kind: "admission_reset",
      scope,
      reason,
      notes: input.notes ?? null,
      resetGuestIds: result.resetGuestIds,
      resultingAdmittedCount: result.summary.admittedCount,
      releaseSeating: Boolean(input.options?.releaseSeating),
      regenerateQr: Boolean(input.options?.regenerateQr),
    },
  });

  return result;
}

/** Server-verified admission summary for the portal / dashboard. */
export async function getInvitationAdmission(invitationId: string): Promise<
  | (AdmissionSummary & { invitationId: string; postAdmissionEnabled: boolean })
  | null
> {
  const invitation = await prisma.invitation.findUnique({
    where: { id: invitationId },
    include: {
      guests: { select: { status: true, plusOnes: true } },
      event: { select: { admissionSettings: { select: { portalUnlockPolicy: true } } } },
    },
  });
  if (!invitation) return null;
  const pass = await prisma.guestPass.findFirst({
    where: { invitationId, status: { in: [...LIVE_PASS_STATUSES] } },
    orderBy: { tokenVersion: "desc" },
  });
  const allowance = Math.max(
    computeAllowance(invitation.guests, invitation.admissionAllowance),
    pass?.partySize ?? 0
  );
  const wasReset = invitation.admissionState === "ADMISSION_RESET";
  const summary = summarize(
    Math.max(admittedHeads(invitation.guests), pass?.admittedCount ?? 0),
    allowance,
    {
      wasReset,
      terminal:
        invitation.admissionState === "REVOKED" || invitation.admissionState === "EXPIRED"
          ? invitation.admissionState
          : null,
    }
  );

  return {
    ...summary,
    canAccessPortal: applyPortalUnlockPolicy(
      summary,
      invitation.event.admissionSettings?.portalUnlockPolicy ?? "ON_FIRST_ADMISSION"
    ),
    invitationId,
    postAdmissionEnabled: invitation.postAdmissionEnabled,
  };
}

/**
 * Narrow the default "unlock on first admitted head" rule to the organiser's
 * chosen policy. Only ever narrows — never grants access the summary denied.
 */
export function applyPortalUnlockPolicy(
  summary: AdmissionSummary,
  policy: PortalUnlockPolicy
): boolean {
  if (!summary.canAccessPortal) return false;
  if (policy === "MANUAL") return false;
  if (policy === "ON_FULL_ADMISSION") return summary.state === "ADMITTED";
  return true;
}

export interface ApplyPassAdmissionInput {
  passId: string;
  /** CAS guard: the revision the caller based its decision on. */
  expectedRevision: number;
  admitQuantity: number;
  /** Named members the operator ticked off, when the roster was shown. */
  guestIds: string[] | null;
  scannerUserId: string | null;
  scannerDeviceId: string | null;
  offlineCreatedAt: Date | null;
  portalUnlockPolicy: PortalUnlockPolicy;
}

/**
 * Apply an admission to a Guest Entry Pass atomically.
 *
 * Compare-and-swap on `revision` makes concurrent scans safe: the loser gets
 * `null` back and re-reads the true state instead of double-counting a party.
 * Returns null when the pass moved underneath us or vanished.
 */
export async function applyPassAdmission(
  input: ApplyPassAdmissionInput
): Promise<{ pass: GuestPass; summary: AdmissionSummary } | null> {
  return prisma.$transaction(async (tx) => {
    const current = await tx.guestPass.findUnique({ where: { id: input.passId } });
    if (!current || current.revision !== input.expectedRevision) return null;

    const resulting = Math.min(
      current.admittedCount + Math.max(0, input.admitQuantity),
      current.partySize
    );
    const complete = resulting >= current.partySize;
    const now = input.offlineCreatedAt ?? new Date();

    const swap = await tx.guestPass.updateMany({
      where: { id: input.passId, revision: input.expectedRevision },
      data: {
        admittedCount: resulting,
        revision: input.expectedRevision + 1,
        status: complete ? "ADMITTED" : "PARTIALLY_ADMITTED",
        firstAdmittedAt: current.firstAdmittedAt ?? now,
        lastAdmittedAt: now,
      },
    });
    if (swap.count !== 1) return null;

    // Flip the named members the operator selected; when the whole party is in,
    // flip everyone so the legacy guest-level views stay accurate.
    const targetGuestIds = input.guestIds?.length
      ? input.guestIds
      : complete
        ? (
            await tx.guest.findMany({
              where: { invitationId: current.invitationId },
              select: { id: true },
            })
          ).map((g) => g.id)
        : [];

    if (targetGuestIds.length) {
      await tx.guest.updateMany({
        where: {
          id: { in: targetGuestIds },
          invitationId: current.invitationId,
          status: { not: "CHECKED_IN" },
        },
        data: { status: "CHECKED_IN" },
      });
    }

    const invitation = await tx.invitation.findUnique({
      where: { id: current.invitationId },
      include: { guests: { select: { status: true, plusOnes: true } } },
    });
    if (!invitation) return null;

    const allowance = Math.max(
      computeAllowance(invitation.guests, invitation.admissionAllowance),
      current.partySize
    );
    const summary = summarize(resulting, allowance);
    const unlocked = applyPortalUnlockPolicy(summary, input.portalUnlockPolicy);

    await tx.invitation.update({
      where: { id: current.invitationId },
      data: { admittedCount: summary.admittedCount, admissionState: summary.state },
    });

    await tx.admissionEvent.create({
      data: {
        eventId: current.eventId,
        invitationId: current.invitationId,
        guestId: input.guestIds?.length === 1 ? input.guestIds[0] : null,
        action: complete
          ? current.admittedCount > 0
            ? "ADMIT_REMAINING"
            : "ADMIT"
          : "PARTIAL_ADMIT",
        admittedQuantity: resulting - current.admittedCount,
        previousAdmittedCount: current.admittedCount,
        resultingAdmittedCount: resulting,
        scannerUserId: input.scannerUserId,
        scannerDeviceId: input.scannerDeviceId,
        offlineCreatedAt: input.offlineCreatedAt,
        syncedAt: input.offlineCreatedAt ? new Date() : null,
        notes: unlocked ? null : "portal locked by event policy",
      },
    });

    const pass = await tx.guestPass.findUniqueOrThrow({ where: { id: input.passId } });
    return { pass, summary };
  });
}
