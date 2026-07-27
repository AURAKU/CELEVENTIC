import test from "node:test";
import assert from "node:assert/strict";

import {
  MoneyError,
  amountsMatch,
  currencyExponent,
  formatMinor,
  parseSuggestedAmounts,
  toMajorUnits,
  toMinorUnits,
  validateGiftAmount,
  type AmountRule,
} from "../money";

test("toMinorUnits keeps money exact for GHS", () => {
  assert.equal(toMinorUnits("120"), 12000);
  assert.equal(toMinorUnits("120.5"), 12050);
  assert.equal(toMinorUnits("120.55"), 12055);
  assert.equal(toMinorUnits("0.01"), 1);
  assert.equal(toMinorUnits(250), 25000);
  assert.equal(toMinorUnits("1,250.00"), 125000);
});

test("toMinorUnits rejects anything it cannot represent exactly", () => {
  assert.throws(() => toMinorUnits("120.555"), MoneyError);
  assert.throws(() => toMinorUnits("-10"), MoneyError);
  assert.throws(() => toMinorUnits("abc"), MoneyError);
  assert.throws(() => toMinorUnits(""), MoneyError);
  assert.throws(() => toMinorUnits("1e5"), MoneyError);
});

test("currency exponents drive conversion, not a hardcoded 100", () => {
  assert.equal(currencyExponent("GHS"), 2);
  assert.equal(currencyExponent("jpy"), 0);
  assert.equal(currencyExponent("KWD"), 3);
  assert.equal(toMinorUnits("1200", "JPY"), 1200);
  assert.throws(() => toMinorUnits("12.5", "JPY"), MoneyError);
  assert.equal(toMinorUnits("1.234", "KWD"), 1234);
});

test("float round-tripping never corrupts a balance", () => {
  // 0.1 + 0.2 in floats is the classic failure; minor units must be immune.
  const total = toMinorUnits("0.10") + toMinorUnits("0.20");
  assert.equal(total, 30);
  assert.equal(toMajorUnits(total), 0.3);
});

test("formatMinor renders from the integer", () => {
  assert.equal(formatMinor(12000), "GHS 120.00");
  assert.equal(formatMinor(1, "GHS"), "GHS 0.01");
  assert.equal(formatMinor(12000, "GHS", { withSymbol: false }), "120.00");
});

const rule: AmountRule = {
  minAmountMinor: 500,
  maxAmountMinor: 100000,
  allowCustomAmount: true,
  suggestedAmountsMinor: [5000, 10000],
  currency: "GHS",
};

test("validateGiftAmount is the server-side gate", () => {
  assert.deepEqual(validateGiftAmount(5000, rule), { ok: true, amountMinor: 5000 });

  assert.equal(validateGiftAmount(499, rule).ok, false);
  assert.equal(validateGiftAmount(100001, rule).ok, false);
  assert.equal(validateGiftAmount(0, rule).ok, false);
  assert.equal(validateGiftAmount(-5000, rule).ok, false);
  assert.equal(validateGiftAmount(50.5, rule).ok, false);
  assert.equal(validateGiftAmount("5000", rule).ok, false);
  assert.equal(validateGiftAmount(Number.NaN, rule).ok, false);
  assert.equal(validateGiftAmount(3_000_000_000, rule).ok, false);
});

test("custom amounts can be locked to the suggested list", () => {
  const locked: AmountRule = { ...rule, allowCustomAmount: false };
  assert.equal(validateGiftAmount(10000, locked).ok, true);
  assert.equal(validateGiftAmount(7500, locked).ok, false);
});

test("an absent maximum means no ceiling beyond the safety cap", () => {
  const uncapped: AmountRule = { ...rule, maxAmountMinor: null };
  assert.equal(validateGiftAmount(500_000_000, uncapped).ok, true);
});

test("parseSuggestedAmounts sanitises organiser input", () => {
  assert.deepEqual(parseSuggestedAmounts([20000, 5000, 5000, -1, 0, "10000"]), [5000, 10000, 20000]);
  assert.deepEqual(parseSuggestedAmounts("nonsense", [500]), [500]);
  assert.deepEqual(parseSuggestedAmounts([], [500]), [500]);
  assert.equal(parseSuggestedAmounts([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]).length, 8);
});

test("amountsMatch refuses to credit a mismatched charge", () => {
  assert.equal(amountsMatch(12000, 12000), true);
  assert.equal(amountsMatch(12000, 12001), false);
  assert.equal(amountsMatch(12000, "12000"), false);
  assert.equal(amountsMatch(12000, null), false);
  assert.equal(amountsMatch(12000, undefined), false);
});
