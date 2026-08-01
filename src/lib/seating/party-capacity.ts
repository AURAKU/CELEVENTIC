/**
 * Party capacity + companion-hold helpers for Event Seating.
 * Named guests use SeatingAssignment; unnamed plus-ones use SeatingCompanionHold.
 */

import type { StudioAssignment, StudioGuest, StudioTableConfig } from "@/lib/seating/studio-types";
import { tablesMatch } from "@/lib/seating/seating-types";
import { resolvePartyAllowance } from "@/lib/seating/people-stats";
import { partyGuestIds } from "@/lib/seating/studio-engine";

export type CompanionHoldStatus = "ACTIVE" | "RELEASED" | "CONVERTED";

export type SeatingCompanionHoldView = {
  id: string;
  invitationId: string;
  ownerGuestId: string | null;
  companionIndex: number;
  displayLabel: string;
  tableNumber: string;
  seatLabel?: string | null;
  zone?: string | null;
  notes?: string | null;
  locked: boolean;
  status: CompanionHoldStatus | string;
};

export type PartySeatingRequirement = {
  invitationId: string | null;
  ownerGuestId: string;
  ownerName: string;
  requiredPlaces: number;
  namedGuestIds: string[];
  namedCount: number;
  unnamedCompanions: number;
  assignedNamedCount: number;
  activeHoldCount: number;
  placedPlaces: number;
  missingPlaces: number;
};

export function companionDisplayLabel(ownerName: string, index: number): string {
  const first = ownerName.trim().split(/\s+/)[0] || "Guest";
  const possessive = /s$/i.test(first) ? `${first}'` : `${first}'s`;
  return `${possessive} Guest ${index}`;
}

export function computePartySeatingRequirement(input: {
  guests: StudioGuest[];
  guestId: string;
  assignments: StudioAssignment[];
  holds?: SeatingCompanionHoldView[];
}): PartySeatingRequirement {
  const party = partyGuestIds(input.guests, input.guestId);
  const primary =
    input.guests.find((guest) => guest.id === input.guestId) ??
    input.guests.find((guest) => guest.id === party.guestIds[0])!;
  const requiredPlaces = Math.max(party.partySize, resolvePartyAllowance(primary), party.guestIds.length);
  const namedGuestIds = party.guestIds;
  const namedCount = namedGuestIds.length;
  const unnamedCompanions = Math.max(0, requiredPlaces - namedCount);
  const assignedNamedCount = namedGuestIds.filter((id) =>
    input.assignments.some((row) => row.guestId === id)
  ).length;
  const invitationId = party.invitationId;
  const activeHoldCount = (input.holds ?? []).filter(
    (hold) =>
      hold.status === "ACTIVE" &&
      invitationId &&
      hold.invitationId === invitationId
  ).length;
  const placedPlaces = assignedNamedCount + activeHoldCount;
  return {
    invitationId,
    ownerGuestId: primary.id,
    ownerName: primary.name,
    requiredPlaces,
    namedGuestIds,
    namedCount,
    unnamedCompanions,
    assignedNamedCount,
    activeHoldCount,
    placedPlaces,
    missingPlaces: Math.max(0, requiredPlaces - placedPlaces),
  };
}

/** Occupancy for a table = named assignments + active companion holds. */
export function tableOccupancyCount(input: {
  tableLabel: string;
  assignments: StudioAssignment[];
  holds?: SeatingCompanionHoldView[];
}): number {
  const named = input.assignments.filter((row) => tablesMatch(row.tableNumber, input.tableLabel)).length;
  const holds = (input.holds ?? []).filter(
    (hold) => hold.status === "ACTIVE" && tablesMatch(hold.tableNumber, input.tableLabel)
  ).length;
  return named + holds;
}

export function freePlacesOnTable(input: {
  table: StudioTableConfig;
  assignments: StudioAssignment[];
  holds?: SeatingCompanionHoldView[];
}): number {
  const capacity = input.table.seatCount ?? input.table.capacity ?? 8;
  return Math.max(0, capacity - tableOccupancyCount({
    tableLabel: input.table.label,
    assignments: input.assignments,
    holds: input.holds,
  }));
}

export function occupiedSeatKeys(input: {
  assignments: StudioAssignment[];
  holds?: SeatingCompanionHoldView[];
}): Set<string> {
  const keys = new Set<string>();
  for (const row of input.assignments) {
    if (!row.seatLabel) continue;
    keys.add(`${row.tableNumber.trim().toLowerCase()}::${row.seatLabel.trim().toLowerCase()}`);
  }
  for (const hold of input.holds ?? []) {
    if (hold.status !== "ACTIVE" || !hold.seatLabel) continue;
    keys.add(`${hold.tableNumber.trim().toLowerCase()}::${hold.seatLabel.trim().toLowerCase()}`);
  }
  return keys;
}

export function buildCompanionHoldDrafts(input: {
  ownerName: string;
  invitationId: string;
  ownerGuestId: string;
  unnamedCount: number;
  tableNumber: string;
  zone?: string;
  seatLabels?: Array<string | undefined>;
}): Array<{
  invitationId: string;
  ownerGuestId: string;
  companionIndex: number;
  displayLabel: string;
  tableNumber: string;
  seatLabel?: string;
  zone?: string;
}> {
  return Array.from({ length: Math.max(0, input.unnamedCount) }, (_, index) => ({
    invitationId: input.invitationId,
    ownerGuestId: input.ownerGuestId,
    companionIndex: index + 1,
    displayLabel: companionDisplayLabel(input.ownerName, index + 1),
    tableNumber: input.tableNumber,
    seatLabel: input.seatLabels?.[index],
    zone: input.zone,
  }));
}
