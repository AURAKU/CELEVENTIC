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

export function normalizeTable(table: SeatingTableConfig): SeatingTableConfig {
  const shape = table.shape ?? "round";
  const seatCount = table.seatCount ?? table.capacity ?? defaultSeatCount(shape);
  return {
    ...table,
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
  return Array.from({ length: count }, (_, i) => ({
    id: `t-${Date.now()}-${i}`,
    label: `${prefix} ${i + 1}`,
    shape,
    seatCount: seatsPerTable,
    capacity: seatsPerTable,
  }));
}
