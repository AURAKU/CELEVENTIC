import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  generateCeremonyRows,
  findAdjacentCeremonyChairs,
  suggestCeremonyForParty,
} from "../ceremony-engine";
import {
  computePeopleRepresented,
  computePeopleSeatingStats,
  requiredTablesForPeople,
} from "../people-stats";
import { pickSeatingAssignment, splitSeatingAssignments } from "../assignment-pick";

describe("dual-stage seating", () => {
  it("generates ceremony chairs only with centre aisle spacing", () => {
    const rows = generateCeremonyRows({ rows: 3, chairsPerRow: 8, aisle: "centre", naming: "letters" });
    assert.equal(rows.length, 3);
    assert.equal(rows[0]?.label, "Row A");
    assert.equal(rows[0]?.chairs.length, 8);
    assert.equal(rows[0]?.chairs[0]?.label, "A1");
    assert.ok((rows[0]?.chairs[4]?.x ?? 0) > (rows[0]?.chairs[3]?.x ?? 0) + 36);
  });

  it("finds adjacent ceremony chairs for a party of five", () => {
    const rows = generateCeremonyRows({ rows: 2, chairsPerRow: 10, naming: "letters" });
    const occupied = new Set(["A1", "A2"]);
    const match = findAdjacentCeremonyChairs(rows, 5, occupied);
    assert.ok(match);
    assert.equal(match!.chairs.length, 5);
    assert.deepEqual(
      match!.chairs.map((chair) => chair.label),
      ["A3", "A4", "A5", "A6", "A7"]
    );
  });

  it("suggests ceremony seating with explainable reasons", () => {
    const rows = generateCeremonyRows({ rows: 4, chairsPerRow: 6, naming: "letters" });
    const suggestions = suggestCeremonyForParty({
      rows,
      needed: 3,
      occupiedLabels: new Set(),
    });
    assert.ok(suggestions.length > 0);
    assert.equal(suggestions[0]?.seatLabels.length, 3);
    assert.match(suggestions[0]?.reason ?? "", /adjacent|Row/i);
  });

  it("counts people from party allowance, not invitation records", () => {
    const guests = [
      { invitationId: "a", partySize: 1, status: "ACCEPTED" },
      { invitationId: "b", partySize: 2, status: "ACCEPTED" },
      { invitationId: "c", partySize: 5, status: "INVITED" },
    ];
    assert.equal(computePeopleRepresented(guests), 8);
    const stats = computePeopleSeatingStats({
      guests,
      assignedGuestIds: new Set(),
      guestCountSource: "MAXIMUM_INVITED",
    });
    assert.equal(stats.invitationRecords, 3);
    assert.equal(stats.expectedPeople, 8);
    assert.equal(stats.maximumInvitedPeople, 8);
  });

  it("calculates required reception tables from expected people", () => {
    const result = requiredTablesForPeople(111, 8);
    assert.equal(result.tables, 14);
    assert.equal(result.capacity, 112);
    assert.equal(result.spare, 1);
  });

  it("splits ceremony and reception assignments for the same guest", () => {
    const assignments = [
      { id: "1", seatingPlan: { planType: "RECEPTION" } },
      { id: "2", seatingPlan: { planType: "CEREMONY" } },
    ];
    assert.equal(pickSeatingAssignment(assignments, "RECEPTION")?.id, "1");
    assert.equal(pickSeatingAssignment(assignments, "CEREMONY")?.id, "2");
    const split = splitSeatingAssignments(assignments);
    assert.equal(split.reception?.id, "1");
    assert.equal(split.ceremony?.id, "2");
  });
});
