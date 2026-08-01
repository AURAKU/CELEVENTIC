import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  detectCeremonyConflicts,
  generateCeremonyRows,
  suggestCeremonyForParty,
} from "../ceremony-engine";

describe("ceremony seating engine", () => {
  it("generates centre-aisle chair offsets", () => {
    const rows = generateCeremonyRows({
      rows: 2,
      chairsPerRow: 6,
      aisle: "centre",
      naming: "letters",
    });
    assert.equal(rows.length, 2);
    assert.equal(rows[0]?.label, "Row A");
    assert.equal(rows[0]?.chairs.length, 6);
    const left = rows[0]!.chairs[2]!;
    const right = rows[0]!.chairs[3]!;
    assert.ok((right.x ?? 0) - (left.x ?? 0) > 36, "centre aisle should widen the mid gap");
  });

  it("does not flag valid ceremony assignments as missing tables", () => {
    const rows = generateCeremonyRows({ rows: 3, chairsPerRow: 4, aisle: "centre" });
    const conflicts = detectCeremonyConflicts({
      guests: [{ id: "g1", name: "Ada", invitationId: "inv1" }],
      rows,
      assignments: [
        { guestId: "g1", tableNumber: rows[0]!.label, seatLabel: rows[0]!.chairs[0]!.label },
      ],
    });
    assert.equal(conflicts.filter((c) => c.code === "MISSING_TABLE").length, 0);
    assert.equal(conflicts.filter((c) => c.code === "MISSING_ROW").length, 0);
    assert.equal(conflicts.filter((c) => c.code === "MISSING_CHAIR").length, 0);
  });

  it("detects duplicate ceremony chairs and missing seats", () => {
    const rows = generateCeremonyRows({ rows: 1, chairsPerRow: 4 });
    const seat = rows[0]!.chairs[0]!.label;
    const conflicts = detectCeremonyConflicts({
      guests: [
        { id: "g1", name: "Ada" },
        { id: "g2", name: "Ben" },
      ],
      rows,
      assignments: [
        { guestId: "g1", tableNumber: rows[0]!.label, seatLabel: seat },
        { guestId: "g2", tableNumber: rows[0]!.label, seatLabel: seat },
        { guestId: "g3", tableNumber: "Row Z", seatLabel: "Z9" },
      ],
    });
    assert.ok(conflicts.some((c) => c.code === "DUPLICATE_SEAT"));
    assert.ok(conflicts.some((c) => c.code === "MISSING_ROW"));
  });

  it("suggests adjacent chairs preferring a section", () => {
    const rows = generateCeremonyRows({
      rows: 4,
      chairsPerRow: 6,
      sectionId: "general",
    }).map((row, index) =>
      index < 2 ? { ...row, sectionId: "bridal-family" } : row
    );
    const suggestions = suggestCeremonyForParty({
      rows,
      needed: 2,
      occupiedLabels: new Set(),
      preferSectionId: "bridal-family",
    });
    assert.ok(suggestions.length > 0);
    assert.equal(suggestions[0]?.sectionId, "bridal-family");
    assert.equal(suggestions[0]?.seatLabels.length, 2);
  });
});
