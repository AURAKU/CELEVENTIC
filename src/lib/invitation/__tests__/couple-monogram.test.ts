import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { coupleMonogramInitials, parseCoupleNames } from "@/lib/invitation-templates";

describe("couple monogram initials (P1-1)", () => {
  it("prefers host partner names over The Marriage of title prefixes", () => {
    const parsed = parseCoupleNames(
      "The Marriage of Amara & Kwame",
      "Amara Serwaa & Kwame Boateng"
    );
    assert.equal(parsed.name1, "Amara Serwaa");
    assert.equal(parsed.name2, "Kwame Boateng");
    assert.equal(coupleMonogramInitials(parsed.name1, parsed.name2), "AK");
  });

  it("strips marriage-of prefixes when host has a single name", () => {
    const parsed = parseCoupleNames("The Marriage of Amara & Kwame", "Family Host");
    assert.equal(coupleMonogramInitials(parsed.name1, parsed.name2), "AK");
  });
});
