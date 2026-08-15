/**
 * Persist guest RSVP so refresh / reopen keeps the thank-you state —
 * never re-open Accept/Decline after a real reply.
 */

export type PersistedRsvpChoice = "ACCEPTED" | "DECLINED" | "MAYBE";

export interface PersistedRsvpState {
  status: PersistedRsvpChoice;
  attendingCount: number;
}

function storageKey(invitationId: string, guestId?: string | null) {
  return `celeventic:rsvp:${invitationId}:${guestId?.trim() || "anon"}`;
}

export function normalizeRsvpChoice(value: unknown): PersistedRsvpChoice | null {
  if (value === "ACCEPTED" || value === "DECLINED" || value === "MAYBE") return value;
  if (value === "CHECKED_IN") return "ACCEPTED";
  return null;
}

/** Reconstruct confirmed heads after RSVP applied plusOnes on the party. */
export function confirmedAttendingFromParty(
  guests: Array<{ plusOnes?: number | null }> | null | undefined
): number {
  if (!guests?.length) return 1;
  return Math.max(
    1,
    guests.reduce((sum, guest) => sum + 1 + Math.max(0, guest.plusOnes ?? 0), 0)
  );
}

export function rsvpChoiceFromGuest(guest: {
  status?: string | null;
  rsvps?: Array<{ response?: string | null }> | null;
}): PersistedRsvpChoice | null {
  const fromRsvp = normalizeRsvpChoice(guest.rsvps?.[0]?.response);
  if (fromRsvp) return fromRsvp;
  return normalizeRsvpChoice(guest.status);
}

export function readPersistedRsvp(
  invitationId: string,
  guestId?: string | null
): PersistedRsvpState | null {
  if (typeof window === "undefined" || !invitationId) return null;
  try {
    const raw = window.localStorage.getItem(storageKey(invitationId, guestId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedRsvpState>;
    const status = normalizeRsvpChoice(parsed.status);
    if (!status) return null;
    const attendingCount = Math.max(1, Math.trunc(Number(parsed.attendingCount) || 1));
    return { status, attendingCount };
  } catch {
    return null;
  }
}

export function writePersistedRsvp(
  invitationId: string,
  guestId: string | null | undefined,
  state: PersistedRsvpState
): void {
  if (typeof window === "undefined" || !invitationId) return;
  try {
    window.localStorage.setItem(
      storageKey(invitationId, guestId),
      JSON.stringify({
        status: state.status,
        attendingCount: Math.max(1, Math.trunc(state.attendingCount || 1)),
      })
    );
  } catch {
    // Private mode / quota — server status still wins on next personalized open.
  }
}
