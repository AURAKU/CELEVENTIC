import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  autoAssignGuests,
  computeCapacitySnapshot,
  detectSeatingConflicts,
  findAdjacentSeats,
  freeSeatLabels,
  suggestSeatingForParty,
} from "../studio-engine";
import type { StudioAssignment, StudioGuest, StudioTableConfig } from "../studio-types";
import { evaluateSeatingReveal } from "../seating-theme";
import { DEFAULT_STUDIO_SETTINGS } from "../studio-types";
import { computeSeatPositions } from "../seating-layout";

const table = (label: string, seats = 8, id = label): StudioTableConfig => ({
  id,
  label,
  shape: "round",
  kind: "round",
  seatCount: seats,
  capacity: seats,
});

const guest = (
  id: string,
  name: string,
  invitationId: string | null,
  partySize = 1
): StudioGuest => ({
  id,
  name,
  email: null,
  phone: null,
  plusOnes: Math.max(0, partySize - 1),
  invitationId,
  partySize,
  admission: {
    allowance: partySize,
    admittedCount: 0,
    remainingCount: partySize,
    state: "NOT_ADMITTED",
  },
});

describe("seating studio engine", () => {
  it("places chairs evenly around round and rectangular tables", () => {
    const round = computeSeatPositions("round", 8);
    assert.equal(round.length, 8);
    assert.ok(round.every((seat) => Math.hypot(seat.offsetX, seat.offsetY) > 50));

    const rect = computeSeatPositions("rectangle", 10);
    assert.equal(rect.length, 10);
    assert.equal(rect[0]?.label, "1");
  });

  it("finds adjacent free seats for a party of three", () => {
    assert.deepEqual(findAdjacentSeats(["1", "2", "3", "5", "6"], 3), ["1", "2", "3"]);
    assert.equal(findAdjacentSeats(["1", "3", "5"], 2), null);
  });

  it("suggests a same-table adjacent block for a family invitation", () => {
    const guests = [
      guest("g1", "Obuah", "inv1", 3),
      guest("g2", "Ama", "inv1", 3),
      guest("g3", "Kofi", "inv1", 3),
    ];
    const tables = [table("Table 6", 8), table("Table 2", 4)];
    const suggestions = suggestSeatingForParty({
      guests,
      guestId: "g1",
      tables,
      assignments: [],
      preferAdjacent: true,
    });
    assert.ok(suggestions.length > 0);
    assert.equal(suggestions[0]?.tableLabel, "Table 6");
    assert.equal(suggestions[0]?.seatLabels.length, 3);
    assert.match(suggestions[0]?.reason ?? "", /adjacent|fits|seat/i);
  });

  it("auto-assigns groups without double-booking seats", () => {
    const guests = [
      guest("a1", "Family A", "invA", 2),
      guest("a2", "Family A2", "invA", 2),
      guest("b1", "Family B", "invB", 2),
      guest("b2", "Family B2", "invB", 2),
    ];
    const result = autoAssignGuests({
      guests,
      tables: [table("Table 1", 4), table("Table 2", 4)],
      assignments: [],
      preferAdjacent: true,
      keepGroupsTogether: true,
    });
    const seats = result.assignments.map((row) => `${row.tableNumber}:${row.seatLabel}`);
    assert.equal(new Set(seats).size, seats.length);
    assert.equal(result.unresolvedGuestIds.length, 0);
  });

  it("detects duplicate seats and capacity overflow", () => {
    const assignments: StudioAssignment[] = [
      { guestId: "g1", tableNumber: "Table 1", seatLabel: "1" },
      { guestId: "g2", tableNumber: "Table 1", seatLabel: "1" },
      { guestId: "g3", tableNumber: "Table 1", seatLabel: "2" },
      { guestId: "g4", tableNumber: "Table 1", seatLabel: "3" },
    ];
    const conflicts = detectSeatingConflicts({
      guests: [guest("g1", "One", null), guest("g2", "Two", null), guest("g3", "Three", null), guest("g4", "Four", null)],
      tables: [table("Table 1", 2)],
      assignments,
    });
    assert.ok(conflicts.some((conflict) => conflict.code === "DUPLICATE_SEAT"));
    assert.ok(conflicts.some((conflict) => conflict.code === "TABLE_OVER_CAPACITY"));
  });

  it("keeps free-seat accounting accurate after partial fills", () => {
    const free = freeSeatLabels(table("Table 8", 5), [
      { guestId: "g1", tableNumber: "Table 8", seatLabel: "2" },
      { guestId: "g2", tableNumber: "8", seatLabel: "4" },
    ]);
    assert.deepEqual(free, ["1", "3", "5"]);
  });

  it("reports capacity distinguishing people represented from seat slots", () => {
    const snapshot = computeCapacitySnapshot({
      guests: [guest("g1", "Party", "inv1", 5)],
      tables: [table("Table 1", 8)],
      assignments: [{ guestId: "g1", tableNumber: "Table 1", seatLabel: "1" }],
    });
    assert.equal(snapshot.totalSeats, 8);
    assert.equal(snapshot.assignedSeats, 1);
    assert.equal(snapshot.peopleRepresented, 5);
  });

  it("hides guest seating until admission when configured", () => {
    const hidden = evaluateSeatingReveal({
      settings: { ...DEFAULT_STUDIO_SETTINGS, revealMode: "after_admission" },
      planStatus: "published",
      guestStatus: "ACCEPTED",
      admittedCount: 0,
    });
    assert.equal(hidden.visible, false);

    const visible = evaluateSeatingReveal({
      settings: { ...DEFAULT_STUDIO_SETTINGS, revealMode: "after_admission" },
      planStatus: "published",
      guestStatus: "CHECKED_IN",
      admittedCount: 2,
    });
    assert.equal(visible.visible, true);
  });

  it("keeps remaining party seats reserved after partial assignment", () => {
    const guests = [
      guest("g1", "Obuah", "inv1", 3),
      guest("g2", "Ama", "inv1", 3),
      guest("g3", "Kofi", "inv1", 3),
    ];
    const tables = [table("Table 6", 8)];
    const assignments: StudioAssignment[] = [
      { guestId: "g1", tableNumber: "Table 6", seatLabel: "1" },
      { guestId: "g2", tableNumber: "Table 6", seatLabel: "2" },
    ];
    const suggestions = suggestSeatingForParty({
      guests,
      guestId: "g3",
      tables,
      assignments,
      preferAdjacent: true,
    });
    assert.equal(suggestions[0]?.tableLabel, "Table 6");
    assert.deepEqual(suggestions[0]?.seatLabels, ["3"]);
    assert.deepEqual(freeSeatLabels(tables[0]!, assignments), ["3", "4", "5", "6", "7", "8"]);
  });
});
