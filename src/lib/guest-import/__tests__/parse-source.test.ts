import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parsePastedText } from "../parse-source";
import { mappingFromSuggestions, suggestColumnMapping } from "../column-detect";
import { normalizeRows } from "../normalize";
import { mergeImportOptions } from "../types";

/**
 * Pasted text: table or name list?
 *
 * This is the highest-stakes guess the importer makes, and it is invisible
 * when it goes wrong. Splitting "Mensah, Kofi" like a two-column CSV imports a
 * guest called "Mensah" and drops the rest, with no warning and nothing in the
 * preview to suggest anything was lost. So the cases below are written from
 * what organisers actually paste, and each asserts the *guest names that come
 * out the far end*, not just the intermediate shape.
 */

/** Run a paste through the full staging pipeline, as the API does. */
function importedRows(text: string) {
  const table = parsePastedText(text);
  const mapping = mappingFromSuggestions(suggestColumnMapping(table));
  return {
    source: table.source,
    rows: normalizeRows(table, mapping, mergeImportOptions()).map((row) => ({
      name: row.name,
      email: row.email,
      phone: row.phone,
      partyType: row.partyType,
      partySize: row.partySize,
    })),
  };
}

describe("parsePastedText — name lists", () => {
  it("keeps a 'Surname, First' list whole instead of importing surnames only", () => {
    const { source, rows } = importedRows("Mensah, Kofi\nBoateng, Ama\nOsei, Yaw");

    assert.equal(source, "PASTE_LINES");
    assert.deepEqual(
      rows.map((r) => r.name),
      ["Mensah, Kofi", "Boateng, Ama", "Osei, Yaw"]
    );
  });

  it("is not fooled by a single comma-bearing line in a list of bare names", () => {
    const { source, rows } = importedRows("Ama Serwaa\nKofi Mensah\nMensah, Kofi\nYaw Osei");

    assert.equal(source, "PASTE_LINES");
    assert.equal(rows.length, 4);
    assert.equal(rows[2].name, "Mensah, Kofi");
  });

  it("keeps a 'Surname, First' line whole even when another line has contacts", () => {
    // The mix that defeats a delimiter-only heuristic: one line splits into
    // three real fields, another splits into a name that must not be split.
    const { source, rows } = importedRows(
      [
        "Ama Serwaa",
        "Mensah, Adjoa",
        "Kwabena Osei, kwabena@example.com, 0244123456",
      ].join("\n")
    );

    assert.equal(source, "PASTE_LINES");
    assert.deepEqual(
      rows.map((r) => r.name),
      ["Ama Serwaa", "Mensah, Adjoa", "Kwabena Osei"]
    );
    assert.equal(rows[2].email, "kwabena@example.com");
    assert.equal(rows[2].phone, "+233244123456");
  });

  it("preserves the party markers a bare-name paste carries", () => {
    const { rows } = importedRows(
      "Ama Serwaa\nMr & Mrs Boateng\nKofi Mensah +1\nThe Asante Family"
    );

    assert.deepEqual(
      rows.map((r) => [r.partyType, r.partySize]),
      [
        ["INDIVIDUAL", 1],
        ["COUPLE", 2],
        ["PLUS_GUEST", 2],
        ["FAMILY", 2],
      ]
    );
  });
});

describe("parsePastedText — contact details on the line", () => {
  it("splits a name from the email and phone beside it", () => {
    const { rows } = importedRows(
      "Ama Serwaa\nKwabena Osei, kwabena@example.com, 0244123456"
    );

    assert.equal(rows[0].name, "Ama Serwaa");
    assert.equal(rows[0].email, null);
    assert.deepEqual(
      [rows[1].name, rows[1].email, rows[1].phone],
      ["Kwabena Osei", "kwabena@example.com", "+233244123456"]
    );
  });

  it("reads a WhatsApp-style contact dump separated by colons and dashes", () => {
    const { source, rows } = importedRows(
      "Kofi Mensah: 0244123456\nAma Serwaa - ama@example.com\nNana Serwaa-Boateng"
    );

    assert.equal(source, "PASTE_LINES");
    assert.equal(rows[0].name, "Kofi Mensah");
    assert.equal(rows[0].phone, "+233244123456");
    assert.equal(rows[1].name, "Ama Serwaa");
    assert.equal(rows[1].email, "ama@example.com");
    // A hyphenated surname is a name, not a separator.
    assert.equal(rows[2].name, "Nana Serwaa-Boateng");
  });

  it("does not mistake a plus-one marker for a phone number", () => {
    const { rows } = importedRows("Yaw Osei +1, yaw@example.com");

    assert.equal(rows[0].name, "Yaw Osei +1");
    assert.equal(rows[0].email, "yaw@example.com");
    assert.equal(rows[0].phone, null);
    assert.equal(rows[0].partySize, 2);
  });
});

describe("parsePastedText — real tables", () => {
  it("reads a spreadsheet copy-paste with a header row", () => {
    const { source, rows } = importedRows(
      "Name,Email,Phone,Party size\nKofi Mensah,k@e.com,0244123456,2\nAma Serwaa,a@e.com,0201234567,1"
    );

    assert.equal(source, "PASTE_TABLE");
    assert.deepEqual(
      rows.map((r) => [r.name, r.email, r.partySize]),
      [
        ["Kofi Mensah", "k@e.com", 2],
        ["Ama Serwaa", "a@e.com", 1],
      ]
    );
  });

  it("reads a headerless tab paste where the second column is clearly contact", () => {
    const { source, rows } = importedRows("Kofi Mensah\tk@e.com\nAma Serwaa\ta@e.com");

    assert.equal(source, "PASTE_TABLE");
    assert.deepEqual(
      rows.map((r) => [r.name, r.email]),
      [
        ["Kofi Mensah", "k@e.com"],
        ["Ama Serwaa", "a@e.com"],
      ]
    );
  });

  it("reads a headerless 'name, allowance' list as an allowance column", () => {
    const { rows } = importedRows("Kofi Mensah, 4\nAma Serwaa, 2");

    assert.deepEqual(
      rows.map((r) => [r.name, r.partySize]),
      [
        ["Kofi Mensah", 4],
        ["Ama Serwaa", 2],
      ]
    );
  });

  it("rejects an empty paste with something the organiser can act on", () => {
    assert.throws(() => parsePastedText("   \n  "), /at least one guest name/i);
  });
});
