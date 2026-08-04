/**
 * Invitation-party isolation helpers.
 *
 * Canonical party ownership in Celeventic is the `Invitation` row
 * (`uniqueLink` → guests / seats / passes via `invitationId`).
 * Never infer a party from eventId, table number, surname, or shared session.
 */

import { cleanName, nameKey } from "@/lib/guest-import/name";

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

function namesMatch(a: string, b: string): boolean {
  const ka = nameKey(a);
  const kb = nameKey(b);
  if (!ka || !kb) return false;
  if (ka === kb) return true;
  if (ka.length >= 8 && kb.length >= 8 && (ka.includes(kb) || kb.includes(ka))) {
    return true;
  }
  return false;
}

/**
 * Drop guests that clearly belong to a *different* invitation on the same event.
 *
 * Used on public invite / seat / companion surfaces so polluted `invitationId`
 * links cannot expose “The OBUAH Family” inside “Akua & Kelly” (and vice versa)
 * even before the organiser runs the repair script.
 *
 * Never drops a guest that also matches the current invitation’s display name
 * (legitimate primary invitee / family label).
 */
export function filterForeignPartyGuests<T extends { name: string; invitationId?: string | null }>(
  guests: T[],
  input: {
    invitationId: string;
    invitationName: string;
    otherInvitationNames: Array<{ id: string; name: string }>;
  }
): T[] {
  const ownName = cleanName(input.invitationName);
  return guests.filter((guest) => {
    if (
      guest.invitationId != null &&
      guest.invitationId.trim() &&
      guest.invitationId !== input.invitationId
    ) {
      return false;
    }

    const guestName = cleanName(guest.name);
    if (!guestName || guestName.length < 2) return true;
    if (ownName && namesMatch(guestName, ownName)) return true;

    const foreign = input.otherInvitationNames.some(
      (other) => other.id !== input.invitationId && namesMatch(guestName, other.name)
    );
    return !foreign;
  });
}

/**
 * True when a display string uniquely matches another invitation’s party label
 * and does not match the current invitation.
 */
export function looksLikeForeignPartyLabel(
  candidate: string | null | undefined,
  invitationName: string,
  otherInvitationNames: string[]
): boolean {
  const value = cleanName(candidate ?? "");
  if (!value) return false;
  if (namesMatch(value, invitationName)) return false;
  return otherInvitationNames.some((name) => namesMatch(value, name));
}

/** Canonical public party display name — never GuestGroup, never another invite. */
export function resolvePublicPartyDisplayName(input: {
  invitationName: string;
  passDisplayName?: string | null;
  tokenGuestName?: string | null;
  otherInvitationNames?: string[];
}): string {
  const invitationName = cleanName(input.invitationName);
  const others = input.otherInvitationNames ?? [];

  const pass = cleanName(input.passDisplayName ?? "");
  if (pass && !looksLikeForeignPartyLabel(pass, invitationName, others)) {
    return pass;
  }

  return invitationName || pass || cleanName(input.tokenGuestName ?? "") || "Invited guest";
}
