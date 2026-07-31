import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mappingFromSuggestions, suggestColumnMapping, validateMapping } from "../column-detect";
import { normalizeRows } from "../normalize";
import { buildDuplicateIndex, markDuplicates, markSeatConflicts, summarizeRows } from "../dedupe";
import { escapeCsvValue, isFormulaLike, sanitizeImportedCell, toCsv } from "../csv-safety";
import { parseTable } from "../table-parse";
import { parsePastedText } from "../parse-source";
import { DEFAULT_IMPORT_OPTIONS, ImportField, mergeImportOptions } from "../types";

/**
 * Mapping, normalisation, duplicates and CSV safety.
 *
 * These are the rules that decide what an organiser is shown before anything
 * is created — the last checkpoint before a wrong guest list becomes a
 * thousand wrong invitations.
 */

const OPTIONS = mergeImportOptions(DEFAULT_IMPORT_OPTIONS);

describe("suggestColumnMapping", () => {
  it("maps a conventional header row", () => {
    const table = parseTable("Name,Email,Phone\nKofi Mensah,kofi@example.com,0244123456");
    const mapping = mappingFromSuggestions(suggestColumnMapping(table));
    assert.equal(mapping[0], ImportField.NAME);
    assert.equal(mapping[1], ImportField.EMAIL);
    assert.equal(mapping[2], ImportField.PHONE);
  });

  it("trusts the data over a vague header", () => {
    const table = parseTable(
      "Guest,Contact\nKofi Mensah,kofi@example.com\nAma Serwaa,ama@example.com\nYaw Osei,yaw@example.com"
    );
    const mapping = mappingFromSuggestions(suggestColumnMapping(table));
    assert.equal(mapping[1], ImportField.EMAIL, "a 'Contact' column full of emails is an email column");
  });

  it("finds the name column in a headerless paste", () => {
    const table = parseTable("Kofi Mensah,0244123456\nAma Serwaa,0201234567");
    const mapping = mappingFromSuggestions(suggestColumnMapping(table));
    assert.equal(mapping[0], ImportField.NAME);
    assert.equal(mapping[1], ImportField.PHONE);
  });

  it("never maps two columns onto the same field", () => {
    const table = parseTable(
      "Name,Full Name,Email\nKofi,Kofi Mensah,kofi@example.com\nAma,Ama Serwaa,ama@example.com"
    );
    const mapping = mappingFromSuggestions(suggestColumnMapping(table));
    const nameColumns = Object.values(mapping).filter((f) => f === ImportField.NAME);
    assert.equal(nameColumns.length, 1);
  });

  it("recognises seating and allowance columns", () => {
    const table = parseTable(
      "Guest name,Party size,Table,Seat\nKofi Mensah,2,3,3A\nAma Serwaa,1,4,4B"
    );
    const mapping = mappingFromSuggestions(suggestColumnMapping(table));
    assert.equal(mapping[1], ImportField.PARTY_SIZE);
    assert.equal(mapping[2], ImportField.TABLE_NUMBER);
    assert.equal(mapping[3], ImportField.SEAT_LABEL);
  });
});

describe("validateMapping", () => {
  it("requires a name column", () => {
    const result = validateMapping({ 0: ImportField.EMAIL });
    assert.equal(result.valid, false);
    assert.match(result.error!, /guest name/i);
  });

  it("refuses a double-booked field", () => {
    const result = validateMapping({ 0: ImportField.NAME, 1: ImportField.NAME });
    assert.equal(result.valid, false);
  });

  it("accepts a minimal name-only mapping", () => {
    assert.equal(validateMapping({ 0: ImportField.NAME }).valid, true);
  });
});

describe("normalizeRows", () => {
  it("imports a name-only guest as READY", () => {
    const table = parsePastedText("Ama Serwaa\nKofi Mensah");
    const rows = normalizeRows(table, { 0: ImportField.NAME }, OPTIONS);
    assert.equal(rows.length, 2);
    assert.equal(rows[0].status, "READY");
    assert.equal(rows[0].email, null);
    assert.equal(rows[0].phone, null);
    assert.equal(rows[0].partySize, 1);
    assert.equal(rows[0].decision, "CREATE");
  });

  it("marks a nameless row INVALID and skips it, without failing its neighbours", () => {
    const table = parseTable("Name,Email\n,orphan@example.com\nKofi Mensah,kofi@example.com");
    const rows = normalizeRows(table, { 0: ImportField.NAME, 1: ImportField.EMAIL }, OPTIONS);
    assert.equal(rows[0].status, "INVALID");
    assert.equal(rows[0].decision, "SKIP");
    assert.equal(rows[1].status, "READY");
  });

  it("keeps a guest whose email is malformed, downgrading to review", () => {
    const table = parseTable("Name,Email\nKofi Mensah,kofi@gmail");
    const rows = normalizeRows(table, { 0: ImportField.NAME, 1: ImportField.EMAIL }, OPTIONS);
    assert.equal(rows[0].status, "NEEDS_REVIEW");
    assert.equal(rows[0].email, null);
    assert.ok(rows[0].issues.some((i) => i.code === "INVALID_EMAIL"));
  });

  it("normalises a Ghana phone and records it as an informational note", () => {
    const table = parseTable("Name,Phone\nKofi Mensah,0244123456");
    const rows = normalizeRows(table, { 0: ImportField.NAME, 1: ImportField.PHONE }, OPTIONS);
    assert.equal(rows[0].phone, "+233244123456");
    assert.equal(rows[0].status, "READY");
  });

  it("requires confirmation before honouring a family allowance", () => {
    const table = parsePastedText("The Asante Family");
    const rows = normalizeRows(table, { 0: ImportField.NAME }, OPTIONS);
    assert.equal(rows[0].partyType, "FAMILY");
    assert.equal(rows[0].status, "NEEDS_REVIEW");
    assert.ok(rows[0].issues.some((i) => i.code === "ALLOWANCE_NEEDS_CONFIRMATION"));
  });

  it("accepts a family allowance supplied in a party-size column", () => {
    const table = parseTable("Name,Party size\nThe Asante Family,6");
    const rows = normalizeRows(table, { 0: ImportField.NAME, 1: ImportField.PARTY_SIZE }, OPTIONS);
    assert.equal(rows[0].partySize, 6);
    assert.equal(rows[0].status, "READY");
  });

  it("caps an implausible allowance instead of trusting it", () => {
    const table = parseTable("Name,Party size\nKofi Mensah,500");
    const rows = normalizeRows(table, { 0: ImportField.NAME, 1: ImportField.PARTY_SIZE }, OPTIONS);
    assert.equal(rows[0].partySize, OPTIONS.maxPartySize);
    assert.ok(rows[0].issues.some((i) => i.code === "PARTY_SIZE_CAPPED"));
  });

  it("detects a couple and gives it two heads", () => {
    const table = parsePastedText("Mr & Mrs Boateng");
    const rows = normalizeRows(table, { 0: ImportField.NAME }, OPTIONS);
    assert.equal(rows[0].partyType, "COUPLE");
    assert.equal(rows[0].partySize, 2);
    assert.equal(rows[0].status, "READY");
  });

  it("parses Tags into tagLabels without blocking the row", () => {
    const table = parseTable(
      "Guest name,Tags\nKofi Mensah,\"Friends of groom, Family of bride\""
    );
    const rows = normalizeRows(
      table,
      { 0: ImportField.NAME, 1: ImportField.TAGS },
      OPTIONS
    );
    assert.deepEqual(rows[0].tagLabels, ["Friends of groom", "Family of bride"]);
    assert.equal(rows[0].status, "READY");
  });
});

describe("downloadable template", () => {
  it("maps every template header onto the matching import field", async () => {
    const { TEMPLATE_HEADERS } = await import("../template");
    const { toCsv } = await import("../csv-safety");
    const table = parseTable(
      toCsv([[...TEMPLATE_HEADERS], ["Ama Serwaa", "", "", "1", "Individual", "", "Friends of bride", "", "", "", ""]])
    );
    const mapping = mappingFromSuggestions(suggestColumnMapping(table));
    assert.equal(mapping[0], ImportField.NAME);
    assert.equal(mapping[1], ImportField.EMAIL);
    assert.equal(mapping[2], ImportField.PHONE);
    assert.equal(mapping[3], ImportField.PARTY_SIZE);
    assert.equal(mapping[4], ImportField.PARTY_TYPE);
    assert.equal(mapping[5], ImportField.MEMBER_NAMES);
    assert.equal(mapping[6], ImportField.TAGS);
    assert.equal(mapping[7], ImportField.GROUP_NAME);
    assert.equal(mapping[8], ImportField.TABLE_NUMBER);
    assert.equal(mapping[9], ImportField.SEAT_LABEL);
    assert.equal(mapping[10], ImportField.NOTES);

    const rows = normalizeRows(table, mapping, OPTIONS);
    assert.equal(rows[0].name, "Ama Serwaa");
    assert.equal(rows[0].partySize, 1);
    assert.equal(rows[0].partyType, "INDIVIDUAL");
    assert.deepEqual(rows[0].tagLabels, ["Friends of bride"]);
  });
});

describe("CSV injection", () => {
  it("recognises every spreadsheet formula trigger", () => {
    for (const payload of ["=1+1", "+1", "-1+1", "@SUM(A1)", "\tcmd", "\rcmd"]) {
      assert.equal(isFormulaLike(payload), true, payload);
    }
  });

  it("strips a formula prefix from an imported name", () => {
    const result = sanitizeImportedCell("=cmd|'/c calc'!A1");
    assert.equal(result.stripped, true);
    assert.ok(!result.value.startsWith("="));
  });

  it("strips repeated triggers in one pass", () => {
    const result = sanitizeImportedCell("==@=Kofi");
    assert.equal(result.value, "Kofi");
  });

  it("leaves a genuine negative number alone", () => {
    assert.equal(sanitizeImportedCell("-2").value, "-2");
  });

  it("removes embedded control characters", () => {
    assert.equal(sanitizeImportedCell("Kofi\u0000Mensah").value, "KofiMensah");
  });

  it("neutralises a formula on export with a leading quote", () => {
    assert.equal(escapeCsvValue("=HYPERLINK(\"http://evil\")"), '"\'=HYPERLINK(""http://evil"")"');
  });

  it("quotes values containing delimiters", () => {
    assert.equal(escapeCsvValue("Mensah, Kofi"), '"Mensah, Kofi"');
  });

  it("writes a BOM so Excel reads accents correctly", () => {
    assert.ok(toCsv([["Adjeí"]]).startsWith("\ufeff"));
  });

  it("carries a sanitised name through the whole import path", () => {
    const table = parsePastedText("=cmd|'/c calc'!A1 Mensah\nAma Serwaa");
    const rows = normalizeRows(table, { 0: ImportField.NAME }, OPTIONS);
    assert.ok(!rows[0].name.startsWith("="));
    assert.ok(rows[0].issues.some((i) => i.code === "FORMULA_STRIPPED"));
  });
});

describe("markDuplicates", () => {
  const emptyIndex = buildDuplicateIndex([], []);

  it("flags a repeated name later in the same file", () => {
    const table = parsePastedText("Kofi Mensah\nAma Serwaa\nKofi Mensah");
    const rows = markDuplicates(
      normalizeRows(table, { 0: ImportField.NAME }, OPTIONS),
      emptyIndex,
      OPTIONS
    );
    assert.equal(rows[0].status, "READY");
    assert.equal(rows[2].status, "DUPLICATE");
    assert.equal(rows[2].duplicateOfRowIndex, 0);
  });

  it("flags a shared phone number even when the names differ", () => {
    const table = parseTable("Name,Phone\nKofi Mensah,0244123456\nKofi M.,0244123456");
    const rows = markDuplicates(
      normalizeRows(table, { 0: ImportField.NAME, 1: ImportField.PHONE }, OPTIONS),
      emptyIndex,
      OPTIONS
    );
    assert.equal(rows[1].status, "DUPLICATE");
  });

  it("flags a guest the event already has", () => {
    const index = buildDuplicateIndex(
      [{ guestId: "g1", invitationId: "i1", name: "Kofi Mensah", email: null, phone: null }],
      []
    );
    const rows = markDuplicates(
      normalizeRows(parsePastedText("Kofi Mensah"), { 0: ImportField.NAME }, OPTIONS),
      index,
      OPTIONS
    );
    assert.equal(rows[0].status, "DUPLICATE");
    assert.equal(rows[0].duplicateOfGuestId, "g1");
  });

  it("never merges silently — the default decision is skip until reviewed", () => {
    const table = parsePastedText("Kofi Mensah\nKofi Mensah");
    const rows = markDuplicates(
      normalizeRows(table, { 0: ImportField.NAME }, OPTIONS),
      emptyIndex,
      { duplicatePolicy: "REVIEW" }
    );
    assert.equal(rows[1].decision, "SKIP");
  });

  it("honours a create-anyway policy when the organiser sets one", () => {
    const table = parsePastedText("Kofi Mensah\nKofi Mensah");
    const rows = markDuplicates(
      normalizeRows(table, { 0: ImportField.NAME }, OPTIONS),
      emptyIndex,
      { duplicatePolicy: "CREATE_ANYWAY" }
    );
    assert.equal(rows[1].decision, "CREATE");
  });

  it("does not flag two genuinely different guests", () => {
    const table = parsePastedText("Kofi Mensah\nKofi Boateng");
    const rows = markDuplicates(
      normalizeRows(table, { 0: ImportField.NAME }, OPTIONS),
      emptyIndex,
      OPTIONS
    );
    assert.equal(rows[1].status, "READY");
  });
});

describe("markSeatConflicts", () => {
  it("flags two rows claiming the same chair", () => {
    const table = parseTable("Name,Table,Seat\nKofi,3,3A\nAma,3,3A");
    const rows = markSeatConflicts(
      normalizeRows(
        table,
        { 0: ImportField.NAME, 1: ImportField.TABLE_NUMBER, 2: ImportField.SEAT_LABEL },
        OPTIONS
      )
    );
    assert.equal(rows[1].status, "NEEDS_REVIEW");
    assert.ok(rows[1].issues.some((i) => i.code === "SEAT_CONFLICT"));
  });

  it("flags a chair already taken on the event", () => {
    const table = parseTable("Name,Table,Seat\nKofi,3,3A");
    const rows = markSeatConflicts(
      normalizeRows(
        table,
        { 0: ImportField.NAME, 1: ImportField.TABLE_NUMBER, 2: ImportField.SEAT_LABEL },
        OPTIONS
      ),
      new Set(["3::3a"])
    );
    assert.equal(rows[0].status, "NEEDS_REVIEW");
  });

  it("allows several guests at the same table with no seat label", () => {
    const table = parseTable("Name,Table\nKofi,3\nAma,3");
    const rows = markSeatConflicts(
      normalizeRows(table, { 0: ImportField.NAME, 1: ImportField.TABLE_NUMBER }, OPTIONS)
    );
    assert.equal(rows[1].status, "READY");
  });
});

describe("summarizeRows", () => {
  it("counts heads only for rows that will be created", () => {
    const table = parsePastedText("Mr & Mrs Boateng\nAma Serwaa\nKofi Mensah\nKofi Mensah");
    const rows = markDuplicates(
      normalizeRows(table, { 0: ImportField.NAME }, OPTIONS),
      buildDuplicateIndex([], []),
      OPTIONS
    );
    const summary = summarizeRows(rows);
    assert.equal(summary.total, 4);
    assert.equal(summary.duplicate, 1);
    // 2 (couple) + 1 + 1; the skipped duplicate contributes nothing.
    assert.equal(summary.heads, 4);
  });
});
