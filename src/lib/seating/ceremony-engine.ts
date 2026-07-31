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
  { id: "bridal-family", name: "Bridal Family", color: "#EC4899", side: "left", priority: 1 },
  { id: "groom-family", name: "Groom Family", color: "#3B82F6", side: "right", priority: 1 },
  { id: "vip", name: "VIP", color: "#D4A63A", side: "centre", priority: 2 },
  { id: "general", name: "General Guests", color: "#64748B", side: "centre", priority: 5 },
  { id: "accessibility", name: "Accessibility", color: "#10B981", side: "left", priority: 2 },
];
