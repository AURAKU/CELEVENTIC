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
  applyPortalUnlockPolicy,
  computeAllowance,
  summarize,
  type AdmissionSummary,
} from "@/lib/admission/admission-logic";
import { ADMISSION_QR_TYPES } from "@/lib/qr/qr-types";

export { applyPortalUnlockPolicy } from "@/lib/admission/admission-logic";

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
    return await prisma.$transaction(async (tx) => {
      // A successful gate admit always unlocks Event Companion for this invite.
      await tx.invitation.updateMany({
        where: { id: params.invitationId, postAdmissionEnabled: false },
        data: { postAdmissionEnabled: true },
      });
      return recomputeProjection(tx, params.invitationId, {
        action: "ADMIT",
        guestId: params.guestId,
        scannerUserId: params.scannerUserId,
        scannerDeviceId: params.scannerDeviceId,
      });
    });
  } catch (err) {
    console.error("[admission] syncAdmissionAfterCheckIn failed", err);
    return null;
  }
}

/**
 * Force the invitation's admitted head count to an exact number.
 *
 * Both views of the truth are written together — the pass (authoritative) and
 * the guest rows (what the legacy dashboards read) — so the projection lands on
 * the requested figure instead of re-deriving the old one. Guests are flipped
 * in list order, which keeps a correction stable and repeatable.
 */
async function applyExactAdmittedCount(
  tx: Tx,
  invitationId: string,
  target: number
): Promise<number> {
  const invitation = await tx.invitation.findUnique({
    where: { id: invitationId },
    include: {
      guests: {
        select: { id: true, status: true, plusOnes: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!invitation) throw new Error(`Invitation ${invitationId} not found`);

  const pass = await livePass(tx, invitationId);
  const allowance = Math.max(
    computeAllowance(invitation.guests, invitation.admissionAllowance),
    pass?.partySize ?? 0
  );
  const clamped = Math.max(0, Math.min(Math.trunc(target), allowance));

  const admit: string[] = [];
  const release: string[] = [];
  let heads = 0;
  for (const guest of invitation.guests) {
    const cost = 1 + Math.max(0, guest.plusOnes ?? 0);
    if (heads + cost <= clamped) {
      heads += cost;
      admit.push(guest.id);
    } else {
      release.push(guest.id);
    }
  }

  if (admit.length) {
    await tx.guest.updateMany({
      where: { id: { in: admit }, invitationId, status: { not: "CHECKED_IN" } },
      data: { status: "CHECKED_IN" },
    });
  }
  if (release.length) {
    await tx.guest.updateMany({
      where: { id: { in: release }, invitationId, status: "CHECKED_IN" },
      data: { status: "INVITED" },
    });
  }

  if (pass) {
    await tx.guestPass.update({
      where: { id: pass.id },
      data: {
        admittedCount: clamped,
        revision: { increment: 1 },
        status:
          clamped <= 0 ? "ACTIVE" : clamped >= allowance ? "ADMITTED" : "PARTIALLY_ADMITTED",
        ...(clamped <= 0 ? { firstAdmittedAt: null, lastAdmittedAt: null } : {}),
      },
    });
  }

  return clamped;
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
 * prior admission event rows. Locks the portal (relock) only when no admitted
 * head remains, bumps portalTokenVersion so the invite link plays the intro
 * again, and clears VALID gate scans so QR / manual code admit like first entry.
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
      include: {
        guests: {
          select: {
            id: true,
            status: true,
            inviteOpenedAt: true,
            rsvps: { orderBy: { createdAt: "desc" }, take: 1, select: { response: true } },
          },
        },
      },
    });
    if (!invitation) throw new Error(`Invitation ${invitationId} not found`);

    const admittedIds = new Set(
      invitation.guests.filter((g) => g.status === "CHECKED_IN").map((g) => g.id)
    );
    const requested =
      scope === "entire"
        ? invitation.guests.map((g) => g.id)
        : [...new Set(input.guestIds ?? [])];
    const toUncheck = requested.filter((id) => admittedIds.has(id));

    // Idempotent: only act on members that are actually admitted.
    if (toUncheck.length > 0) {
      for (const guest of invitation.guests.filter((g) => toUncheck.includes(g.id))) {
        const rsvp = guest.rsvps[0]?.response;
        const restoredStatus: GuestStatus =
          rsvp === "ACCEPTED" || rsvp === "DECLINED" || rsvp === "MAYBE"
            ? rsvp
            : guest.inviteOpenedAt
              ? "OPENED"
              : "INVITED";
        await tx.guest.update({
          where: { id: guest.id },
          data: { status: restoredStatus },
        });
      }

      if (input.options?.releaseSeating) {
        await tx.seatingAssignment.deleteMany({ where: { guestId: { in: toUncheck } } });
      }
      if (input.options?.regenerateQr) {
        for (const gid of toUncheck) {
          await tx.guest.update({ where: { id: gid }, data: { qrToken: randomUUID() } });
        }
      }
    }

    // Clear VALID admission scans so re-entry QR / 4-digit code behave like
    // a first admit (otherwise ALREADY_USED blocks the gate).
    const scanGuestIds = scope === "entire" ? invitation.guests.map((g) => g.id) : requested;
    if (scanGuestIds.length > 0) {
      const admissionQrs = await tx.qrCode.findMany({
        where: {
          eventId: invitation.eventId,
          guestId: { in: scanGuestIds },
          type: { in: [...ADMISSION_QR_TYPES] },
        },
        select: { id: true },
      });
      if (admissionQrs.length > 0) {
        await tx.qrScan.deleteMany({
          where: {
            eventId: invitation.eventId,
            qrCodeId: { in: admissionQrs.map((q) => q.id) },
            result: "VALID",
          },
        });
      }
    }

    // The pass carries the authoritative head count, so a reset has to clear it
    // too, otherwise the projection would immediately re-derive the old total.
    // Quantity-only admits may leave guests as INVITED while pass.admittedCount > 0.
    const pass = await livePass(tx, invitationId);
    if (pass) {
      let remaining = pass.admittedCount;
      if (scope === "entire") {
        remaining = 0;
      } else if (requested.length > 0) {
        const heads = await tx.guest.findMany({
          where: { id: { in: requested }, invitationId },
          select: { plusOnes: true },
        });
        const subtract =
          heads.length > 0
            ? heads.reduce((sum, g) => sum + 1 + Math.max(0, g.plusOnes ?? 0), 0)
            : requested.length;
        remaining = Math.max(0, pass.admittedCount - subtract);
      }
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

    return { summary, resetGuestIds: toUncheck.length ? toUncheck : requested };
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

/* -------------------------------------------------------------------------- */
/*  Organiser corrections                                                      */
/* -------------------------------------------------------------------------- */

export type CorrectionAction =
  | "undo_last"
  | "correct_quantity"
  | "readmit"
  | "move_seat"
  | "restore_seat";

export interface CorrectAdmissionInput {
  invitationId: string;
  action: CorrectionAction;
  actorUserId: string;
  reason: string;
  notes?: string | null;
  /** `correct_quantity` — the exact number of heads that should be inside. */
  quantity?: number;
  /** `move_seat` / `restore_seat` — the member being seated. Omit to move all. */
  guestId?: string | null;
  /** `move_seat` / `restore_seat` — destination. */
  tableNumber?: string | null;
  seatLabel?: string | null;
}

const CORRECTION_ACTION: Record<CorrectionAction, AdmissionAction> = {
  undo_last: "CORRECTION",
  correct_quantity: "CORRECTION",
  readmit: "READMIT",
  move_seat: "CORRECTION",
  restore_seat: "RESTORE",
};

/**
 * Organiser corrections on an admitted party.
 *
 * Every branch is append-only: the ledger keeps the mistaken row *and* the
 * correction, so "what actually happened at the door" is always reconstructable.
 * The portal relocks only when a correction brings the admitted count back to
 * zero, which is the same rule a reset uses.
 */
export async function correctAdmission(
  input: CorrectAdmissionInput
): Promise<AdmissionSummary> {
  const { invitationId, action, actorUserId } = input;
  if (!input.reason?.trim()) throw new Error("A reason is required to correct admission");

  const summary = await prisma.$transaction(async (tx) => {
    const invitation = await tx.invitation.findUnique({
      where: { id: invitationId },
      include: { guests: { select: { id: true, plusOnes: true } } },
    });
    if (!invitation) throw new Error(`Invitation ${invitationId} not found`);

    const pass = await livePass(tx, invitationId);
    const allowance = Math.max(
      computeAllowance(invitation.guests, invitation.admissionAllowance),
      pass?.partySize ?? 0
    );
    const current = Math.max(invitation.admittedCount, pass?.admittedCount ?? 0);

    let target = current;

    switch (action) {
      case "undo_last": {
        // Undo the most recent *admitting* row. Reversals and resets are
        // skipped so pressing undo twice walks back two real admissions
        // rather than undoing the previous undo.
        const last = await tx.admissionEvent.findFirst({
          where: {
            invitationId,
            action: { in: ["ADMIT", "PARTIAL_ADMIT", "ADMIT_REMAINING", "READMIT"] },
            admittedQuantity: { gt: 0 },
          },
          orderBy: { createdAt: "desc" },
        });
        if (!last) throw new Error("There is no admission to undo on this invitation");
        target = Math.max(0, current - last.admittedQuantity);
        break;
      }
      case "correct_quantity": {
        if (typeof input.quantity !== "number" || input.quantity < 0) {
          throw new Error("A corrected quantity is required");
        }
        if (input.quantity > allowance) {
          throw new Error(
            `This invitation admits ${allowance}. Widen the party allowance before admitting more.`
          );
        }
        target = input.quantity;
        break;
      }
      case "readmit":
        target = allowance;
        break;
      case "move_seat":
      case "restore_seat": {
        if (!input.tableNumber?.trim()) {
          throw new Error("A destination table is required");
        }
        const guestIds = input.guestId
          ? [input.guestId]
          : invitation.guests.map((g) => g.id);

        // A restore needs a plan to attach to. Reuse the party's existing plan
        // when there is one; otherwise fall back to the event's only plan.
        const anchor = await tx.seatingAssignment.findFirst({
          where: { guestId: { in: invitation.guests.map((g) => g.id) } },
          select: { seatingPlanId: true },
        });
        const seatingPlanId =
          anchor?.seatingPlanId ??
          (await tx.seatingPlan.findFirst({
            where: { eventId: invitation.eventId },
            select: { id: true },
          }))?.id;
        if (!seatingPlanId) throw new Error("This event has no seating plan to restore into");

        for (const guestId of guestIds) {
          await tx.seatingAssignment.upsert({
            where: { guestId },
            create: {
              seatingPlanId,
              guestId,
              tableNumber: input.tableNumber,
              seatLabel: input.seatLabel ?? null,
            },
            update: {
              tableNumber: input.tableNumber,
              // Moving a whole group to a table clears per-seat labels, which
              // would otherwise point at seats on the old table.
              seatLabel: input.guestId ? (input.seatLabel ?? null) : null,
            },
          });
        }
        break;
      }
    }

    if (target !== current) {
      await applyExactAdmittedCount(tx, invitationId, target);
    }

    return recomputeProjection(tx, invitationId, {
      action: CORRECTION_ACTION[action],
      guestId: input.guestId ?? null,
      organiserId: actorUserId,
      reason: input.reason,
      notes: input.notes ?? null,
      wasReset: target === 0 && target !== current,
    });
  });

  await createAuditLog({
    userId: actorUserId,
    action: "UPDATE",
    entity: "admission",
    entityId: invitationId,
    details: {
      kind: "admission_correction",
      correction: action,
      reason: input.reason,
      notes: input.notes ?? null,
      quantity: input.quantity ?? null,
      guestId: input.guestId ?? null,
      tableNumber: input.tableNumber ?? null,
      seatLabel: input.seatLabel ?? null,
      resultingAdmittedCount: summary.admittedCount,
    },
  });

  return summary;
}

/** Append-only admission history for the organiser's correction panel. */
export async function getAdmissionHistory(invitationId: string, limit = 50) {
  return prisma.admissionEvent.findMany({
    where: { invitationId },
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(1, limit), 200),
    select: {
      id: true,
      action: true,
      admittedQuantity: true,
      previousAdmittedCount: true,
      resultingAdmittedCount: true,
      reason: true,
      notes: true,
      scannerDeviceId: true,
      offlineCreatedAt: true,
      createdAt: true,
    },
  });
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
      data: {
        admittedCount: summary.admittedCount,
        admissionState: summary.state,
        // Gate admit must unlock companion on the invite link (bare URL /
        // handoff poll). Issuance usually sets this already; reinforce here
        // so a successful admit can never leave the guest stuck on ceremony.
        postAdmissionEnabled: true,
      },
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
