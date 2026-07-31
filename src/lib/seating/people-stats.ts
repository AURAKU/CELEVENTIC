/**
 * People vs invitation-record statistics for seating studio.
 * Never treat invitation-record count as expected guest count.
 */

export type GuestCountSource = "MAXIMUM_INVITED" | "RSVP_CONFIRMED" | "CUSTOM";

export interface PartyPeopleInput {
  id?: string;
  invitationId: string | null;
  partySize: number;
  status?: string | null;
  admission?: { allowance: number; admittedCount: number } | null;
}

export interface PeopleSeatingStats {
  invitationRecords: number;
  personalisedInvitations: number;
  groupInvitations: number;
  acceptedInvitations: number;
  openedInvitations: number;
  maximumInvitedPeople: number;
  rsvpConfirmedPeople: number;
  expectedPeople: number;
  assignedPeople: number;
  unassignedPeople: number;
  admittedPeople: number;
  remainingExpectedPeople: number;
}

const RSVP_CONFIRMED = new Set(["ACCEPTED", "CHECKED_IN", "MAYBE"]);

export function resolvePartyAllowance(guest: PartyPeopleInput): number {
  return Math.max(
    1,
    guest.admission?.allowance ?? guest.partySize ?? 1
  );
}

/**
 * Deduplicate by invitation so a family of 5 counts as 5 people once,
 * not 5 × partySize when multiple named members exist.
 */
export function computePeopleRepresented(guests: PartyPeopleInput[]): number {
  const byInvitation = new Map<string, number>();
  let solo = 0;
  for (const guest of guests) {
    const allowance = resolvePartyAllowance(guest);
    if (!guest.invitationId) {
      solo += allowance;
      continue;
    }
    const current = byInvitation.get(guest.invitationId) ?? 0;
    byInvitation.set(guest.invitationId, Math.max(current, allowance));
  }
  let total = solo;
  for (const value of byInvitation.values()) total += value;
  return total;
}

export function computeRsvpConfirmedPeople(guests: PartyPeopleInput[]): number {
  const byInvitation = new Map<string, { allowance: number; confirmed: boolean }>();
  let solo = 0;
  for (const guest of guests) {
    const allowance = resolvePartyAllowance(guest);
    const confirmed = RSVP_CONFIRMED.has(guest.status ?? "");
    if (!guest.invitationId) {
      if (confirmed) solo += allowance;
      continue;
    }
    const current = byInvitation.get(guest.invitationId) ?? { allowance: 0, confirmed: false };
    byInvitation.set(guest.invitationId, {
      allowance: Math.max(current.allowance, allowance),
      confirmed: current.confirmed || confirmed,
    });
  }
  let total = solo;
  for (const row of byInvitation.values()) {
    if (row.confirmed) total += row.allowance;
  }
  return total;
}

export function computePeopleSeatingStats(input: {
  guests: PartyPeopleInput[];
  assignedGuestIds: Set<string>;
  guestCountSource?: GuestCountSource;
  customExpected?: number;
}): PeopleSeatingStats {
  const invitations = new Map<string, PartyPeopleInput[]>();
  let personalised = 0;
  for (const guest of input.guests) {
    if (!guest.invitationId) {
      personalised += 1;
      continue;
    }
    const list = invitations.get(guest.invitationId) ?? [];
    list.push(guest);
    invitations.set(guest.invitationId, list);
  }

  let accepted = 0;
  let opened = 0;
  let groupInvitations = 0;
  for (const members of invitations.values()) {
    const allowance = Math.max(...members.map(resolvePartyAllowance));
    if (allowance > 1) groupInvitations += 1;
    if (members.some((m) => m.status === "ACCEPTED" || m.status === "CHECKED_IN")) accepted += 1;
    if (members.some((m) => m.status === "OPENED" || m.status === "ACCEPTED" || m.status === "CHECKED_IN")) {
      opened += 1;
    }
  }

  const maximumInvitedPeople = computePeopleRepresented(input.guests);
  const rsvpConfirmedPeople = computeRsvpConfirmedPeople(input.guests);
  const source = input.guestCountSource ?? "MAXIMUM_INVITED";
  const expectedPeople =
    source === "CUSTOM"
      ? Math.max(0, Math.trunc(input.customExpected ?? maximumInvitedPeople))
      : source === "RSVP_CONFIRMED"
        ? rsvpConfirmedPeople
        : maximumInvitedPeople;

  // Assigned people: sum party allowances for invitations that have any member seated.
  const seatedInvitation = new Set<string>();
  let assignedSolo = 0;
  for (const guest of input.guests) {
    if (!guest.id || !input.assignedGuestIds.has(guest.id)) continue;
    if (!guest.invitationId) {
      assignedSolo += resolvePartyAllowance(guest);
      continue;
    }
    seatedInvitation.add(guest.invitationId);
  }
  let assignedPeople = assignedSolo;
  for (const invitationId of seatedInvitation) {
    const members = invitations.get(invitationId) ?? [];
    assignedPeople += maxAllowance(members);
  }

  const admittedPeople = input.guests.reduce((sum, guest) => {
    if (!guest.invitationId) return sum + (guest.admission?.admittedCount ?? (guest.status === "CHECKED_IN" ? 1 : 0));
    return sum;
  }, 0);
  // Deduplicate invitation admitted counts
  const admittedByInvitation = new Map<string, number>();
  for (const guest of input.guests) {
    if (!guest.invitationId) continue;
    const count = guest.admission?.admittedCount ?? (guest.status === "CHECKED_IN" ? 1 : 0);
    admittedByInvitation.set(
      guest.invitationId,
      Math.max(admittedByInvitation.get(guest.invitationId) ?? 0, count)
    );
  }
  let admittedTotal = 0;
  for (const guest of input.guests) {
    if (guest.invitationId) continue;
    admittedTotal += guest.admission?.admittedCount ?? (guest.status === "CHECKED_IN" ? 1 : 0);
  }
  for (const value of admittedByInvitation.values()) admittedTotal += value;

  return {
    invitationRecords: invitations.size + personalised,
    personalisedInvitations: personalised,
    groupInvitations,
    acceptedInvitations: accepted,
    openedInvitations: opened,
    maximumInvitedPeople,
    rsvpConfirmedPeople,
    expectedPeople,
    assignedPeople,
    unassignedPeople: Math.max(0, expectedPeople - assignedPeople),
    admittedPeople: admittedTotal,
    remainingExpectedPeople: Math.max(0, expectedPeople - admittedTotal),
  };
}

function maxAllowance(members: PartyPeopleInput[]): number {
  if (!members.length) return 0;
  return Math.max(...members.map(resolvePartyAllowance));
}

export function requiredTablesForPeople(people: number, seatsPerTable: number): {
  tables: number;
  capacity: number;
  spare: number;
} {
  const per = Math.max(1, Math.trunc(seatsPerTable) || 8);
  const need = Math.max(0, Math.trunc(people));
  const tables = need === 0 ? 0 : Math.ceil(need / per);
  const capacity = tables * per;
  return { tables, capacity, spare: Math.max(0, capacity - need) };
}

const CRM_STATUS_PRIORITY: Record<string, number> = {
  CHECKED_IN: 60,
  ACCEPTED: 50,
  MAYBE: 40,
  DECLINED: 30,
  OPENED: 20,
  INVITED: 10,
};

export interface GuestCrmPeopleStats {
  /** Expected heads (admission allowances / plus-ones), not invitation rows. */
  total: number;
  /** Invitation / guest-record count (CRM card count). */
  invitationRecords: number;
  counts: Record<string, number>;
  noResponse: number;
}

/**
 * Organizer CRM chips: count expected people, not invitation rows.
 *
 * CHECKED IN uses live admitted heads (partial plus-ones included). Remaining
 * heads on a partially admitted party stay in their planning status so
 * organizers see both “in the room” and “still expected”.
 */
export function computeGuestCrmPeopleStats(
  guests: PartyPeopleInput[]
): GuestCrmPeopleStats {
  const counts: Record<string, number> = {
    INVITED: 0,
    OPENED: 0,
    ACCEPTED: 0,
    DECLINED: 0,
    MAYBE: 0,
    CHECKED_IN: 0,
  };

  const byInvitation = new Map<string, PartyPeopleInput[]>();
  const solos: PartyPeopleInput[] = [];
  for (const guest of guests) {
    if (!guest.invitationId) {
      solos.push(guest);
      continue;
    }
    const list = byInvitation.get(guest.invitationId) ?? [];
    list.push(guest);
    byInvitation.set(guest.invitationId, list);
  }

  function pickPlanningStatus(members: PartyPeopleInput[]): string {
    let status = "INVITED";
    let best = CRM_STATUS_PRIORITY[status] ?? 0;
    for (const member of members) {
      const key = member.status ?? "INVITED";
      if (key === "CHECKED_IN") continue;
      const rank = CRM_STATUS_PRIORITY[key] ?? 0;
      if (rank > best) {
        best = rank;
        status = key;
      }
    }
    // Fully/partially admitted parties with only CHECKED_IN rows still have
    // remaining heads to expect — treat them as Accepted for planning.
    if (best === 0 || (status === "INVITED" && members.every((m) => m.status === "CHECKED_IN"))) {
      return members.some((m) => m.status === "CHECKED_IN") ? "ACCEPTED" : status;
    }
    return status;
  }

  function bucket(members: PartyPeopleInput[]) {
    if (!members.length) return;
    const allowance = Math.max(...members.map(resolvePartyAllowance));
    const admittedRaw = Math.max(
      0,
      ...members.map((member) => member.admission?.admittedCount ?? 0)
    );
    const admitted = Math.min(allowance, Math.trunc(admittedRaw));
    const remaining = Math.max(0, allowance - admitted);

    if (admitted > 0) counts.CHECKED_IN += admitted;

    if (remaining > 0) {
      // No gate admissions yet — use the party's RSVP/planning status in full.
      // Partial admission — leftover heads keep their planning bucket.
      let status = pickPlanningStatus(members);
      if (admitted === 0) {
        // Prefer explicit CHECKED_IN only when gate count is missing but CRM
        // status says checked in (legacy full check-in without admittedCount).
        let best = members[0]?.status ?? "INVITED";
        let bestRank = CRM_STATUS_PRIORITY[best] ?? 0;
        for (const member of members) {
          const key = member.status ?? "INVITED";
          const rank = CRM_STATUS_PRIORITY[key] ?? 0;
          if (rank > bestRank) {
            bestRank = rank;
            best = key;
          }
        }
        status = best;
      }
      if (status === "CHECKED_IN") {
        counts.CHECKED_IN += remaining;
      } else if (status in counts) {
        counts[status] += remaining;
      } else {
        counts.INVITED += remaining;
      }
    }
  }

  for (const members of byInvitation.values()) bucket(members);
  for (const guest of solos) bucket([guest]);

  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
  const responded = counts.ACCEPTED + counts.DECLINED + counts.MAYBE + counts.CHECKED_IN;
  const noResponse = Math.max(0, total - responded - counts.OPENED);

  return {
    total,
    invitationRecords: byInvitation.size + solos.length,
    counts,
    noResponse,
  };
}
