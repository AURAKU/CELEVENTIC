import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { normalizeEmail, normalizeGhanaPhone, normalizePlainPhone } from "../contact";

/**
 * Contact normalisation.
 *
 * Ghana numbers arrive in at least six shapes and Excel eats leading zeros, so
 * every one of those shapes has a case here. Nothing may ever *reject* a row —
 * a bad number costs an SMS, not an invitation.
 */

describe("normalizeGhanaPhone", () => {
  const expected = "+233244123456";

  it("normalises a local 0-prefixed number", () => {
    const result = normalizeGhanaPhone("0244123456");
    assert.equal(result.value, expected);
    assert.equal(result.normalized, true);
    assert.equal(result.invalid, false);
  });

  it("normalises a spaced local number", () => {
    assert.equal(normalizeGhanaPhone("024 412 3456").value, expected);
  });

  it("normalises a dashed local number", () => {
    assert.equal(normalizeGhanaPhone("024-412-3456").value, expected);
  });

  it("normalises a country-code number without a plus", () => {
    assert.equal(normalizeGhanaPhone("233244123456").value, expected);
  });

  it("normalises an international-prefix number", () => {
    assert.equal(normalizeGhanaPhone("00233244123456").value, expected);
  });

  it("recovers the leading zero Excel stripped", () => {
    assert.equal(normalizeGhanaPhone("244123456").value, expected);
  });

  it("leaves an already-normalised number untouched", () => {
    const result = normalizeGhanaPhone("+233244123456");
    assert.equal(result.value, expected);
    assert.equal(result.normalized, false);
  });

  it("covers every Ghanaian mobile prefix family", () => {
    for (const prefix of ["020", "023", "024", "026", "027", "028", "050", "053", "054", "055", "056", "057", "059"]) {
      const result = normalizeGhanaPhone(`${prefix}1234567`);
      assert.equal(result.invalid, false, `${prefix} should be valid`);
      assert.ok(result.value?.startsWith("+233"), `${prefix} should normalise`);
    }
  });

  it("does not rewrite a foreign international number to +233", () => {
    const result = normalizeGhanaPhone("+44 7700 900123");
    assert.equal(result.value, "+447700900123");
    assert.equal(result.invalid, false);
  });

  it("flags digits that cannot be a phone number", () => {
    assert.equal(normalizeGhanaPhone("12").invalid, true);
    assert.equal(normalizeGhanaPhone("abc").invalid, true);
  });

  it("treats an empty cell as absent, not invalid", () => {
    const result = normalizeGhanaPhone("");
    assert.equal(result.value, null);
    assert.equal(result.invalid, false);
  });
});

describe("normalizePlainPhone", () => {
  it("keeps a number as typed when Ghana mode is off", () => {
    const result = normalizePlainPhone("0244123456");
    assert.equal(result.value, "0244123456");
    assert.equal(result.normalized, false);
  });
});

describe("normalizeEmail", () => {
  it("lowercases and accepts a valid address", () => {
    assert.equal(normalizeEmail("Kofi@Example.COM").value, "kofi@example.com");
  });

  it("extracts the address from a display-name form", () => {
    assert.equal(normalizeEmail("Kofi Mensah <kofi@example.com>").value, "kofi@example.com");
  });

  it("rejects a domain with no dot", () => {
    const result = normalizeEmail("kofi@gmail");
    assert.equal(result.value, null);
    assert.equal(result.invalid, true);
  });

  it("rejects an address with spaces", () => {
    assert.equal(normalizeEmail("kofi at example.com").invalid, true);
  });

  it("treats an empty cell as absent, not invalid", () => {
    const result = normalizeEmail("");
    assert.equal(result.value, null);
    assert.equal(result.invalid, false);
  });
});
