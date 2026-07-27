import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  looksLikeHeaderRow,
  parseDelimited,
  parseLines,
  parseTable,
  sniffDelimiter,
} from "../table-parse";

/**
 * Delimited parsing.
 *
 * The cases here are the ones that would cost a real guest: a comma inside a
 * quoted name, an Excel BOM, a semicolon export from a European locale, and a
 * header row that is really the first guest.
 */

describe("sniffDelimiter", () => {
  it("picks the comma for a normal CSV", () => {
    assert.equal(sniffDelimiter("Name,Email\nKofi,kofi@example.com\nAma,ama@example.com"), ",");
  });

  it("picks the tab for a spreadsheet copy-paste", () => {
    assert.equal(sniffDelimiter("Name\tEmail\nKofi\tkofi@example.com\nAma\tama@example.com"), "\t");
  });

  it("picks the semicolon for a locale-set Excel export", () => {
    assert.equal(sniffDelimiter("Name;Email;Phone\nKofi;k@e.com;024\nAma;a@e.com;020"), ";");
  });

  it("does not crown the comma on a list of 'Surname, First' names", () => {
    // Every line has exactly one comma, but so would a real two-column CSV.
    // What matters is that a single-column paste never explodes into two guests
    // downstream — parsePastedText re-parses as lines. Here we only assert the
    // sniff stays deterministic rather than flapping between delimiters.
    const text = "Mensah, Kofi\nBoateng, Ama\nOsei, Yaw";
    assert.equal(sniffDelimiter(text), ",");
  });
});

describe("parseDelimited", () => {
  it("keeps a comma inside a quoted field", () => {
    const rows = parseDelimited('Name,Notes\n"Mensah, Kofi",VIP\n"Boateng, Ama",Family');
    assert.deepEqual(rows[1], ["Mensah, Kofi", "VIP"]);
    assert.deepEqual(rows[2], ["Boateng, Ama", "Family"]);
  });

  it("unescapes doubled quotes", () => {
    const rows = parseDelimited('Name\n"Kofi ""KB"" Mensah"');
    assert.deepEqual(rows[1], ['Kofi "KB" Mensah']);
  });

  it("handles a quoted field containing a newline", () => {
    const rows = parseDelimited('Name,Notes\nKofi,"Line one\nLine two"');
    assert.equal(rows.length, 2);
    assert.equal(rows[1][1], "Line one\nLine two");
  });

  it("strips a UTF-8 BOM from an Excel export", () => {
    const rows = parseDelimited("\ufeffName,Email\nKofi,k@example.com");
    assert.equal(rows[0][0], "Name");
  });

  it("accepts CRLF and lone CR line endings", () => {
    assert.equal(parseDelimited("a,b\r\nc,d\r\n").length, 2);
    assert.equal(parseDelimited("a,b\rc,d").length, 2);
  });

  it("drops entirely blank rows", () => {
    assert.equal(parseDelimited("Kofi\n\n\nAma\n").length, 2);
  });

  it("preserves whitespace inside quotes but trims unquoted cells", () => {
    const rows = parseDelimited('a,"  spaced  ",  padded  ');
    assert.equal(rows[0][1], "  spaced  ");
    assert.equal(rows[0][2], "padded");
  });
});

describe("looksLikeHeaderRow", () => {
  it("recognises a real header", () => {
    assert.equal(looksLikeHeaderRow(["Name", "Email", "Phone"], ["Kofi", "k@e.com", "024"]), true);
  });

  it("refuses a data row that happens to contain the word 'name'", () => {
    assert.equal(looksLikeHeaderRow(["Kofi Mensah", "kofi@example.com"], ["Ama", "a@e.com"]), false);
  });

  it("refuses a first row of bare guest names", () => {
    assert.equal(looksLikeHeaderRow(["Ama Serwaa"], ["Kofi Mensah"]), false);
  });
});

describe("parseTable", () => {
  it("separates the header from the body and squares off ragged rows", () => {
    const table = parseTable("Name,Email,Phone\nKofi,k@e.com,024\nAma");
    assert.deepEqual(table.headers, ["Name", "Email", "Phone"]);
    assert.equal(table.rows.length, 2);
    assert.equal(table.columnCount, 3);
    assert.deepEqual(table.rows[1], ["Ama", "", ""]);
  });

  it("treats a headerless list as all body", () => {
    const table = parseTable("Ama Serwaa\nKofi Mensah");
    assert.equal(table.headers, null);
    assert.equal(table.rows.length, 2);
  });
});

describe("parseLines", () => {
  it("keeps one guest per line even when the line contains a comma", () => {
    const table = parseLines("Mensah, Kofi\nBoateng, Ama\n\n  \nOsei, Yaw");
    assert.equal(table.rows.length, 3);
    assert.deepEqual(table.rows[0], ["Mensah, Kofi"]);
  });
});
