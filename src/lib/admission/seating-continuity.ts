/**
 * Seating continuity for partially-admitted parties.
 *
 * A group's seats are reserved in full from the moment the organiser assigns
 * them. Arriving in two waves must never cost the party a seat: when 2 of 3
 * walk in, exactly 2 seats are revealed and the third stays held — at the same
 * table — until that guest turns up or an organiser reassigns it deliberately.
 *
 * Pure arithmetic over the seat rows the caller already loaded, so the same
 * projection serves the gate, the invitation, the portal and the offline
 * package without a second query or a schema change.
 */

export interface PartySeat {
  guestId: string;
  guestName: string;
  tableNumber: string;
  seatLabel: string | null;
  zone: string | null;
  /** Whether this named member has been checked in. */
  admitted: boolean;
}

export interface SeatingContinuity {
  /** Seats belonging to heads already inside — safe to show the guest. */
  revealed: PartySeat[];
  /** Seats still held for heads who have not arrived yet. */
  reserved: PartySeat[];
  /**
   * Heads with a place on the pass but no seat row at all. The operator can
   * seat them on the spot; the party is never turned away over this.
   */
  unseatedCount: number;
  /** True when the event seats by table only — no per-seat labels exist. */
  tableOnly: boolean;
  /** The party's table when they share exactly one. */
  tableNumber: string | null;
  /** Places still held at that table for the rest of the party. */
  heldAtTable: number;
}

/**
 * Project a party's seat rows against how many heads are currently inside.
 *
 * @param seats       every seat row belonging to the party, in a stable order
 * @param allowance   total heads the invitation admits
 * @param admittedCount heads currently inside
 */
export function resolveSeatingContinuity(
  seats: PartySeat[],
  allowance: number,
  admittedCount: number
): SeatingContinuity {
  const totalHeads = Math.max(0, Math.trunc(allowance));
  const inside = Math.max(0, Math.min(Math.trunc(admittedCount), totalHeads));

  // Members the gate positively checked in come first; the rest fill the
  // remaining revealed slots in list order. That matters because a party can be
  // admitted as a bare quantity ("two of you are here") with no names attached,
  // and the guest still needs to be told which seats are theirs.
  const confirmed = seats.filter((s) => s.admitted);
  const rest = seats.filter((s) => !s.admitted);
  const revealed = [...confirmed];
  for (const seat of rest) {
    if (revealed.length >= inside) break;
    revealed.push(seat);
  }

  const revealedIds = new Set(revealed.map((s) => s.guestId));
  const reserved = seats.filter((s) => !revealedIds.has(s.guestId));

  const tables = new Set(seats.map((s) => s.tableNumber));
  const tableNumber = tables.size === 1 ? [...tables][0] : null;

  return {
    revealed,
    reserved,
    // Seats can lag the allowance (a plus-one nobody named yet), never the
    // other way round — a negative would mean over-seating, which we clamp.
    unseatedCount: Math.max(0, totalHeads - seats.length),
    tableOnly: seats.length > 0 && seats.every((s) => !s.seatLabel),
    tableNumber,
    heldAtTable: tableNumber
      ? reserved.filter((s) => s.tableNumber === tableNumber).length +
        Math.max(0, totalHeads - seats.length)
      : reserved.length,
  };
}

/**
 * Guest-facing sentence for the seats still being held.
 * Returns null when there is nothing held, so callers can skip the block.
 */
export function describeHeldSeats(continuity: SeatingContinuity): string | null {
  const held = continuity.reserved.length + continuity.unseatedCount;
  if (held <= 0) return null;

  const where = continuity.tableNumber ? ` at Table ${continuity.tableNumber}` : "";
  return held === 1
    ? `1 more place is being held for your party${where}.`
    : `${held} more places are being held for your party${where}.`;
}
