import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  generateTablesForGuests,
  normalizeTable,
  normalizeTableName,
  seatDisplayName,
  tableCaptionValue,
  tableDisplayName,
  tablesMatch,
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
    assert.equal(tableDisplayName(" table 2 "), "Table 2");
    assert.equal(tableDisplayName("Family A"), "Family A");
    assert.equal(tableDisplayName("VIP"), "VIP");
    assert.equal(tableDisplayName("Head Table"), "Head Table");
  });

  it("keeps caption values free of a repeated Table word", () => {
    assert.equal(tableCaptionValue("Table 1"), "1");
    assert.equal(tableCaptionValue("1"), "1");
    assert.equal(tableCaptionValue("TABLE"), "—");
    assert.equal(tableCaptionValue("Table"), "—");
    assert.equal(tableCaptionValue("Bridal Party"), "Bridal Party");
  });

  it("matches bare numbers with prefixed table labels", () => {
    assert.equal(tablesMatch("1", "Table 1"), true);
    assert.equal(tablesMatch(" table 1 ", "Table 1"), true);
    assert.equal(tablesMatch("VIP", "Table VIP"), true);
    assert.equal(tablesMatch("1", "Table 2"), false);
    assert.equal(tablesMatch("VIP", "Family A"), false);
  });

  it("formats seat labels without double prefixes", () => {
    assert.equal(seatDisplayName("3"), "Seat 3");
    assert.equal(seatDisplayName("Seat 3"), "Seat 3");
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
