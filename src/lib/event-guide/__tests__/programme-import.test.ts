import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseProgrammeOutline } from "@/lib/admission/companion-studio";
import { normalizeProgrammeItems } from "../content";

/**
 * The guide's import is `parseProgrammeOutline` followed by the guide's own
 * normalisation — the same pipeline `POST /api/event-guide` runs for the
 * "import from text" action. These tests cover the composition, since the
 * parser itself is covered in the companion-studio suite.
 */
function importOutline(text: string) {
  return normalizeProgrammeItems(parseProgrammeOutline(text));
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

  it("lifts a trailing time out of a prose line", () => {
    const items = importOutline("Ceremony at 2:00 PM");
    assert.equal(items[0]!.time, "2:00 PM");
    assert.equal(items[0]!.title, "Ceremony");
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

describe("what the import guarantees downstream", () => {
  it("gives every imported item a distinct id, even for repeated titles", () => {
    const items = importOutline("Toasts\nToasts\nToasts");
    const ids = new Set(items.map((i) => i.id));
    assert.equal(items.length, 3);
    assert.equal(ids.size, 3);
  });

  it("caps a runaway paste so one import cannot bloat the payload", () => {
    const outline = Array.from({ length: 250 }, (_, i) => `Item ${i}`).join("\n");
    assert.equal(importOutline(outline).length, 60);
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
