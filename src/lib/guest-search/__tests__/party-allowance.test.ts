import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_PARTY_SIZE,
  MIN_PARTY_SIZE,
  clampPartySize,
  describeAllowance,
  suggestAllowance,
} from "../party-allowance";

/**
 * Party allowance.
 *
 * This number decides how many people a door lets through, so the tests that
 * matter are the defensive ones: nonsense must not become a number, and a name
 * that cannot imply a size must come back asking rather than guessing.
 */

describe("clampPartySize", () => {
  it("keeps a sane number", () => {
    assert.equal(clampPartySize(4), 4);
  });

  it("pulls out-of-range values back to the bounds", () => {
    assert.equal(clampPartySize(0), MIN_PARTY_SIZE);
    assert.equal(clampPartySize(-3), MIN_PARTY_SIZE);
    assert.equal(clampPartySize(500), MAX_PARTY_SIZE);
  });

  it("floors fractions rather than admitting half a person", () => {
    assert.equal(clampPartySize(2.9), 2);
  });

  it("falls back when the input is not a number at all", () => {
    assert.equal(clampPartySize("abc", 3), 3);
    assert.equal(clampPartySize(Number.NaN, 2), 2);
    assert.equal(clampPartySize(undefined, 5), 5);
  });

  it("reads a numeric string, because that is what an input gives you", () => {
    assert.equal(clampPartySize("6"), 6);
  });
});

describe("suggestAllowance", () => {
  it("defaults a plain name to one confirmed head", () => {
    const suggestion = suggestAllowance("Kofi Obuah");
    assert.equal(suggestion.partySize, 1);
    assert.equal(suggestion.partyType, "INDIVIDUAL");
    assert.equal(suggestion.confirmed, true);
  });

  it("reads a couple as two", () => {
    const suggestion = suggestAllowance("Mr & Mrs Obuah");
    assert.equal(suggestion.partySize, 2);
    assert.equal(suggestion.partyType, "COUPLE");
    assert.equal(suggestion.confirmed, true);
  });

  it("reads an explicit plus-one", () => {
    const suggestion = suggestAllowance("Kofi Boateng +1");
    assert.equal(suggestion.partySize, 2);
    assert.equal(suggestion.partyType, "PLUS_GUEST");
  });

  it("refuses to guess the size of a family", () => {
    const suggestion = suggestAllowance("The Mensah Family");
    assert.equal(suggestion.partyType, "FAMILY");
    assert.equal(suggestion.confirmed, false);
    assert.ok(suggestion.hint, "an unconfirmed allowance must explain itself");
  });

  it("trusts a family size the organiser wrote down", () => {
    const suggestion = suggestAllowance("The Mensah Family (5)");
    assert.equal(suggestion.partySize, 5);
    assert.equal(suggestion.confirmed, true);
  });

  it("never proposes more than the ceiling", () => {
    assert.equal(suggestAllowance("Ushers Team (200)").partySize, MAX_PARTY_SIZE);
  });

  it("handles an empty name without throwing", () => {
    const suggestion = suggestAllowance("");
    assert.equal(suggestion.partySize, 1);
  });
});

describe("describeAllowance", () => {
  it("uses the singular for one", () => {
    assert.equal(describeAllowance(1), "Admits 1 person");
    assert.equal(describeAllowance(3), "Admits 3 people");
  });
});
