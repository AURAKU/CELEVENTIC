import {
  DEFAULT_STUDIO_SETTINGS,
  TABLE_KIND_PRESETS,
  type CapacitySnapshot,
  type SeatingConflict,
  type SeatingSuggestion,
  type StudioAssignment,
  type StudioGuest,
  type StudioLayout,
  type StudioSettings,
  type StudioTableConfig,
  type StudioTableKind,
} from "@/lib/seating/studio-types";
import {
  normalizeTable,
  normalizeTableName,
  tablesMatch,
  type SeatingTableConfig,
} from "@/lib/seating/seating-types";

export function resolveStudioSettings(layout?: StudioLayout | null): StudioSettings {
  return { ...DEFAULT_STUDIO_SETTINGS, ...(layout?.settings ?? {}) };
}

export function normalizeStudioLayout(raw: unknown): StudioLayout {
  const layout = (raw ?? {}) as StudioLayout;
  const tables = (layout.tables ?? []).map((table) => normalizeStudioTable(table));
  return {
    tables,
    ceremonyRows: layout.ceremonyRows ?? [],
    ceremonySections: layout.ceremonySections ?? [],
    zones: layout.zones ?? [],
    elements: layout.elements ?? [],
    notes: layout.notes,
    expectedGuests: layout.expectedGuests,
    status: layout.status === "published" ? "published" : "draft",
    publishedAt: layout.publishedAt ?? null,
    revision: layout.revision ?? 1,
    settings: resolveStudioSettings(layout),
    planKind: layout.planKind === "CEREMONY" ? "CEREMONY" : "RECEPTION",
  };
}

export function normalizeStudioTable(table: StudioTableConfig): StudioTableConfig {
  const kind: StudioTableKind = table.kind ?? inferKind(table);
  const preset = TABLE_KIND_PRESETS[kind] ?? TABLE_KIND_PRESETS.round;
  const shape = table.shape ?? preset.shape;
  const seatCount = Math.max(2, Math.min(20, table.seatCount ?? table.capacity ?? preset.defaultSeats));
  const base = normalizeTable({
    id: table.id,
    label: normalizeTableName(table.label || preset.label),
    shape,
    seatCount,
    capacity: seatCount,
    zone: table.zone,
    x: table.x,
    y: table.y,
  } as SeatingTableConfig);

  return {
    ...table,
    ...base,
    kind,
    vip: table.vip ?? preset.vip ?? false,
    seatCount,
    capacity: seatCount,
    numberingClockwise: table.numberingClockwise ?? true,
  };
}

function inferKind(table: StudioTableConfig): StudioTableKind {
  if (table.kind) return table.kind;
  if (table.vip) return "vip";
  if (table.shape === "square") return "square";
  if (table.shape === "rectangle") return "rectangle";
  return "round";
}

export function partyGuestIds(
  guests: StudioGuest[],
  guestId: string
): { invitationId: string | null; guestIds: string[]; partySize: number } {
  const guest = guests.find((row) => row.id === guestId);
  if (!guest) return { invitationId: null, guestIds: [guestId], partySize: 1 };
  if (!guest.invitationId) {
    return {
      invitationId: null,
      guestIds: [guest.id],
      partySize: Math.max(1, guest.partySize || 1 + Math.max(0, guest.plusOnes)),
    };
  }
  const members = guests.filter((row) => row.invitationId === guest.invitationId);
  const allowance =
    guest.admission?.allowance ??
    Math.max(
      members.length,
      guest.partySize || members.reduce((sum, row) => sum + 1 + Math.max(0, row.plusOnes), 0)
    );
  return {
    invitationId: guest.invitationId,
    guestIds: members.map((row) => row.id),
    partySize: Math.max(allowance, members.length),
  };
}

export function occupiedSeatsByTable(
  assignments: StudioAssignment[],
  tableLabel: string
): Set<string> {
  const seats = new Set<string>();
  for (const assignment of assignments) {
    if (!tablesMatch(assignment.tableNumber, tableLabel)) continue;
    if (assignment.seatLabel) seats.add(assignment.seatLabel.trim());
  }
  return seats;
}

export function freeSeatLabels(table: StudioTableConfig, assignments: StudioAssignment[]): string[] {
  const occupied = occupiedSeatsByTable(assignments, table.label);
  const count = table.seatCount ?? table.capacity ?? 8;
  const labels: string[] = [];
  for (let i = 1; i <= count; i += 1) {
    const label = String(i);
    if (!occupied.has(label)) labels.push(label);
  }
  return labels;
}

/** Prefer contiguous runs so families sit together. Returns null when none exist. */
export function findAdjacentSeats(freeLabels: string[], needed: number): string[] | null {
  if (needed <= 0) return [];
  if (freeLabels.length < needed) return null;
  const nums = freeLabels
    .map((label) => Number.parseInt(label, 10))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);
  if (nums.length < needed) return null;

  for (let start = 0; start <= nums.length - needed; start += 1) {
    const window = nums.slice(start, start + needed);
    const contiguous = window.every((value, index) => index === 0 || value === window[index - 1]! + 1);
    if (contiguous) return window.map(String);
  }
  return null;
}

export function suggestSeatingForParty(input: {
  guests: StudioGuest[];
  guestId: string;
  tables: StudioTableConfig[];
  assignments: StudioAssignment[];
  preferAdjacent?: boolean;
  preferVip?: boolean;
}): SeatingSuggestion[] {
  const party = partyGuestIds(input.guests, input.guestId);
  const needed = party.partySize;
  const alreadyAssigned = new Set(
    input.assignments.filter((row) => party.guestIds.includes(row.guestId)).map((row) => row.guestId)
  );
  const remaining = Math.max(0, needed - alreadyAssigned.size);
  if (remaining <= 0) return [];

  const guest = input.guests.find((row) => row.id === input.guestId);
  const suggestions: SeatingSuggestion[] = [];

  for (const table of input.tables) {
    if (table.locked) continue;
    const free = freeSeatLabels(table, input.assignments);
    if (free.length < remaining) continue;
    const seats =
      (input.preferAdjacent ?? true) ? findAdjacentSeats(free, remaining) ?? free.slice(0, remaining) : free.slice(0, remaining);
    if (seats.length < remaining) continue;

    const adjacentBlock = (input.preferAdjacent ?? true) ? findAdjacentSeats(free, remaining) : null;
    // Prefer adjacent blocks first, then spare capacity so parties are not packed edge-to-edge.
    let score = 100 - Math.abs(free.length - remaining) * 2;
    if (adjacentBlock) score += 40;
    if (remaining > 1 && free.length > remaining) {
      score += Math.min(24, (free.length - remaining) * 5);
    }
    if (table.vip && (guest?.vip || input.preferVip)) score += 20;
    if (table.vip && !guest?.vip) score -= 15;
    if (guest?.accessible && /access|entrance|main/i.test(table.zone ?? "")) score += 15;

    suggestions.push({
      id: `${table.id}:${seats.join("-")}`,
      invitationId: party.invitationId,
      guestIds: party.guestIds.filter((id) => !alreadyAssigned.has(id)).slice(0, remaining),
      tableId: table.id,
      tableLabel: table.label,
      seatLabels: seats,
      score,
      reason: buildSuggestionReason(table, seats, remaining, free.length),
    });
  }

  return suggestions.sort((a, b) => b.score - a.score).slice(0, 5);
}

function buildSuggestionReason(
  table: StudioTableConfig,
  seats: string[],
  needed: number,
  freeCount: number
): string {
  const adjacent = seats.length > 1 && seats.every((seat, index) => {
    if (index === 0) return true;
    return Number(seat) === Number(seats[index - 1]) + 1;
  });
  if (adjacent && needed > 1) {
    return `${table.label} has ${needed} adjacent seats available (${seats.join(", ")}).`;
  }
  if (freeCount === needed) {
    return `${table.label} fits this party exactly with seats ${seats.join(", ")}.`;
  }
  return `${table.label} can seat ${needed} of this party using seats ${seats.join(", ")}.`;
}

export function detectSeatingConflicts(input: {
  guests: StudioGuest[];
  tables: StudioTableConfig[];
  assignments: StudioAssignment[];
  /** Active companion holds (unnamed plus-ones). */
  companionHolds?: Array<{
    id: string;
    invitationId: string;
    tableNumber: string;
    seatLabel?: string | null;
    status?: string;
  }>;
  /** Confirmed intentional splits — suppress unresolved GROUP_SPLIT. */
  confirmedSplitInvitationIds?: Set<string>;
}): SeatingConflict[] {
  const conflicts: SeatingConflict[] = [];
  const bySeat = new Map<string, string[]>();
  const tableByLabel = new Map(input.tables.map((table) => [table.label.toLowerCase(), table]));
  const activeHolds = (input.companionHolds ?? []).filter(
    (hold) => !hold.status || hold.status === "ACTIVE"
  );

  for (const assignment of input.assignments) {
    const table =
      input.tables.find((row) => tablesMatch(row.label, assignment.tableNumber)) ??
      tableByLabel.get(assignment.tableNumber.toLowerCase());
    if (!table) {
      conflicts.push({
        id: `missing-table:${assignment.guestId}`,
        severity: "CRITICAL",
        code: "MISSING_TABLE",
        message: `Guest assignment references missing table "${assignment.tableNumber}".`,
        guestIds: [assignment.guestId],
        actionHint: "Reassign this guest to an existing table.",
      });
      continue;
    }

    const capacity = table.seatCount ?? table.capacity ?? 8;
    const seatKey = `${table.label.toLowerCase()}::${assignment.seatLabel ?? "unlabeled"}`;
    const current = bySeat.get(seatKey) ?? [];
    current.push(assignment.guestId);
    bySeat.set(seatKey, current);

    if (assignment.seatLabel) {
      const seatNum = Number.parseInt(assignment.seatLabel, 10);
      if (Number.isFinite(seatNum) && seatNum > capacity) {
        conflicts.push({
          id: `seat-oob:${assignment.guestId}`,
          severity: "CRITICAL",
          code: "SEAT_OUT_OF_RANGE",
          message: `Seat ${assignment.seatLabel} exceeds ${table.label} capacity (${capacity}).`,
          tableLabel: table.label,
          guestIds: [assignment.guestId],
          actionHint: "Move this guest to a valid seat or increase table capacity.",
        });
      }
    }
  }

  for (const hold of activeHolds) {
    const table =
      input.tables.find((row) => tablesMatch(row.label, hold.tableNumber)) ??
      tableByLabel.get(hold.tableNumber.toLowerCase());
    if (!table) {
      conflicts.push({
        id: `missing-table-hold:${hold.id}`,
        severity: "CRITICAL",
        code: "MISSING_TABLE",
        message: `Companion place references missing table "${hold.tableNumber}".`,
        actionHint: "Reassign or release this companion place.",
      });
      continue;
    }
    if (hold.seatLabel) {
      const seatKey = `${table.label.toLowerCase()}::${hold.seatLabel}`;
      const current = bySeat.get(seatKey) ?? [];
      current.push(`hold:${hold.id}`);
      bySeat.set(seatKey, current);
    }
  }

  for (const [seatKey, guestIds] of bySeat) {
    if (guestIds.length < 2) continue;
    const [tableLabel, seatLabel] = seatKey.split("::");
    conflicts.push({
      id: `dup:${seatKey}`,
      severity: "CRITICAL",
      code: "DUPLICATE_SEAT",
      message: `Seat ${seatLabel === "unlabeled" ? "(unlabeled)" : seatLabel} at ${tableLabel} is assigned to ${guestIds.length} occupants.`,
      tableLabel,
      guestIds: guestIds.filter((id) => !id.startsWith("hold:")),
      actionHint: "Keep one occupant and reassign the others.",
    });
  }

  for (const table of input.tables) {
    const seated = input.assignments.filter((row) => tablesMatch(row.tableNumber, table.label));
    const holdsHere = activeHolds.filter((hold) => tablesMatch(hold.tableNumber, table.label));
    const occupants = seated.length + holdsHere.length;
    const capacity = table.seatCount ?? table.capacity ?? 8;
    if (occupants > capacity) {
      conflicts.push({
        id: `overfill:${table.id}`,
        severity: "CRITICAL",
        code: "TABLE_OVER_CAPACITY",
        message: `${table.label} has ${occupants} occupants (including companion places) but only ${capacity} seats.`,
        tableLabel: table.label,
        guestIds: seated.map((row) => row.guestId),
        actionHint: "Increase capacity or move guests to another table.",
      });
    }
  }

  const byInvitation = new Map<string, StudioGuest[]>();
  for (const guest of input.guests) {
    if (!guest.invitationId) continue;
    const list = byInvitation.get(guest.invitationId) ?? [];
    list.push(guest);
    byInvitation.set(guest.invitationId, list);
  }

  for (const [invitationId, members] of byInvitation) {
    const allowance =
      members[0]?.admission?.allowance ??
      Math.max(
        members.length,
        members.reduce((sum, row) => sum + 1 + Math.max(0, row.plusOnes), 0)
      );
    const memberIds = new Set(members.map((row) => row.id));
    const seated = input.assignments.filter((row) => memberIds.has(row.guestId));
    const holds = activeHolds.filter((hold) => hold.invitationId === invitationId);
    if (seated.length === 0 && holds.length === 0) continue;
    const tablesUsed = new Set([
      ...seated.map((row) => row.tableNumber.toLowerCase()),
      ...holds.map((hold) => hold.tableNumber.toLowerCase()),
    ]);
    const confirmed = input.confirmedSplitInvitationIds?.has(invitationId);
    if (tablesUsed.size > 1 && allowance > 1 && !confirmed) {
      conflicts.push({
        id: `split:${invitationId}`,
        severity: "WARNING",
        code: "PARTY_SPLIT_UNCONFIRMED",
        message: `${members[0]?.name ?? "A party"} is split across ${tablesUsed.size} tables.`,
        guestIds: [...memberIds],
        actionHint: "Move the whole party to one table, or confirm the split intentionally.",
      });
    }
    const placed = seated.length + holds.length;
    if (placed < allowance) {
      conflicts.push({
        id: `party-fit:${invitationId}`,
        severity: "WARNING",
        code: "PARTY_INCOMPLETE",
        message: `${members[0]?.name ?? "Party"} still needs ${allowance - placed} place(s) (${placed} of ${allowance} seated, including companion holds).`,
        tableLabel: seated[0]?.tableNumber ?? holds[0]?.tableNumber,
        guestIds: [...memberIds],
        actionHint: "Assign the full party or release unused companion places.",
      });
    }
  }

  return conflicts;
}

export function autoAssignGuests(input: {
  guests: StudioGuest[];
  tables: StudioTableConfig[];
  assignments: StudioAssignment[];
  guestIds?: string[];
  keepGroupsTogether?: boolean;
  preferAdjacent?: boolean;
}): { assignments: StudioAssignment[]; suggestions: SeatingSuggestion[]; unresolvedGuestIds: string[] } {
  const next = [...input.assignments];
  const assignedGuestIds = new Set(next.map((row) => row.guestId));
  const targetGuests = input.guests.filter((guest) => {
    if (assignedGuestIds.has(guest.id)) return false;
    if (input.guestIds?.length) return input.guestIds.includes(guest.id);
    return true;
  });

  const processedInvitations = new Set<string>();
  const applied: SeatingSuggestion[] = [];
  const unresolved: string[] = [];

  for (const guest of targetGuests) {
    if (guest.invitationId && processedInvitations.has(guest.invitationId)) continue;
    if (guest.invitationId) processedInvitations.add(guest.invitationId);

    const suggestions = suggestSeatingForParty({
      guests: input.guests,
      guestId: guest.id,
      tables: input.tables,
      assignments: next,
      preferAdjacent: input.preferAdjacent ?? true,
      preferVip: guest.vip,
    });
    const best = suggestions[0];
    if (!best) {
      unresolved.push(...partyGuestIds(input.guests, guest.id).guestIds.filter((id) => !assignedGuestIds.has(id)));
      continue;
    }

    best.guestIds.forEach((guestId, index) => {
      if (assignedGuestIds.has(guestId)) return;
      const seatLabel = best.seatLabels[index] ?? best.seatLabels[best.seatLabels.length - 1];
      next.push({
        guestId,
        tableNumber: best.tableLabel,
        seatLabel,
        zone: input.tables.find((table) => table.id === best.tableId)?.zone,
      });
      assignedGuestIds.add(guestId);
    });
    applied.push(best);
  }

  return { assignments: next, suggestions: applied, unresolvedGuestIds: [...new Set(unresolved)] };
}

export function computeCapacitySnapshot(input: {
  guests: StudioGuest[];
  tables: StudioTableConfig[];
  assignments: StudioAssignment[];
  conflicts?: SeatingConflict[];
}): CapacitySnapshot {
  const totalSeats = input.tables.reduce(
    (sum, table) => sum + (table.seatCount ?? table.capacity ?? 8),
    0
  );
  const assignedSeats = input.assignments.length;
  const assignedIds = new Set(input.assignments.map((row) => row.guestId));
  const peopleRepresented = input.guests.reduce((sum, guest) => {
    if (guest.invitationId) {
      // Count invitation allowance once per invitation.
      return sum;
    }
    return sum + Math.max(1, guest.partySize || 1 + Math.max(0, guest.plusOnes));
  }, 0);
  const invitationPeople = (() => {
    const seen = new Set<string>();
    let total = 0;
    for (const guest of input.guests) {
      if (!guest.invitationId || seen.has(guest.invitationId)) continue;
      seen.add(guest.invitationId);
      total += guest.admission?.allowance ?? guest.partySize ?? 1;
    }
    return total;
  })();
  const admittedHeads = (() => {
    const seen = new Set<string>();
    let total = 0;
    for (const guest of input.guests) {
      if (guest.invitationId) {
        if (seen.has(guest.invitationId)) continue;
        seen.add(guest.invitationId);
        total += guest.admission?.admittedCount ?? 0;
      } else if (guest.status === "CHECKED_IN") {
        total += 1;
      }
    }
    return total;
  })();
  const remainingHeads = (() => {
    const seen = new Set<string>();
    let total = 0;
    for (const guest of input.guests) {
      if (!guest.invitationId || seen.has(guest.invitationId)) continue;
      seen.add(guest.invitationId);
      total += guest.admission?.remainingCount ?? 0;
    }
    return total;
  })();

  return {
    tableCount: input.tables.length,
    totalSeats,
    assignedSeats,
    availableSeats: Math.max(0, totalSeats - assignedSeats),
    guestCount: input.guests.length,
    peopleRepresented: peopleRepresented + invitationPeople,
    unassignedGuests: input.guests.filter((guest) => !assignedIds.has(guest.id)).length,
    admittedHeads,
    remainingHeads,
    conflictCount: input.conflicts?.length ?? 0,
    overCapacity: assignedSeats > totalSeats || peopleRepresented + invitationPeople > totalSeats,
  };
}

export function snapToGrid(value: number, gridSize: number, enabled: boolean): number {
  if (!enabled || gridSize <= 0) return value;
  return Math.round(value / gridSize) * gridSize;
}

export function defaultTablePosition(index: number, gridSize = 24): { x: number; y: number } {
  const col = index % 4;
  const row = Math.floor(index / 4);
  return {
    x: snapToGrid(80 + col * 220, gridSize, true),
    y: snapToGrid(80 + row * 220, gridSize, true),
  };
}
