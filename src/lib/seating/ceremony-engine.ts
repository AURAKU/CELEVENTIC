/**
 * Ceremony seating — chairs only (rows, aisles, sections).
 */

export type CeremonyAisleLayout =
  | "centre"
  | "left"
  | "right"
  | "two_side"
  | "custom";

export type CeremonyRowNaming = "letters" | "numbers" | "custom";

export interface CeremonyChair {
  id: string;
  label: string;
  index: number;
  accessible?: boolean;
  locked?: boolean;
  x?: number;
  y?: number;
}

export interface CeremonyRow {
  id: string;
  label: string;
  sectionId?: string;
  chairCount: number;
  chairs: CeremonyChair[];
  x?: number;
  y?: number;
  curved?: boolean;
  locked?: boolean;
}

export interface CeremonySection {
  id: string;
  name: string;
  color: string;
  side?: "left" | "right" | "centre" | "custom";
  priority?: number;
}

export interface CeremonyGenerateInput {
  rows: number;
  chairsPerRow: number;
  aisle?: CeremonyAisleLayout;
  naming?: CeremonyRowNaming;
  customPrefix?: string;
  sectionId?: string;
  startX?: number;
  startY?: number;
  rowGap?: number;
  chairGap?: number;
}

export function rowLabelForIndex(index: number, naming: CeremonyRowNaming, prefix = "R"): string {
  if (naming === "numbers") return String(index + 1);
  if (naming === "custom") return `${prefix}${index + 1}`;
  let n = index;
  let label = "";
  do {
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return label;
}

export function generateCeremonyRows(input: CeremonyGenerateInput): CeremonyRow[] {
  const rows = Math.max(1, Math.min(60, Math.trunc(input.rows) || 1));
  const chairsPerRow = Math.max(1, Math.min(40, Math.trunc(input.chairsPerRow) || 1));
  const naming = input.naming ?? "letters";
  const aisle = input.aisle ?? "centre";
  const startX = input.startX ?? 40;
  const startY = input.startY ?? 40;
  const rowGap = input.rowGap ?? 72;
  const chairGap = input.chairGap ?? 36;

  const result: CeremonyRow[] = [];
  for (let r = 0; r < rows; r += 1) {
    const label = rowLabelForIndex(r, naming, input.customPrefix);
    const chairs: CeremonyChair[] = [];
    for (let c = 0; c < chairsPerRow; c += 1) {
      // Centre aisle: insert a visual gap in the middle without creating a chair.
      let xOffset = c * chairGap;
      if (aisle === "centre" && chairsPerRow >= 4) {
        const mid = Math.floor(chairsPerRow / 2);
        if (c >= mid) xOffset += chairGap * 1.4;
      } else if (aisle === "left") {
        xOffset += chairGap * 1.6;
      } else if (aisle === "two_side") {
        xOffset += chairGap * 0.8;
      }
      chairs.push({
        id: `chair-${label}-${c + 1}`,
        label: `${label}${c + 1}`,
        index: c + 1,
        x: startX + xOffset,
        y: startY + r * rowGap,
      });
    }
    result.push({
      id: `row-${label}-${r}`,
      label: `Row ${label}`,
      sectionId: input.sectionId,
      chairCount: chairs.length,
      chairs,
      x: startX,
      y: startY + r * rowGap,
    });
  }
  return result;
}

export function flattenCeremonyChairs(rows: CeremonyRow[]): Array<CeremonyChair & { rowId: string; rowLabel: string }> {
  return rows.flatMap((row) =>
    row.chairs.map((chair) => ({ ...chair, rowId: row.id, rowLabel: row.label }))
  );
}

export function findAdjacentCeremonyChairs(
  rows: CeremonyRow[],
  needed: number,
  occupied: Set<string>
): { row: CeremonyRow; chairs: CeremonyChair[] } | null {
  if (needed <= 0) return null;
  for (const row of rows) {
    if (row.locked) continue;
    const free = row.chairs.filter((chair) => !occupied.has(chair.label) && !chair.locked);
    if (free.length < needed) continue;
    for (let start = 0; start <= free.length - needed; start += 1) {
      const window = free.slice(start, start + needed);
      const contiguous = window.every((chair, index) => {
        if (index === 0) return true;
        return chair.index === window[index - 1]!.index + 1;
      });
      if (contiguous) return { row, chairs: window };
    }
    // Fall back to first free block on the row.
    return { row, chairs: free.slice(0, needed) };
  }
  return null;
}

export function suggestCeremonyForParty(input: {
  rows: CeremonyRow[];
  needed: number;
  occupiedLabels: Set<string>;
  preferSectionId?: string;
}): Array<{ rowLabel: string; seatLabels: string[]; sectionId?: string; reason: string; score: number }> {
  const rankedRows = [...input.rows].sort((a, b) => {
    const aPref = input.preferSectionId && a.sectionId === input.preferSectionId ? -1 : 0;
    const bPref = input.preferSectionId && b.sectionId === input.preferSectionId ? -1 : 0;
    return aPref - bPref;
  });
  const suggestions: Array<{
    rowLabel: string;
    seatLabels: string[];
    sectionId?: string;
    reason: string;
    score: number;
  }> = [];

  for (const row of rankedRows) {
    const match = findAdjacentCeremonyChairs([row], input.needed, input.occupiedLabels);
    if (!match) continue;
    const adjacent = match.chairs.every((chair, index) => {
      if (index === 0) return true;
      return chair.index === match.chairs[index - 1]!.index + 1;
    });
    let score = 100 - Math.abs(row.chairs.length - input.needed) * 2;
    if (adjacent) score += 40;
    if (input.preferSectionId && row.sectionId === input.preferSectionId) score += 20;
    suggestions.push({
      rowLabel: row.label,
      seatLabels: match.chairs.map((chair) => chair.label),
      sectionId: row.sectionId,
      score,
      reason: adjacent
        ? `${row.label} has ${input.needed} adjacent ceremony chairs (${match.chairs.map((c) => c.label).join(", ")}).`
        : `${row.label} can seat ${input.needed} using chairs ${match.chairs.map((c) => c.label).join(", ")}.`,
    });
  }

  return suggestions.sort((a, b) => b.score - a.score).slice(0, 5);
}

export const CEREMONY_SECTION_PRESETS: CeremonySection[] = [
  { id: "reserved", name: "Reserved", color: "#F59E0B", side: "centre", priority: 1 },
  { id: "family", name: "Family", color: "#EC4899", side: "centre", priority: 1 },
  { id: "special-guests", name: "Special Guests", color: "#8B5CF6", side: "centre", priority: 2 },
  { id: "bridal-family", name: "Bridal Family", color: "#DB2777", side: "left", priority: 1 },
  { id: "groom-family", name: "Groom Family", color: "#2563EB", side: "right", priority: 1 },
  { id: "vip", name: "VIP", color: "#D4A63A", side: "centre", priority: 2 },
  { id: "general", name: "General Guests", color: "#64748B", side: "centre", priority: 5 },
  { id: "accessibility", name: "Accessibility", color: "#10B981", side: "left", priority: 2 },
];

/** Stable starter zones for ceremony maps (Reserved / Family / Special Guests first). */
export function defaultCeremonySections(): CeremonySection[] {
  return CEREMONY_SECTION_PRESETS.slice(0, 6).map((section) => ({ ...section }));
}

export interface CeremonyConflict {
  id: string;
  severity: "CRITICAL" | "WARNING" | "SUGGESTION" | "RESOLVED";
  code: string;
  message: string;
  guestIds?: string[];
  tableLabel?: string;
  actionHint?: string;
}

/** Ceremony-aware conflict detection (rows/chairs, not dining tables). */
export function detectCeremonyConflicts(input: {
  guests: Array<{ id: string; name: string; invitationId?: string | null; plusOnes?: number; admission?: { allowance: number } | null }>;
  rows: CeremonyRow[];
  assignments: Array<{ guestId: string; tableNumber: string; seatLabel?: string }>;
}): CeremonyConflict[] {
  const conflicts: CeremonyConflict[] = [];
  const chairByLabel = new Map<string, { row: CeremonyRow; chair: CeremonyChair }>();
  for (const row of input.rows) {
    for (const chair of row.chairs) {
      chairByLabel.set(chair.label.toLowerCase(), { row, chair });
    }
  }
  const bySeat = new Map<string, string[]>();

  for (const assignment of input.assignments) {
    const seatKey = (assignment.seatLabel ?? "").trim().toLowerCase();
    if (!seatKey) {
      conflicts.push({
        id: `ceremony-missing-seat:${assignment.guestId}`,
        severity: "CRITICAL",
        code: "MISSING_CHAIR",
        message: `Ceremony assignment for a guest has no chair label.`,
        guestIds: [assignment.guestId],
        actionHint: "Reassign this guest to a specific ceremony chair.",
      });
      continue;
    }

    const match = chairByLabel.get(seatKey);
    const rowMatch =
      match?.row ??
      input.rows.find((row) => row.label.toLowerCase() === assignment.tableNumber.toLowerCase());

    if (!match && !rowMatch) {
      conflicts.push({
        id: `ceremony-missing-row:${assignment.guestId}`,
        severity: "CRITICAL",
        code: "MISSING_ROW",
        message: `Guest assignment references missing ceremony seat "${assignment.seatLabel ?? assignment.tableNumber}".`,
        guestIds: [assignment.guestId],
        actionHint: "Reassign this guest to an existing ceremony chair.",
      });
      continue;
    }

    if (!match) {
      conflicts.push({
        id: `ceremony-missing-chair:${assignment.guestId}`,
        severity: "CRITICAL",
        code: "MISSING_CHAIR",
        message: `Chair "${assignment.seatLabel}" is not on ${rowMatch?.label ?? "the ceremony plan"}.`,
        tableLabel: rowMatch?.label,
        guestIds: [assignment.guestId],
        actionHint: "Pick a chair that exists on the row, or regenerate the row.",
      });
      continue;
    }

    const key = match.chair.label.toLowerCase();
    const current = bySeat.get(key) ?? [];
    current.push(assignment.guestId);
    bySeat.set(key, current);
  }

  for (const [seatLabel, guestIds] of bySeat) {
    if (guestIds.length < 2) continue;
    conflicts.push({
      id: `ceremony-dup:${seatLabel}`,
      severity: "CRITICAL",
      code: "DUPLICATE_SEAT",
      message: `Ceremony chair ${seatLabel.toUpperCase()} is assigned to ${guestIds.length} guests.`,
      guestIds,
      actionHint: "Keep one guest and reassign the others.",
    });
  }

  for (const row of input.rows) {
    const seated = input.assignments.filter(
      (rowAssignment) =>
        rowAssignment.tableNumber.toLowerCase() === row.label.toLowerCase() ||
        row.chairs.some(
          (chair) =>
            chair.label.toLowerCase() === (rowAssignment.seatLabel ?? "").toLowerCase()
        )
    );
    if (seated.length > row.chairs.length) {
      conflicts.push({
        id: `ceremony-overfill:${row.id}`,
        severity: "CRITICAL",
        code: "ROW_OVER_CAPACITY",
        message: `${row.label} has ${seated.length} assignments but only ${row.chairs.length} chairs.`,
        tableLabel: row.label,
        guestIds: seated.map((item) => item.guestId),
        actionHint: "Add chairs to this row or move guests to another row.",
      });
    }
  }

  const byInvitation = new Map<string, typeof input.guests>();
  for (const guest of input.guests) {
    if (!guest.invitationId) continue;
    const list = byInvitation.get(guest.invitationId) ?? [];
    list.push(guest);
    byInvitation.set(guest.invitationId, list);
  }

  for (const [invitationId, members] of byInvitation) {
    const memberIds = new Set(members.map((guest) => guest.id));
    const seated = input.assignments.filter((row) => memberIds.has(row.guestId));
    if (seated.length === 0) continue;
    const rowsUsed = new Set(seated.map((row) => row.tableNumber.toLowerCase()));
    if (rowsUsed.size > 1) {
      conflicts.push({
        id: `ceremony-split:${invitationId}`,
        severity: "WARNING",
        code: "GROUP_SPLIT",
        message: `${members[0]?.name ?? "A party"} is split across ${rowsUsed.size} ceremony rows.`,
        guestIds: [...memberIds],
        actionHint: "Seat the whole party on one row when possible.",
      });
    }
  }

  return conflicts;
}
