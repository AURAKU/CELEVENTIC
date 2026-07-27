import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  highlightRanges,
  parseSearchQuery,
  phoneSuffix,
  rankCandidates,
  scoreCandidate,
  searchKeyFor,
  searchKeyWithoutTitles,
  type RankableCandidate,
} from "../query";

/**
 * Query understanding and ranking.
 *
 * The load-bearing assertions here are the ones about *ordering*. Anyone can
 * make a search return the right row; what makes this usable at a door is that
 * the right row is first — an exact admission code must beat a name that
 * merely contains the same digits, and a surname prefix must beat a mid-word
 * substring.
 */

function candidate(partial: Partial<RankableCandidate> & { name: string }): RankableCandidate {
  return { id: partial.name, ...partial };
}

describe("parseSearchQuery", () => {
  it("ignores queries too short to be meaningful", () => {
    assert.equal(parseSearchQuery("").isEmpty, true);
    assert.equal(parseSearchQuery("k").isEmpty, true);
    assert.equal(parseSearchQuery("ko").isEmpty, false);
  });

  it("reads a bare 4- or 6-digit run as an admission code", () => {
    assert.equal(parseSearchQuery("4821").code, "4821");
    assert.equal(parseSearchQuery("482137").code, "482137");
    // Five digits is neither shape the gate prints.
    assert.equal(parseSearchQuery("48213").code, null);
  });

  it("reads a longer digit run as a phone number", () => {
    const parsed = parseSearchQuery("024 412 3456");
    assert.equal(parsed.phoneDigits, "0244123456");
    assert.ok(parsed.kinds.includes("phone"));
  });

  it("treats a 4-digit run as both a code and a possible table", () => {
    const parsed = parseSearchQuery("4821");
    assert.equal(parsed.code, "4821");
    // Four digits is above the table cutoff, so it stays a code, not a table.
    assert.equal(parsed.tableNumber, null);
  });

  it("recognises an email", () => {
    assert.equal(parseSearchQuery("Kofi@Example.COM").email, "kofi@example.com");
    assert.equal(parseSearchQuery("kofi at example.com").email, null);
  });

  it("recognises the ways a table gets typed", () => {
    assert.equal(parseSearchQuery("table 12").tableNumber, "12");
    assert.equal(parseSearchQuery("T5").tableNumber, "5");
    assert.equal(parseSearchQuery("tbl-A2").tableNumber, "A2");
    assert.equal(parseSearchQuery("12").tableNumber, "12");
  });

  it("strips titles and accents from name tokens", () => {
    assert.deepEqual(parseSearchQuery("Mr Kofi Adjeí").tokens, ["kofi", "adjei"]);
    assert.deepEqual(parseSearchQuery("Nana Ama").tokens, ["ama"]);
  });
});

describe("searchKeyFor", () => {
  it("folds accents, case and punctuation", () => {
    assert.equal(searchKeyFor("Adjeí-Mensah"), "adjei mensah");
    assert.equal(searchKeyFor("  O'Brien  "), "o brien");
  });

  it("keeps titles unless asked to strip them", () => {
    assert.equal(searchKeyFor("Mr Kofi"), "mr kofi");
    assert.equal(searchKeyWithoutTitles("Mr Kofi"), "kofi");
  });
});

describe("phoneSuffix", () => {
  it("reduces local and international forms to the same nine digits", () => {
    assert.equal(phoneSuffix("0244123456"), "244123456");
    assert.equal(phoneSuffix("+233244123456"), "244123456");
    assert.equal(phoneSuffix("024 412 3456"), "244123456");
  });
});

describe("scoreCandidate", () => {
  it("matches a name typed in the wrong order", () => {
    const query = parseSearchQuery("obuah kofi");
    const match = scoreCandidate(query, candidate({ name: "Mr Kofi Obuah" }));
    assert.ok(match, "reversed name order must still match");
    assert.equal(match!.field, "name");
  });

  it("matches a partial surname", () => {
    const match = scoreCandidate(parseSearchQuery("obu"), candidate({ name: "Mr Kofi Obuah" }));
    assert.ok(match);
  });

  it("refuses a token that appears nowhere", () => {
    const match = scoreCandidate(
      parseSearchQuery("kofi mensah"),
      candidate({ name: "Mr Kofi Obuah" })
    );
    assert.equal(match, null, "every typed token must find a home");
  });

  it("finds a guest by a named party member", () => {
    const match = scoreCandidate(
      parseSearchQuery("ama"),
      candidate({ name: "Mr & Mrs Obuah", memberNames: ["Kofi Obuah", "Ama Obuah"] })
    );
    assert.ok(match);
    assert.equal(match!.field, "member");
  });

  it("matches a phone typed locally against one stored internationally", () => {
    const match = scoreCandidate(
      parseSearchQuery("0244123456"),
      candidate({ name: "Kofi Obuah", phone: "+233244123456" })
    );
    assert.ok(match);
    assert.equal(match!.field, "phone");
  });

  it("finds an accented name typed without accents", () => {
    const match = scoreCandidate(parseSearchQuery("adjei"), candidate({ name: "Kwame Adjeí" }));
    assert.ok(match, "accent folding must work in both directions");
  });

  it("ignores an unrelated candidate", () => {
    assert.equal(scoreCandidate(parseSearchQuery("kofi"), candidate({ name: "Ama Serwaa" })), null);
  });
});

describe("rankCandidates", () => {
  it("puts an exact admission code above a name containing the same digits", () => {
    const ranked = rankCandidates(parseSearchQuery("4821"), [
      candidate({ name: "Table 4821 Group", tableNumber: "4821" }),
      candidate({ name: "Kofi Obuah", code: "4821" }),
    ]);
    assert.equal(ranked[0].candidate.name, "Kofi Obuah");
    assert.equal(ranked[0].match.field, "code");
  });

  it("puts an exact name above a partial one", () => {
    const ranked = rankCandidates(parseSearchQuery("kofi obuah"), [
      candidate({ name: "Kofi Obuah Junior" }),
      candidate({ name: "Kofi Obuah" }),
    ]);
    assert.equal(ranked[0].candidate.name, "Kofi Obuah");
  });

  it("puts a name prefix above a party-member match", () => {
    const ranked = rankCandidates(parseSearchQuery("ama"), [
      candidate({ name: "Mr & Mrs Obuah", memberNames: ["Kofi Obuah", "Ama Obuah"] }),
      candidate({ name: "Ama Serwaa" }),
    ]);
    assert.equal(ranked[0].candidate.name, "Ama Serwaa");
  });

  it("drops everything that did not match", () => {
    const ranked = rankCandidates(parseSearchQuery("kofi"), [
      candidate({ name: "Ama Serwaa" }),
      candidate({ name: "Yaw Boateng" }),
    ]);
    assert.equal(ranked.length, 0);
  });

  it("breaks ties on recency so the list does not jump between keystrokes", () => {
    const older = candidate({ name: "Kofi Mensah", updatedAt: new Date("2026-01-01") });
    const newer = candidate({ name: "Kofi Mensah", updatedAt: new Date("2026-06-01") });
    const ranked = rankCandidates(parseSearchQuery("kofi mensah"), [older, newer]);
    assert.equal(ranked[0].candidate.updatedAt, newer.updatedAt);
  });

  it("honours the limit", () => {
    const many = Array.from({ length: 30 }, (_, i) => candidate({ name: `Kofi ${i}` }));
    assert.equal(rankCandidates(parseSearchQuery("kofi"), many, 5).length, 5);
  });
});

describe("highlightRanges", () => {
  it("marks the typed tokens at word boundaries", () => {
    const ranges = highlightRanges("Mr Kofi Obuah", parseSearchQuery("kofi"));
    assert.deepEqual(ranges, [[3, 7]]);
  });

  it("lines up against the original accented text", () => {
    const ranges = highlightRanges("Kwame Adjeí", parseSearchQuery("adjei"));
    assert.deepEqual(ranges, [[6, 11]]);
  });

  it("does not highlight inside a word", () => {
    assert.deepEqual(highlightRanges("Ananse", parseSearchQuery("an")), [[0, 2]]);
  });

  it("merges overlapping ranges", () => {
    const ranges = highlightRanges("Kofi Kofiman", parseSearchQuery("kofi kof"));
    assert.deepEqual(ranges, [
      [0, 4],
      [5, 9],
    ]);
  });
});
