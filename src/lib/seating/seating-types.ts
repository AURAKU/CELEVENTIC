export type TableShape = "round" | "square" | "rectangle";

export interface SeatingTableConfig {
  id: string;
  label: string;
  zone?: string;
  capacity?: number;
  shape?: TableShape;
  /** Seats placed around the table (default 8 for round, 4 for square, 6 for rectangle) */
  seatCount?: number;
  x?: number;
  y?: number;
}

export interface SeatingLayoutConfig {
  tables: SeatingTableConfig[];
  notes?: string;
  expectedGuests?: number;
}

export interface SeatPosition {
  index: number;
  label: string;
  /** Percent offset from table center (-50 to 50 scale) */
  offsetX: number;
  offsetY: number;
}

export interface GuestAssignmentView {
  guestId: string;
  guestName: string;
  guestEmail?: string | null;
  guestStatus?: string;
  tableNumber: string;
  seatLabel?: string;
  zone?: string;
  notes?: string;
  admitted?: boolean;
}

export const DEFAULT_SEAT_COUNTS: Record<TableShape, number> = {
  round: 8,
  square: 4,
  rectangle: 6,
};

export function defaultSeatCount(shape: TableShape): number {
  return DEFAULT_SEAT_COUNTS[shape];
}

/** Clean user-entered table names and repair the legacy "Table Table 1" display. */
export function normalizeTableName(value: string): string {
  let name = value.trim().replace(/\s+/g, " ");
  while (/^table\s+table(?:\s|$)/i.test(name)) {
    name = name.replace(/^table\s+/i, "");
  }
  return name;
}

/**
 * Canonical match key so "1", "Table 1", and " table 1 " resolve together.
 * Custom names keep their own identity after whitespace folding.
 */
export function canonicalTableKey(value: string): string {
  const name = normalizeTableName(value);
  if (!name) return "";
  return name.replace(/^tables?\s+/i, "").toLowerCase();
}

export function tablesMatch(a: string, b: string): boolean {
  const left = canonicalTableKey(a);
  const right = canonicalTableKey(b);
  return Boolean(left) && left === right;
}

/** Display numeric identifiers as tables without prefixing already-named tables. */
export function tableDisplayName(value: string): string {
  const name = normalizeTableName(value);
  if (!name) return name;
  if (/^tables?\b/i.test(name)) {
    return name.replace(/^tables?\b/i, "Table");
  }
  if (/^[\d]+[A-Za-z]?$/i.test(name) || /^t-?\d+$/i.test(name)) {
    return `Table ${name}`;
  }
  return name;
}

/** Compact value under a "Your table" caption — never repeats the word Table. */
export function tableCaptionValue(value: string): string {
  const display = tableDisplayName(value);
  const stripped = display.replace(/^tables?\s*/i, "").trim();
  // Bare "Table"/"TABLE" with no identifier — avoid a second "TABLE" in the seal.
  if (!stripped) return "—";
  return stripped;
}

export function seatDisplayName(value: string): string {
  const name = value.trim().replace(/\s+/g, " ");
  if (!name) return name;
  return /^seat\b/i.test(name) ? name : `Seat ${name}`;
}

export function normalizeTable(table: SeatingTableConfig): SeatingTableConfig {
  const shape = table.shape ?? "round";
  const seatCount = table.seatCount ?? table.capacity ?? defaultSeatCount(shape);
  return {
    ...table,
    label: normalizeTableName(table.label),
    shape,
    seatCount,
    capacity: table.capacity ?? seatCount,
  };
}

export function generateTablesForGuests(
  guestCount: number,
  seatsPerTable: number,
  shape: TableShape,
  prefix = "Table"
): SeatingTableConfig[] {
  const count = Math.max(1, Math.ceil(guestCount / seatsPerTable));
  const cleanPrefix = normalizeTableName(prefix) || "Table";
  return Array.from({ length: count }, (_, i) => ({
    id: `t-${Date.now()}-${i}`,
    label: `${cleanPrefix} ${i + 1}`,
    shape,
    seatCount: seatsPerTable,
    capacity: seatsPerTable,
  }));
}
