import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  generateTablesForGuests,
  normalizeTable,
  normalizeTableName,
  tableDisplayName,
} from "../seating-types";

describe("seating table names", () => {
  it("repairs duplicate legacy Table prefixes without changing custom names", () => {
    assert.equal(normalizeTableName(" Table   Table 1 "), "Table 1");
    assert.equal(normalizeTableName("table TABLE Table 2"), "Table 2");
    assert.equal(normalizeTableName("Bridal Party"), "Bridal Party");
  });

  it("prefixes numeric display names exactly once", () => {
    assert.equal(tableDisplayName("1"), "Table 1");
    assert.equal(tableDisplayName("Table 1"), "Table 1");
    assert.equal(tableDisplayName("Table Table 1"), "Table 1");
    assert.equal(tableDisplayName("Family A"), "Family A");
  });

  it("generates custom table names and preserves seat settings", () => {
    const tables = generateTablesForGuests(17, 8, "round", "VIP");
    assert.deepEqual(
      tables.map((table) => table.label),
      ["VIP 1", "VIP 2", "VIP 3"]
    );
    assert.ok(tables.every((table) => table.seatCount === 8 && table.capacity === 8));
  });

  it("normalizes legacy table records", () => {
    assert.equal(
      normalizeTable({
        id: "one",
        label: "Table Table 1",
        shape: "square",
        capacity: 6,
      }).label,
      "Table 1"
    );
  });
});
