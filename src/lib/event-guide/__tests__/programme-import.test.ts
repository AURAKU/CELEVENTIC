import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  mergeProgrammeEntries,
  parseProgrammePaste,
  stripPasteMarkup,
  toProgrammeItems,
} from "../programme-paste";

/**
 * `parseProgrammePaste` is the one pipeline behind both the builder's live
 * preview and the "import from text" action on `POST /api/event-guide`, so
 * these tests stand in for both surfaces.
 */
function importOutline(text: string) {
  return toProgrammeItems(parseProgrammePaste(text).entries);
}

describe("importing a pasted programme", () => {
  it("reads an em-dash outline into timed items", () => {
    const items = importOutline(
      "2:00 PM — Ceremony — Exchange of vows\n4:30 PM — Reception — Dinner is served"
    );
    assert.equal(items.length, 2);
    assert.equal(items[0]!.time, "2:00 PM");
    assert.equal(items[0]!.title, "Ceremony");
    assert.equal(items[0]!.description, "Exchange of vows");
    assert.equal(items[1]!.title, "Reception");
  });

  it("reads a pipe-separated outline", () => {
    const items = importOutline("2:00 PM | Ceremony\n4:30 PM | Reception");
    assert.equal(items.length, 2);
    assert.equal(items[0]!.time, "2:00 PM");
    assert.equal(items[0]!.title, "Ceremony");
  });

  it("reads the plain hyphen an organizer actually types", () => {
    const items = importOutline("1:00 PM - Guest Arrival\n1:30 PM - Opening Prayer");
    assert.equal(items.length, 2);
    assert.equal(items[0]!.time, "1:00 PM");
    assert.equal(items[0]!.title, "Guest Arrival");
    assert.equal(items[1]!.title, "Opening Prayer");
  });

  it("keeps a hyphen that belongs to the title", () => {
    const items = importOutline("6:00 PM - Father-daughter dance");
    assert.equal(items[0]!.title, "Father-daughter dance");
    assert.equal(items[0]!.description, undefined);
  });

  it("lifts a trailing time out of a prose line", () => {
    const items = importOutline("Ceremony at 2:00 PM");
    assert.equal(items[0]!.time, "2:00 PM");
    assert.equal(items[0]!.title, "Ceremony");
  });

  it("reads 24-hour and compact 12-hour times", () => {
    const items = importOutline("14:00 Ceremony\n3.30pm Kente parade\n7pm - Dinner");
    assert.equal(items[0]!.time, "14:00");
    assert.equal(items[0]!.title, "Ceremony");
    assert.equal(items[1]!.time, "3:30 PM");
    assert.equal(items[1]!.title, "Kente parade");
    assert.equal(items[2]!.time, "7 PM");
    assert.equal(items[2]!.title, "Dinner");
  });

  it("keeps both ends of a time range", () => {
    const items = importOutline("1:00 PM - 2:00 PM Guest arrival\n14:00-15:00 Cocktails");
    assert.equal(items[0]!.time, "1:00 PM – 2:00 PM");
    assert.equal(items[0]!.title, "Guest arrival");
    assert.equal(items[1]!.time, "14:00 – 15:00");
    assert.equal(items[1]!.title, "Cocktails");
  });

  it("accepts a plain list with no times at all", () => {
    const items = importOutline("Guest welcome\nCutting of the cake\nFirst dance");
    assert.equal(items.length, 3);
    assert.ok(items.every((item) => item.time === ""));
    assert.deepEqual(items.map((i) => i.title), [
      "Guest welcome",
      "Cutting of the cake",
      "First dance",
    ]);
  });

  it("ignores blank lines and stray whitespace", () => {
    const items = importOutline("\n  \n2:00 PM — Ceremony\n\n   \n4:30 PM — Reception\n\n");
    assert.equal(items.length, 2);
  });

  it("survives Windows line endings", () => {
    const items = importOutline("2:00 PM — Ceremony\r\n4:30 PM — Reception");
    assert.equal(items.length, 2);
    assert.equal(items[1]!.title, "Reception");
  });

  it("returns nothing for text that carries no programme", () => {
    assert.deepEqual(importOutline(""), []);
    assert.deepEqual(importOutline("   \n\n  "), []);
  });
});

describe("headings inside a pasted programme", () => {
  it("marks a bare upper-case line as a section", () => {
    const result = parseProgrammePaste(
      "1:00 PM - Guest Arrival\n1:30 PM - Opening Prayer\nCEREMONY\n2:00 PM - Exchange of Vows"
    );
    assert.equal(result.entries.length, 4);
    assert.equal(result.sectionCount, 1);
    assert.equal(result.entries[2]!.isSection, true);
    assert.equal(result.entries[2]!.title, "CEREMONY");
    assert.equal(result.entries[2]!.time, "");
    assert.ok(result.entries.filter((e) => !e.isSection).every((e) => e.time !== ""));
  });

  it("marks a line that ends in a colon and drops the colon", () => {
    const result = parseProgrammePaste("Reception:\n7:00 PM - Dinner");
    assert.equal(result.entries[0]!.isSection, true);
    assert.equal(result.entries[0]!.title, "Reception");
  });

  it("does not mistake an ordinary time-less item for a heading", () => {
    const result = parseProgrammePaste("Cutting of the cake\nSpeeches by the families");
    assert.equal(result.sectionCount, 0);
  });

  it("does not mistake a timed item for a heading", () => {
    const result = parseProgrammePaste("2:00 PM - EXCHANGE OF VOWS");
    assert.equal(result.sectionCount, 0);
  });

  it("reads a Ghanaian upper-case heading as a section", () => {
    const result = parseProgrammePaste("ƆDƆ NE ASOMDWEƐ\n2:00 PM - Vows");
    assert.equal(result.entries[0]!.isSection, true);
    assert.equal(result.entries[0]!.title, "ƆDƆ NE ASOMDWEƐ");
  });
});

describe("multi-line detail in a pasted programme", () => {
  it("folds an indented line into the item above it", () => {
    const items = importOutline(
      "2:00 PM - Exchange of Vows\n  Officiated by Rev. Mensah\n  Please stay seated\n4:00 PM - Photos"
    );
    assert.equal(items.length, 2);
    assert.equal(items[0]!.description, "Officiated by Rev. Mensah Please stay seated");
    assert.equal(items[1]!.title, "Photos");
  });

  it("keeps an indented bullet's text without its bullet", () => {
    const items = importOutline("2:00 PM - Vows\n  - Rings exchanged");
    assert.equal(items[0]!.description, "Rings exchanged");
  });

  it("leaves a flush-left programme alone", () => {
    const items = importOutline("2:00 PM - Vows\n4:00 PM - Photos");
    assert.equal(items.length, 2);
    assert.equal(items[0]!.description, undefined);
  });
});

describe("what a paste is not allowed to carry", () => {
  it("removes a script and its contents", () => {
    const result = parseProgrammePaste(
      "<script>alert('x')</script>\n2:00 PM - Ceremony"
    );
    assert.equal(result.entries.length, 1);
    assert.equal(result.entries[0]!.title, "Ceremony");
    assert.equal(result.strippedMarkup, true);
  });

  it("removes a script that was never closed", () => {
    const result = parseProgrammePaste("2:00 PM - Ceremony\n<script>while(true){}");
    assert.equal(result.entries.length, 1);
    assert.equal(result.entries[0]!.title, "Ceremony");
  });

  it("does not let an escaped tag reassemble itself", () => {
    const { text } = stripPasteMarkup("&lt;script&gt;alert(1)&lt;/script&gt;Ceremony");
    assert.ok(!text.includes("<script"));
    assert.ok(!text.includes("alert(1)"));
  });

  it("reads a programme copied as HTML into lines", () => {
    const items = importOutline(
      "<ul><li>2:00 PM - Ceremony</li><li>4:00 PM - <b>Reception</b></li></ul>"
    );
    assert.equal(items.length, 2);
    assert.equal(items[0]!.title, "Ceremony");
    assert.equal(items[1]!.title, "Reception");
  });

  it("strips an inline event handler with its tag", () => {
    const items = importOutline("2:00 PM - <img src=x onerror=alert(1)>Ceremony");
    assert.equal(items[0]!.title, "Ceremony");
  });

  it("leaves an ampersand in a real title alone", () => {
    const items = importOutline("6:00 PM - Mr & Mrs Owusu dance");
    assert.equal(items[0]!.title, "Mr & Mrs Owusu dance");
    assert.equal(parseProgrammePaste("6:00 PM - Mr & Mrs Owusu").strippedMarkup, false);
  });

  it("keeps Ghanaian and accented characters exactly as pasted", () => {
    const items = importOutline("1:00 PM - Akwaaba: Ɛyɛ adeɛ\n2:00 PM - Adowa & Kete");
    assert.equal(items[0]!.title, "Akwaaba: Ɛyɛ adeɛ");
    assert.equal(items[1]!.title, "Adowa & Kete");
  });

  it("drops zero-width characters a copied document sneaks in", () => {
    const { text, stripped } = stripPasteMarkup("2:00 PM - Cere\u200Bmony");
    assert.equal(text, "2:00 PM - Ceremony");
    assert.equal(stripped, true);
  });
});

describe("what the import guarantees downstream", () => {
  it("gives every imported item a distinct id, even for repeated titles", () => {
    const items = importOutline("Toasts\nToasts\nToasts");
    const ids = new Set(items.map((i) => i.id));
    assert.equal(items.length, 3);
    assert.equal(ids.size, 3);
  });

  it("caps a runaway paste so one import cannot bloat the payload", () => {
    const outline = Array.from({ length: 250 }, (_, i) => `Item ${i}`).join("\n");
    const result = parseProgrammePaste(outline);
    assert.equal(result.entries.length, 60);
    assert.equal(result.truncated, true);
  });

  it("truncates over-long titles and descriptions", () => {
    const items = importOutline(`2:00 PM — ${"T".repeat(400)} — ${"D".repeat(900)}`);
    assert.equal(items[0]!.title.length, 160);
    assert.equal(items[0]!.description!.length, 400);
  });

  it("produces items the published payload can carry verbatim", () => {
    const items = importOutline("2:00 PM — Ceremony — Exchange of vows");
    for (const item of items) {
      assert.deepEqual(Object.keys(item).sort(), ["description", "id", "time", "title"]);
    }
  });

  it("is stable — importing the same text twice yields the same items", () => {
    const text = "2:00 PM — Ceremony — Vows\n4:30 PM — Reception";
    assert.deepEqual(importOutline(text), importOutline(text));
  });
});

describe("folding a paste into the programme being edited", () => {
  const existing = [
    { id: "prog-1-arrival", time: "1:00 PM", title: "Arrival" },
    { id: "prog-2-vows", time: "2:00 PM", title: "Vows" },
  ];

  it("replaces the programme outright", () => {
    const incoming = importOutline("7:00 PM - Dinner");
    const merged = mergeProgrammeEntries(existing, incoming, "replace");
    assert.equal(merged.length, 1);
    assert.equal(merged[0]!.title, "Dinner");
  });

  it("appends after what is already there", () => {
    const incoming = importOutline("7:00 PM - Dinner");
    const merged = mergeProgrammeEntries(existing, incoming, "append");
    assert.deepEqual(merged.map((i) => i.title), ["Arrival", "Vows", "Dinner"]);
  });

  it("re-keys an append that would collide with an existing id", () => {
    const incoming = importOutline("1:00 PM - Arrival");
    const merged = mergeProgrammeEntries(existing, incoming, "append");
    assert.equal(merged.length, 3);
    assert.equal(new Set(merged.map((i) => i.id)).size, 3);
  });

  it("never grows the programme past the cap", () => {
    const many = Array.from({ length: 60 }, (_, i) => ({
      id: `existing-${i}`,
      time: "",
      title: `Item ${i}`,
    }));
    const merged = mergeProgrammeEntries(many, importOutline("Extra"), "append");
    assert.equal(merged.length, 60);
  });

  it("leaves the caller's array untouched", () => {
    const before = JSON.stringify(existing);
    mergeProgrammeEntries(existing, importOutline("7:00 PM - Dinner"), "append");
    assert.equal(JSON.stringify(existing), before);
  });
});
