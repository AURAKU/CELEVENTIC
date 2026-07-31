import type { AdmissionState, PortalUnlockPolicy } from "@prisma/client";

/**
 * Pure admission arithmetic + state derivation for the Post-Admission Guest
 * Experience. No Prisma / IO here so it is fully unit-testable and reused by
 * both the service (server) and any client projection.
 *
 * Counting model (approved): a party's allowance = number of guest rows + their
 * plus-ones. `admittedCount` is a quantity in [0, allowance].
 */

export interface PartyMemberLike {
  /** Extra heads this guest row admits beyond themselves. */
  plusOnes?: number | null;
}

/** Total party allowance: stored override if set, else guests + plus-ones. */
export function computeAllowance(
  members: PartyMemberLike[],
  storedAllowance?: number | null
): number {
  if (typeof storedAllowance === "number" && storedAllowance > 0) {
    return storedAllowance;
  }
  const derived = members.reduce(
    (sum, m) => sum + 1 + Math.max(0, m.plusOnes ?? 0),
    0
  );
  return Math.max(0, derived);
}

/**
 * Guest-facing / gate capacity for one invitation.
 *
 * Organiser `admissionAllowance` always wins. A stale GuestPass.partySize must
 * never inflate the place-card copy or gate beyond what the organiser set.
 * Pass size is only a fallback when no stored allowance and no guest rows yet.
 */
export function resolveInvitationAllowance(
  members: PartyMemberLike[],
  storedAllowance?: number | null,
  passPartySize?: number | null
): number {
  if (typeof storedAllowance === "number" && storedAllowance > 0) {
    return Math.max(1, Math.trunc(storedAllowance));
  }
  const derived = computeAllowance(members, null);
  if (derived > 0) return derived;
  if (typeof passPartySize === "number" && passPartySize > 0) {
    return Math.max(1, Math.trunc(passPartySize));
  }
  return 1;
}

/** Clamp a proposed admitted count into the valid [0, allowance] range. */
export function clampAdmitted(next: number, allowance: number): number {
  if (!Number.isFinite(next)) return 0;
  return Math.max(0, Math.min(Math.trunc(next), Math.max(0, allowance)));
}

/**
 * Derive the durable admission state from the count.
 * `wasReset` distinguishes a fresh invite (NOT_ADMITTED) from one that reached
 * zero via an explicit reset (ADMISSION_RESET) — both lock the portal, but the
 * distinction is surfaced to organisers, never to guests.
 */
export function deriveAdmissionState(
  admittedCount: number,
  allowance: number,
  opts?: { wasReset?: boolean; terminal?: AdmissionState | null }
): AdmissionState {
  // Terminal states (REVOKED / EXPIRED / EXITED / MANUAL_REVIEW) always win.
  if (opts?.terminal) return opts.terminal;
  if (allowance <= 0) return "NOT_ADMITTED";
  if (admittedCount <= 0) return opts?.wasReset ? "ADMISSION_RESET" : "NOT_ADMITTED";
  if (admittedCount >= allowance) return "ADMITTED";
  return "PARTIALLY_ADMITTED";
}

/** Portal unlocks only when at least one head is currently admitted. */
export function canAccessPortal(state: AdmissionState): boolean {
  return state === "ADMITTED" || state === "PARTIALLY_ADMITTED";
}

/** Terminal states that must always deny portal access regardless of count. */
export function isTerminalDenied(state: AdmissionState): boolean {
  return state === "REVOKED" || state === "EXPIRED";
}

export interface AdmissionSummary {
  allowance: number;
  admittedCount: number;
  remainingCount: number;
  state: AdmissionState;
  canAccessPortal: boolean;
}

export function summarize(
  admittedCount: number,
  allowance: number,
  opts?: { wasReset?: boolean; terminal?: AdmissionState | null }
): AdmissionSummary {
  const clamped = clampAdmitted(admittedCount, allowance);
  const state = deriveAdmissionState(clamped, allowance, opts);
  return {
    allowance,
    admittedCount: clamped,
    remainingCount: Math.max(0, allowance - clamped),
    state,
    canAccessPortal: canAccessPortal(state) && !isTerminalDenied(state),
  };
}

/**
 * Narrow the default "unlock on first admitted head" rule to the organiser's
 * chosen policy. Only ever narrows — never grants access the summary denied.
 * RSVP / invite-open never reach here with admittedCount > 0.
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
