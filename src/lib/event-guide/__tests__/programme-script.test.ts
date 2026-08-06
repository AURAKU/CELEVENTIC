import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parseProgrammeScript,
  programmeItemsToScript,
  sanitizeProgrammeScript,
} from "../programme-script";

/**
 * `parseProgrammeScript` is the one pipeline behind the builder's live preview,
 * `save_content` and the "import from text" action on `POST /api/event-guide`,
 * so these tests stand in for all three surfaces.
 */
function read(script: string) {
  return parseProgrammeScript(script).items;
}

describe("reading a programme script", () => {
  it("reads an em-dash outline into timed items", () => {
    const items = read(
      "2:00 PM — Ceremony — Exchange of vows\n4:30 PM — Reception — Dinner is served"
    );
    assert.equal(items.length, 2);
    assert.equal(items[0]!.time, "2:00 PM");
    assert.equal(items[0]!.title, "Ceremony");
    assert.equal(items[0]!.description, "Exchange of vows");
    assert.equal(items[1]!.title, "Reception");
  });

  it("reads a pipe-separated outline", () => {
    const items = read("2:00 PM | Ceremony\n4:30 PM | Reception");
    assert.equal(items.length, 2);
    assert.equal(items[0]!.time, "2:00 PM");
    assert.equal(items[0]!.title, "Ceremony");
  });

  it("reads the plain hyphen an organizer actually types", () => {
    const items = read("1:00 PM - Guest Arrival\n1:30 PM - Opening Prayer");
    assert.equal(items.length, 2);
    assert.equal(items[0]!.time, "1:00 PM");
    assert.equal(items[0]!.title, "Guest Arrival");
    assert.equal(items[1]!.title, "Opening Prayer");
  });

  it("keeps a hyphen that belongs to the title", () => {
    const items = read("6:00 PM - Father-daughter dance");
    assert.equal(items[0]!.title, "Father-daughter dance");
    assert.equal(items[0]!.description, undefined);
  });

  it("lifts a trailing time out of a prose line", () => {
    const items = read("Ceremony at 2:00 PM");
    assert.equal(items[0]!.time, "2:00 PM");
    assert.equal(items[0]!.title, "Ceremony");
  });

  it("reads 24-hour and compact 12-hour times", () => {
    const items = read("14:00 Ceremony\n3.30pm Kente parade\n7pm - Dinner");
    assert.equal(items[0]!.time, "14:00");
    assert.equal(items[0]!.title, "Ceremony");
    assert.equal(items[1]!.time, "3:30 PM");
    assert.equal(items[1]!.title, "Kente parade");
    assert.equal(items[2]!.time, "7 PM");
    assert.equal(items[2]!.title, "Dinner");
  });

  it("keeps both ends of a time range", () => {
    const items = read("1:00 PM - 2:00 PM Guest arrival\n14:00-15:00 Cocktails");
    assert.equal(items[0]!.time, "1:00 PM – 2:00 PM");
    assert.equal(items[0]!.title, "Guest arrival");
    assert.equal(items[1]!.time, "14:00 – 15:00");
    assert.equal(items[1]!.title, "Cocktails");
  });

  it("accepts a plain list with no times at all", () => {
    const items = read("Guest welcome\nCutting of the cake\nFirst dance");
    assert.equal(items.length, 3);
    assert.ok(items.every((item) => item.time === ""));
    assert.deepEqual(items.map((i) => i.title), [
      "Guest welcome",
      "Cutting of the cake",
      "First dance",
    ]);
  });

  it("ignores blank lines and stray whitespace", () => {
    const items = read("\n  \n2:00 PM — Ceremony\n\n   \n4:30 PM — Reception\n\n");
    assert.equal(items.length, 2);
  });

  it("survives Windows line endings", () => {
    const items = read("2:00 PM — Ceremony\r\n4:30 PM — Reception");
    assert.equal(items.length, 2);
    assert.equal(items[1]!.title, "Reception");
  });

  it("returns nothing for a script that carries no programme", () => {
    assert.deepEqual(read(""), []);
    assert.deepEqual(read("   \n\n  "), []);
  });
});

describe("headings inside a programme script", () => {
  it("marks a bare upper-case line as a heading", () => {
    const result = parseProgrammeScript(
      "1:00 PM - Guest Arrival\n1:30 PM - Opening Prayer\nCEREMONY\n2:00 PM - Exchange of Vows"
    );
    assert.equal(result.items.length, 4);
    assert.equal(result.sectionCount, 1);
    assert.equal(result.items[2]!.kind, "section");
    assert.equal(result.items[2]!.title, "CEREMONY");
    assert.equal(result.items[2]!.time, "");
    assert.ok(result.items.filter((i) => i.kind !== "section").every((i) => i.time !== ""));
  });

  it("marks a line that ends in a colon and drops the colon", () => {
    const result = parseProgrammeScript("Reception:\n7:00 PM - Dinner");
    assert.equal(result.items[0]!.kind, "section");
    assert.equal(result.items[0]!.title, "Reception");
  });

  it("leaves an ordinary item without a heading marker", () => {
    const result = parseProgrammeScript("Cutting of the cake\nSpeeches by the families");
    assert.equal(result.sectionCount, 0);
    assert.ok(result.items.every((item) => item.kind === undefined));
  });

  it("does not mistake a timed item for a heading", () => {
    assert.equal(parseProgrammeScript("2:00 PM - EXCHANGE OF VOWS").sectionCount, 0);
  });

  it("reads a Ghanaian upper-case heading as a heading", () => {
    const result = parseProgrammeScript("ƆDƆ NE ASOMDWEƐ\n2:00 PM - Vows");
    assert.equal(result.items[0]!.kind, "section");
    assert.equal(result.items[0]!.title, "ƆDƆ NE ASOMDWEƐ");
  });

  it("reads a Markdown heading as a heading", () => {
    const result = parseProgrammeScript("## The Ceremony\n2:00 PM - Vows");
    assert.equal(result.items[0]!.kind, "section");
    assert.equal(result.items[0]!.title, "The Ceremony");
    assert.equal(result.items[1]!.kind, undefined);
  });
});

describe("detail under an item", () => {
  it("folds an indented line into the item above it, one line each", () => {
    const items = read(
      "2:00 PM - Exchange of Vows\n  Officiated by Rev. Mensah\n  Please stay seated\n4:00 PM - Photos"
    );
    assert.equal(items.length, 2);
    assert.equal(items[0]!.description, "Officiated by Rev. Mensah\nPlease stay seated");
    assert.equal(items[1]!.title, "Photos");
  });

  it("folds a flush-left sentence into the item above it", () => {
    // The whole point of a script editor: an organizer writes a note under an
    // item without knowing that indentation was ever the rule.
    const items = read(
      "1:00 PM - Guest arrival\nWelcome drinks are served on the lawn.\n2:00 PM - Ceremony"
    );
    assert.equal(items.length, 2);
    assert.equal(items[0]!.description, "Welcome drinks are served on the lawn.");
    assert.equal(items[1]!.title, "Ceremony");
  });

  it("folds a line that opens in lower case into the item above it", () => {
    const items = read("2:00 PM - Vows\nrings are exchanged");
    assert.equal(items.length, 1);
    assert.equal(items[0]!.description, "rings are exchanged");
  });

  it("folds a bullet written under a timed item", () => {
    const items = read("2:00 PM - Vows\n- Rings exchanged\n- Signing of the register");
    assert.equal(items.length, 1);
    assert.equal(items[0]!.description, "Rings exchanged\nSigning of the register");
  });

  it("keeps a bulleted list with no times as separate items", () => {
    const items = read("- Guest welcome\n- Cutting of the cake\n- First dance");
    assert.deepEqual(items.map((i) => i.title), [
      "Guest welcome",
      "Cutting of the cake",
      "First dance",
    ]);
  });

  it("keeps a blank line between detail lines as a paragraph break", () => {
    const items = read(
      [
        "2:00 PM - Exchange of Vows",
        "  Officiated by Rev. Mensah of Calvary Methodist.",
        "",
        "  Guests are asked to stay seated until the recessional.",
        "4:00 PM - Photos",
      ].join("\n")
    );
    assert.equal(items.length, 2);
    assert.equal(
      items[0]!.description,
      "Officiated by Rev. Mensah of Calvary Methodist.\n\nGuests are asked to stay seated until the recessional."
    );
  });

  it("keeps the head line's detail above its indented paragraphs", () => {
    const items = read("2:00 PM - Vows — Exchange of rings\n  Music by the choir");
    assert.equal(items[0]!.description, "Exchange of rings\nMusic by the choir");
  });

  it("never leaves more than one blank line inside a detail", () => {
    const items = read("2:00 PM - Vows\n  First\n\n\n\n  Second");
    assert.equal(items[0]!.description, "First\n\nSecond");
  });

  it("leaves a flush-left programme of titles alone", () => {
    const items = read("2:00 PM - Vows\n4:00 PM - Photos");
    assert.equal(items.length, 2);
    assert.equal(items[0]!.description, undefined);
  });
});

describe("leaving nothing out", () => {
  const messyScript = [
    "PROGRAMME OF EVENTS",
    "",
    "12:30 PM Guests seated",
    "  Ushers will show you to your seats.",
    "",
    "1:00 PM — Procession — Kete drummers lead the party in",
    "CEREMONY",
    "2:00 PM Exchange of vows",
    "the rings are blessed before they are exchanged.",
    "- Reading: 1 Corinthians 13",
    "🎂 Cutting of the cake",
    "18:30 晚宴 — 自助餐",
    "٢:٠٠ م - الزفاف",
    "Toasts and speeches",
  ].join("\n");

  it("puts every written line somewhere in the programme", () => {
    const items = read(messyScript);
    const haystack = items
      .map((item) => `${item.time}\n${item.title}\n${item.description ?? ""}`)
      .join("\n");

    const meaningfulLines = messyScript
      .split("\n")
      .map((line) => line.replace(/^[\s\-–—•*]+/, "").trim())
      .filter((line) => /[\p{L}\p{N}]/u.test(line));

    for (const line of meaningfulLines) {
      // The reader may split a line into a time, a title and a detail, so the
      // check is that each of its words survived rather than the exact line.
      for (const word of line.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w))) {
        assert.ok(
          haystack.includes(word),
          `"${word}" from "${line}" was dropped by the reader`
        );
      }
    }
  });

  it("reads that script into headings and items rather than one blob", () => {
    const result = parseProgrammeScript(messyScript);
    assert.equal(result.sectionCount, 2);
    assert.ok(result.items.length >= 8, `expected the items to stay separate, got ${result.items.length}`);
    assert.equal(result.truncated, false);
  });

  it("moves the tail of a very long line into its detail instead of cutting it", () => {
    const tail = "and then the whole party walks to the reception hall together";
    const long = `2:00 PM - ${"Procession of the families ".repeat(9)}${tail}`;
    const items = read(long);
    assert.equal(items.length, 1);
    assert.ok(items[0]!.title.length <= 200);
    assert.ok(items[0]!.description!.includes(tail), "the end of the line survived");
  });
});

describe("the scripts an organizer actually writes in", () => {
  it("keeps Ghanaian orthography and its tone marks", () => {
    const items = read("1:00 PM - Akwaaba: Ɛyɛ adeɛ \u200Bɔdɔ\n2:00 PM - Ŋkɔmɔdie");
    assert.equal(items[0]!.title, "Akwaaba: Ɛyɛ adeɛ ɔdɔ");
    assert.equal(items[1]!.title, "Ŋkɔmɔdie");
  });

  it("keeps an Arabic programme exactly as written", () => {
    const items = read("14:00 حفل الزفاف\n16:00 استقبال الضيوف");
    assert.equal(items[0]!.time, "14:00");
    assert.equal(items[0]!.title, "حفل الزفاف");
    assert.equal(items[1]!.title, "استقبال الضيوف");
  });

  it("keeps a line whose clock is written in Arabic-Indic digits", () => {
    // We cannot read that time, but losing the line would be far worse than
    // leaving the organizer to move the numerals into a time of their own.
    const items = read("٢:٠٠ م - الزفاف");
    assert.equal(items.length, 1);
    assert.equal(items[0]!.title, "٢:٠٠ م - الزفاف");
  });

  it("reads a Chinese running order", () => {
    const items = read("14:00 婚礼仪式\n18:30 晚宴 — 自助餐与致辞");
    assert.equal(items[0]!.time, "14:00");
    assert.equal(items[0]!.title, "婚礼仪式");
    assert.equal(items[1]!.title, "晚宴");
    assert.equal(items[1]!.description, "自助餐与致辞");
  });

  it("keeps a zero-width joiner that holds a word or an emoji together", () => {
    const { text, stripped } = sanitizeProgrammeScript("2:00 PM - می\u200Cرود 👨\u200D👩\u200D👧");
    assert.ok(text.includes("می\u200Cرود"), "the Persian non-joiner survived");
    assert.ok(text.includes("👨\u200D👩\u200D👧"), "the family emoji survived");
    assert.equal(stripped, false);
  });

  it("keeps an emoji that belongs to the title", () => {
    assert.equal(read("🎂 Cutting of the cake")[0]!.title, "🎂 Cutting of the cake");
  });

  it("reads an emoji used as a bullet before a time", () => {
    const items = read("🎉 2:00 PM - Ceremony");
    assert.equal(items[0]!.time, "2:00 PM");
    assert.equal(items[0]!.title, "Ceremony");
  });

  it("keeps curly quotes and dashes that came out of Word", () => {
    const items = read("6:00 PM — “Ɔdɔ” dance — Mr & Mrs Owusu’s first dance");
    assert.equal(items[0]!.title, "“Ɔdɔ” dance");
    assert.equal(items[0]!.description, "Mr & Mrs Owusu’s first dance");
  });

  it("keeps a less-than sign that is not a tag", () => {
    const result = parseProgrammeScript("2:00 PM - Doors close < 6pm\nSession A <-> Session B");
    assert.equal(result.items[0]!.title, "Doors close < 6pm");
    assert.equal(result.items[1]!.title, "Session A <-> Session B");
    assert.equal(result.strippedMarkup, false);
  });

  it("stores an accented letter in one composed form", () => {
    const { text } = sanitizeProgrammeScript("2:00 PM - Cafe\u0301 reception");
    assert.equal(text, "2:00 PM - Café reception");
  });
});

describe("scripts that arrive out of Word, Excel and WhatsApp", () => {
  it("splits on a lone carriage return", () => {
    const items = read("2:00 PM - Ceremony\r4:30 PM - Reception");
    assert.deepEqual(items.map((i) => i.title), ["Ceremony", "Reception"]);
  });

  it("splits on the soft break Word writes inside a paragraph", () => {
    const items = read("2:00 PM - Ceremony\u000B4:30 PM - Reception");
    assert.deepEqual(items.map((i) => i.title), ["Ceremony", "Reception"]);
  });

  it("splits on Unicode line and paragraph separators", () => {
    const items = read("2:00 PM - Ceremony\u20284:30 PM - Reception\u20296:00 PM - Dinner");
    assert.equal(items.length, 3);
    assert.equal(items[2]!.title, "Dinner");
  });

  it("reads a non-breaking space as a space", () => {
    const items = read("2:00\u00A0PM\u00A0-\u00A0Ceremony");
    assert.equal(items[0]!.time, "2:00 PM");
    assert.equal(items[0]!.title, "Ceremony");
  });

  it("drops a soft hyphen without touching the word", () => {
    assert.equal(read("4:30 PM - Recep\u00ADtion")[0]!.title, "Reception");
  });

  it("unwraps WhatsApp emphasis", () => {
    const result = parseProgrammeScript("*CEREMONY*\n2:00 PM - _Vows_ and *rings*");
    assert.equal(result.items[0]!.title, "CEREMONY");
    assert.equal(result.items[0]!.kind, "section");
    assert.equal(result.items[1]!.title, "_Vows_ and rings");
  });

  it("decodes the entities an HTML paste carries", () => {
    const items = read("2:00 PM &ndash; Ceremony &amp; Vows\n4:00 PM &ndash; Caf&eacute;");
    assert.equal(items[0]!.title, "Ceremony & Vows");
    assert.equal(items[1]!.title, "Café");
  });

  it("keeps a line break a copied table wrote as a tag", () => {
    const items = read("<p>2:00 PM - Ceremony<br>4:30 PM - Reception</p>");
    assert.deepEqual(items.map((i) => i.title), ["Ceremony", "Reception"]);
  });
});

describe("what a script is not allowed to carry", () => {
  it("removes a script tag and its contents", () => {
    const result = parseProgrammeScript("<script>alert('x')</script>\n2:00 PM - Ceremony");
    assert.equal(result.items.length, 1);
    assert.equal(result.items[0]!.title, "Ceremony");
    assert.equal(result.strippedMarkup, true);
  });

  it("removes a script tag that was never closed", () => {
    const result = parseProgrammeScript("2:00 PM - Ceremony\n<script>while(true){}");
    assert.equal(result.items.length, 1);
    assert.equal(result.items[0]!.title, "Ceremony");
  });

  it("does not let an escaped tag reassemble itself", () => {
    const { text } = sanitizeProgrammeScript("&lt;script&gt;alert(1)&lt;/script&gt;Ceremony");
    assert.ok(!text.includes("<script"));
    assert.ok(!text.includes("alert(1)"));
  });

  it("strips an inline event handler with its tag", () => {
    assert.equal(read("2:00 PM - <img src=x onerror=alert(1)>Ceremony")[0]!.title, "Ceremony");
  });

  it("leaves an ampersand in a real title alone", () => {
    const items = read("6:00 PM - Mr & Mrs Owusu dance");
    assert.equal(items[0]!.title, "Mr & Mrs Owusu dance");
    assert.equal(parseProgrammeScript("6:00 PM - Mr & Mrs Owusu").strippedMarkup, false);
  });

  it("drops zero-width spaces a copied document sneaks in", () => {
    const { text, stripped } = sanitizeProgrammeScript("2:00 PM - Cere\u200Bmony");
    assert.equal(text, "2:00 PM - Ceremony");
    assert.equal(stripped, true);
  });
});

describe("what the script guarantees downstream", () => {
  it("gives every item a distinct id, even for repeated titles", () => {
    const items = read("Toasts\nToasts\nToasts");
    assert.equal(items.length, 3);
    assert.equal(new Set(items.map((i) => i.id)).size, 3);
  });

  it("caps a runaway script so one paste cannot bloat the payload", () => {
    const script = Array.from({ length: 400 }, (_, i) => `Item ${i}`).join("\n");
    const result = parseProgrammeScript(script);
    assert.equal(result.items.length, 150);
    assert.equal(result.truncated, true);
  });

  it("shortens a detail that runs past what the guide stores, and says so", () => {
    const result = parseProgrammeScript(`2:00 PM — Ceremony\n  ${"detail ".repeat(400)}`);
    assert.equal(result.items[0]!.description!.length, 2000);
    assert.equal(result.shortened, true);
  });

  it("does not claim to have shortened an ordinary script", () => {
    assert.equal(parseProgrammeScript("2:00 PM — Ceremony — Vows").shortened, false);
  });

  it("produces items the published payload can carry verbatim", () => {
    for (const item of read("2:00 PM — Ceremony — Exchange of vows")) {
      assert.deepEqual(Object.keys(item).sort(), ["description", "id", "time", "title"]);
    }
  });

  it("marks a heading with the one extra key a heading needs", () => {
    const [heading] = read("CEREMONY");
    assert.deepEqual(Object.keys(heading!).sort(), ["id", "kind", "time", "title"]);
  });

  it("is stable — reading the same script twice yields the same items", () => {
    const script = "2:00 PM — Ceremony — Vows\n4:30 PM — Reception";
    assert.deepEqual(read(script), read(script));
  });
});

describe("writing a programme back out as a script", () => {
  const script = [
    "12:30 PM — Guests seated",
    "  Ushers will show you to your seats.",
    "",
    "  Please silence your phones.",
    "CEREMONY",
    "2:00 PM — Exchange of vows",
    "Reception:",
    "7:00 PM — Dinner",
  ].join("\n");

  it("round-trips a programme through the script and back", () => {
    const items = read(script);
    const rewritten = programmeItemsToScript(items);
    const reread = read(rewritten);

    assert.deepEqual(
      reread.map((i) => [i.time, i.title, i.description ?? "", i.kind ?? ""]),
      items.map((i) => [i.time, i.title, i.description ?? "", i.kind ?? ""])
    );
  });

  it("writes an inherited programme as a script an organizer can edit", () => {
    const written = programmeItemsToScript([
      { id: "a", time: "1:00 PM", title: "Arrival" },
      { id: "b", time: "", title: "Reception", kind: "section" },
      { id: "c", time: "7:00 PM", title: "Dinner", description: "Buffet service" },
    ]);

    assert.equal(written, "1:00 PM — Arrival\nReception:\n7:00 PM — Dinner\n  Buffet service");
  });

  it("writes nothing for a programme with nothing in it", () => {
    assert.equal(programmeItemsToScript([]), "");
  });
});
