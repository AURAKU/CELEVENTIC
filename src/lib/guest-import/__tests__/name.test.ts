import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  analyseName,
  cleanName,
  nameKey,
  orderedNameKey,
  parseMemberNames,
  parsePartyType,
  stripTitles,
} from "../name";

/**
 * Name intelligence.
 *
 * The load-bearing assertion in this file is the one about FAMILY and GROUP:
 * a name can tell you a party is bigger than one, but never how much bigger,
 * so those must come back unconfirmed and force an organiser decision.
 */

describe("cleanName", () => {
  it("collapses whitespace and strips list punctuation", () => {
    assert.equal(cleanName("  Kofi   Mensah ,"), "Kofi Mensah");
    assert.equal(cleanName("- Ama Serwaa"), "Ama Serwaa");
  });

  it("normalises non-breaking spaces pasted from Word", () => {
    assert.equal(cleanName("Kofi\u00A0Mensah"), "Kofi Mensah");
  });
});

describe("stripTitles", () => {
  it("removes honorifics, including Ghanaian traditional ones", () => {
    assert.equal(stripTitles("Mr. Kofi Mensah"), "Kofi Mensah");
    assert.equal(stripTitles("Nana Ama Serwaa"), "Ama Serwaa");
    assert.equal(stripTitles("Rev. Dr. Kwame Boateng"), "Kwame Boateng");
    assert.equal(stripTitles("Alhaji Musah"), "Musah");
  });

  it("leaves an ordinary name alone", () => {
    assert.equal(stripTitles("Kofi Mensah"), "Kofi Mensah");
  });
});

describe("nameKey", () => {
  it("ignores case, accents, titles and punctuation", () => {
    assert.equal(nameKey("Mr. Kofi Mensah"), nameKey("kofi  mensah"));
    assert.equal(nameKey("Kwabena Adjeí"), nameKey("Kwabena Adjei"));
  });

  it("collides on reordered names so a duplicate surfaces for review", () => {
    assert.equal(nameKey("Kofi Mensah"), nameKey("Mensah Kofi"));
  });

  it("keeps different people apart", () => {
    assert.notEqual(nameKey("Kofi Mensah"), nameKey("Kofi Boateng"));
  });

  it("preserves order in the strict key", () => {
    assert.notEqual(orderedNameKey("Kofi Mensah"), orderedNameKey("Mensah Kofi"));
  });
});

describe("analyseName", () => {
  it("treats a plain name as one individual", () => {
    const result = analyseName("Ama Serwaa");
    assert.equal(result.partyType, "INDIVIDUAL");
    assert.equal(result.partySize, 1);
    assert.equal(result.allowanceConfirmed, true);
  });

  it("reads 'Mr & Mrs Boateng' as a couple admitting two", () => {
    const result = analyseName("Mr & Mrs Boateng");
    assert.equal(result.partyType, "COUPLE");
    assert.equal(result.partySize, 2);
    assert.equal(result.allowanceConfirmed, true);
    assert.deepEqual(result.memberNames, []);
  });

  it("reads 'Mr. and Mrs. Asante' the same way", () => {
    assert.equal(analyseName("Mr. and Mrs. Asante").partyType, "COUPLE");
  });

  it("shares a surname across a named couple", () => {
    const result = analyseName("Kofi & Ama Mensah");
    assert.equal(result.partyType, "COUPLE");
    assert.deepEqual(result.memberNames, ["Kofi Mensah", "Ama Mensah"]);
  });

  it("reads '+1' as a plus-guest admitting two", () => {
    const result = analyseName("Yaw Owusu +1");
    assert.equal(result.partyType, "PLUS_GUEST");
    assert.equal(result.partySize, 2);
    assert.equal(result.displayName, "Yaw Owusu +1");
  });

  it("reads '+ 2 guests'", () => {
    assert.equal(analyseName("Akosua Darko + 2 guests").partySize, 3);
  });

  it("reads 'and guest'", () => {
    const result = analyseName("Esi Amoah and Guest");
    assert.equal(result.partyType, "PLUS_GUEST");
    assert.equal(result.partySize, 2);
  });

  it("flags a family as needing a confirmed allowance", () => {
    const result = analyseName("The Asante Family");
    assert.equal(result.partyType, "FAMILY");
    assert.equal(result.allowanceConfirmed, false);
  });

  it("accepts a family allowance when the list states one", () => {
    const result = analyseName("The Asante Family (6)");
    assert.equal(result.partyType, "FAMILY");
    assert.equal(result.partySize, 6);
    assert.equal(result.allowanceConfirmed, true);
  });

  it("flags a group as needing a confirmed allowance", () => {
    const result = analyseName("Sunrise Choir");
    assert.equal(result.partyType, "GROUP");
    assert.equal(result.allowanceConfirmed, false);
  });

  it("accepts an explicit group count in several notations", () => {
    assert.equal(analyseName("Ushers Team x8").partySize, 8);
    assert.equal(analyseName("Rossy Ltd - 4 pax").partySize, 4);
    assert.equal(analyseName("Choir Group [12]").partySize, 12);
  });

  it("does not mistake a three-way list for a couple", () => {
    const result = analyseName("Kofi & Ama & Yaw");
    assert.notEqual(result.partyType, "COUPLE");
  });

  it("honours the default allowance for a plain individual", () => {
    assert.equal(analyseName("Kwesi Appiah", 2).partySize, 2);
  });

  it("returns a safe result for an empty name", () => {
    const result = analyseName("");
    assert.equal(result.partySize, 1);
    assert.equal(result.displayName, "");
  });
});

describe("parseMemberNames", () => {
  it("splits on the separators organisers actually use", () => {
    assert.deepEqual(parseMemberNames("Kofi; Ama; Yaw"), ["Kofi", "Ama", "Yaw"]);
    assert.deepEqual(parseMemberNames("Kofi and Ama"), ["Kofi", "Ama"]);
    assert.deepEqual(parseMemberNames("Kofi & Ama"), ["Kofi", "Ama"]);
  });

  it("returns nothing for an empty cell", () => {
    assert.deepEqual(parseMemberNames(""), []);
    assert.deepEqual(parseMemberNames(null), []);
  });
});

describe("parsePartyType", () => {
  it("reads an explicit type column", () => {
    assert.equal(parsePartyType("Couple"), "COUPLE");
    assert.equal(parsePartyType("family"), "FAMILY");
    assert.equal(parsePartyType("+1"), "PLUS_GUEST");
  });

  it("returns null for something it does not recognise", () => {
    assert.equal(parsePartyType("VIP"), null);
    assert.equal(parsePartyType(""), null);
  });
});
