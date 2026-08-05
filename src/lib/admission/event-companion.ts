/**
 * Event Companion (post-admission) URL helpers.
 *
 * Product rule:
 * - Opening an invite (WhatsApp / social / browser) or RSVP accept/decline
 *   is NEVER admission. Those signals help organisers plan seating only.
 * - The ceremony always plays from the start on the bare invite link until
 *   the gate admits the party (QR scan or manual admission code).
 * - Only then does the bare link unlock Event Companion. Guests may still
 *   reopen the ceremony via `?view=invite` while admitted; after a reset,
 *   the bare invite link plays the full intro again.
 */
import type {
  PartySeat,
  SeatingContinuity,
} from "@/lib/admission/seating-continuity";
import { shouldDefaultToEventAccess } from "@/lib/invitation/party-isolation";

export interface CompanionPlace {
  tableNumber: string;
  seatLabel: string | null;
  zone: string | null;
}

/**
 * Resolve the real place shown by the post-admission companion.
 *
 * The personalized guest assignment wins. Party/continuity seats are fallbacks
 * for an admitted invitation opened without an individual guest token.
 */
export function resolveCompanionPlace(
  seat: CompanionPlace | null,
  partySeats: PartySeat[] = [],
  continuity: SeatingContinuity | null = null
): { place: CompanionPlace | null; allocatedSeats: PartySeat[] } {
  const allocatedSeats =
    partySeats.length > 0
      ? partySeats
      : continuity?.revealed?.length
        ? continuity.revealed
        : [];
  const continuitySeat = continuity?.tableNumber
    ? allocatedSeats.find((candidate) => candidate.tableNumber === continuity.tableNumber)
    : null;
  const fallbackSeat = continuitySeat ?? allocatedSeats[0] ?? null;

  return {
    place:
      seat ??
      (continuity?.tableNumber
        ? {
            tableNumber: continuity.tableNumber,
            seatLabel: continuitySeat?.seatLabel ?? null,
            zone: continuitySeat?.zone ?? null,
          }
        : fallbackSeat
          ? {
              tableNumber: fallbackSeat.tableNumber,
              seatLabel: fallbackSeat.seatLabel,
              zone: fallbackSeat.zone,
            }
          : null),
    allocatedSeats,
  };
}

export function buildEventCompanionHref(
  uniqueLink: string,
  guestQrToken?: string | null
): string {
  const base = `/invite/${encodeURIComponent(uniqueLink)}/event-day`;
  const token = guestQrToken?.trim();
  return token ? `${base}?guest=${encodeURIComponent(token)}` : base;
}

/**
 * Invitation ceremony URL — used from Event Companion "View invitation".
 * `view=invite` prevents the admitted-guest redirect back to companion.
 */
export function buildInviteCeremonyHref(
  uniqueLink: string,
  guestQrToken?: string | null
): string {
  const params = new URLSearchParams();
  params.set("view", "invite");
  const token = guestQrToken?.trim();
  if (token) params.set("guest", token);
  return `/invite/${encodeURIComponent(uniqueLink)}?${params.toString()}`;
}

/** True when the guest explicitly asked to reopen the invitation ceremony. */
export function wantsInviteCeremonyView(
  searchParams: { view?: string | null } | null | undefined
): boolean {
  const view = searchParams?.view?.trim().toLowerCase();
  return view === "invite" || view === "ceremony";
}

/**
 * True when the bare invite link should skip ceremony and open companion only.
 * Requires real gate admission (`admittedCount > 0` from CHECKED_IN / pass
 * admit) — OPENED / ACCEPTED alone never satisfy this.
 *
 * Partial admission on a shared party link keeps the invitation available;
 * only fully admitted parties (or an admitted member-specific viewer) jump.
 */
export function shouldOpenEventCompanionOnly(admission: {
  postAdmissionEnabled: boolean;
  canAccessPortal: boolean;
  admittedCount?: number;
  remainingCount?: number;
  state?: string | null;
  viewerAdmitted?: boolean | null;
} | null | undefined): boolean {
  if (!admission) return false;
  return shouldDefaultToEventAccess({
    postAdmissionEnabled: admission.postAdmissionEnabled,
    canAccessPortal: admission.canAccessPortal,
    admittedCount: admission.admittedCount ?? 0,
    remainingCount: admission.remainingCount,
    state: admission.state,
    viewerAdmitted: admission.viewerAdmitted,
  });
}

export type PartyAdmissionSurface = {
  admittedCount: number;
  allowance: number;
  state?: string | null;
  companionHref: string;
};

/**
 * Build the partial-admission Event Access surface for the invitation page.
 *
 * Auto-handoff (silent jump to companion) stays off when the guest explicitly
 * reopened the ceremony (`preferInviteCeremony` / `?view=invite`).
 * The manual “View Event Access” CTA must still work in that mode whenever
 * at least one party member has been admitted.
 */
export function resolvePartyAdmissionSurface(input: {
  portalEnabled: boolean;
  preferInviteCeremony: boolean;
  eventAccessHref: string | null;
  admittedCount: number;
  allowance: number;
  state?: string | null;
}): {
  companionHandoffHref: string | null;
  partyAdmission: PartyAdmissionSurface | null;
} {
  const eventAccessHref = input.eventAccessHref?.trim() || null;
  const companionHandoffHref =
    input.portalEnabled && eventAccessHref && !input.preferInviteCeremony
      ? eventAccessHref
      : null;
  const partyAdmission =
    input.portalEnabled &&
    eventAccessHref &&
    input.admittedCount > 0
      ? {
          admittedCount: input.admittedCount,
          allowance: input.allowance,
          state: input.state ?? null,
          companionHref: eventAccessHref,
        }
      : null;
  return { companionHandoffHref, partyAdmission };
}
