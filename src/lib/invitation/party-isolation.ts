/**
 * Invitation-party isolation helpers.
 *
 * Canonical party ownership in Celeventic is the `Invitation` row
 * (`uniqueLink` → guests / seats / passes via `invitationId`).
 * Never infer a party from eventId, table number, surname, or shared session.
 */

export type PartyAdmissionView = "invitation" | "event-access";

export interface PartyMembership {
  guestInvitationId: string | null | undefined;
  invitationId: string;
}

/** True only when the guest row is explicitly owned by this invitation. */
export function guestBelongsToInvitation(input: PartyMembership): boolean {
  const guestParty = input.guestInvitationId?.trim();
  if (!guestParty) return false;
  return guestParty === input.invitationId;
}

/**
 * Decide whether the bare invite link should skip ceremony and open companion.
 *
 * Shared party links stay on the invitation while anyone remains awaiting.
 * Member-specific tokens open companion only when that member is admitted.
 * Fully admitted parties always open companion (unless ?view=invite).
 */
export function shouldDefaultToEventAccess(input: {
  postAdmissionEnabled: boolean;
  canAccessPortal: boolean;
  admittedCount: number;
  remainingCount?: number;
  state?: string | null;
  /** Known only when a member-specific guest token resolved on this invitation. */
  viewerAdmitted?: boolean | null;
}): boolean {
  if (!input.postAdmissionEnabled || !input.canAccessPortal) return false;
  if (input.admittedCount <= 0) return false;

  if (input.viewerAdmitted === true) return true;
  if (input.viewerAdmitted === false) return false;

  if (input.state === "ADMITTED") return true;
  if (input.remainingCount !== undefined && input.remainingCount <= 0) return true;

  // Shared link + partial admission → stay on invitation with Event Access CTA.
  return false;
}

/** Human-readable party progress for guest surfaces (never alarming). */
export function formatPartyAdmissionProgress(
  admittedCount: number,
  allowance: number
): { headline: string; detail: string | null; awaitingCount: number } {
  const total = Math.max(1, Math.trunc(allowance));
  const admitted = Math.max(0, Math.min(Math.trunc(admittedCount), total));
  const awaiting = Math.max(0, total - admitted);
  const headline = `${admitted} of ${total} guests admitted`;
  const detail =
    awaiting <= 0
      ? null
      : awaiting === 1
        ? "1 guest is still awaiting admission."
        : `${awaiting} guests are still awaiting admission.`;
  return { headline, detail, awaitingCount: awaiting };
}

/**
 * Filter seat/member rows to a single invitation party.
 * Drop any row whose invitationId does not match (defense in depth).
 */
export function filterPartyOwnedRows<T extends { invitationId?: string | null }>(
  rows: T[],
  invitationId: string
): T[] {
  return rows.filter((row) => {
    if (row.invitationId == null) return true; // already invitation-scoped query
    return row.invitationId === invitationId;
  });
}
