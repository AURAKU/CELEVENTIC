import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ADMISSION_CODE_PATTERN,
  LONG_CODE_LENGTH,
  SHORT_CODE_LENGTH,
  codeFromRandom,
  codeSpace,
  formatAdmissionCode,
  isAdmissionCode,
  normalizeAdmissionCode,
  resolveCodeLength,
} from "../pass-code";

test("4-digit codes are the default for ordinary events", () => {
  assert.equal(resolveCodeLength(1), SHORT_CODE_LENGTH);
  assert.equal(resolveCodeLength(250), SHORT_CODE_LENGTH);
  assert.equal(resolveCodeLength(4000), SHORT_CODE_LENGTH);
});

test("codes widen to 6 digits when the guest list needs the capacity", () => {
  // Above 40% density of the 10,000-code space, collisions and guessability
  // both get uncomfortable — promote before that happens, not after.
  assert.equal(resolveCodeLength(4001), LONG_CODE_LENGTH);
  assert.equal(resolveCodeLength(25_000), LONG_CODE_LENGTH);
});

test("an explicit 6-digit setting is always honoured; 4 never shrinks a big event", () => {
  assert.equal(resolveCodeLength(10, LONG_CODE_LENGTH), LONG_CODE_LENGTH);
  assert.equal(resolveCodeLength(10, SHORT_CODE_LENGTH), SHORT_CODE_LENGTH);
  assert.equal(
    resolveCodeLength(9000, SHORT_CODE_LENGTH),
    LONG_CODE_LENGTH,
    "capacity must win over a stale 4-digit preference"
  );
});

test("codeFromRandom always yields a padded code inside the space", () => {
  for (const length of [SHORT_CODE_LENGTH, LONG_CODE_LENGTH]) {
    for (const seed of [0, 7, 9999, 123456, -42, 10 ** 9 + 7]) {
      const code = codeFromRandom(seed, length);
      assert.equal(code.length, length);
      assert.match(code, /^\d+$/);
      assert.ok(Number(code) < codeSpace(length));
    }
  }
});

test("code space grows as expected", () => {
  assert.equal(codeSpace(SHORT_CODE_LENGTH), 10_000);
  assert.equal(codeSpace(LONG_CODE_LENGTH), 1_000_000);
});

test("only 4- and 6-digit codes are accepted", () => {
  assert.ok(isAdmissionCode("0000"));
  assert.ok(isAdmissionCode("123456"));
  assert.ok(isAdmissionCode(" 4321 "));
  assert.equal(isAdmissionCode("123"), false);
  assert.equal(isAdmissionCode("12345"), false);
  assert.equal(isAdmissionCode("1234567"), false);
  assert.equal(isAdmissionCode("12ab"), false);
  assert.equal(ADMISSION_CODE_PATTERN.test("abcd"), false);
});

test("operator input is normalised before comparison", () => {
  assert.equal(normalizeAdmissionCode("12 34"), "1234");
  assert.equal(normalizeAdmissionCode("123-456"), "123456");
  assert.equal(normalizeAdmissionCode(" 0 0 0 0 "), "0000");
});

test("6-digit codes display as readable triplets", () => {
  assert.equal(formatAdmissionCode("1234"), "1234");
  assert.equal(formatAdmissionCode("123456"), "123 456");
  assert.equal(formatAdmissionCode("123 456"), "123 456");
});
