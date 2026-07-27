import test from "node:test";
import assert from "node:assert/strict";

import {
  GIFT_PAYMENT_METHODS,
  detectMethodFromPhone,
  getGiftPaymentMethod,
  isGiftPaymentMethodId,
  listEnabledGiftPaymentMethods,
  normaliseGhanaMsisdn,
  paystackChannelsFor,
} from "../gift-providers";
import { GIFT_TYPE_LABELS, containsFundraisingLanguage, getGiftCopy } from "../gift-copy";

test("every Ghanaian network maps to its current Paystack code", () => {
  assert.equal(getGiftPaymentMethod("MTN_MOMO").paystackProvider, "mtn");
  // Telecel still rides the legacy Vodafone code at Paystack.
  assert.equal(getGiftPaymentMethod("TELECEL_CASH").paystackProvider, "vod");
  assert.equal(getGiftPaymentMethod("AIRTELTIGO_MONEY").paystackProvider, "atl");
  assert.equal(getGiftPaymentMethod("CARD").paystackProvider, null);
});

test("the provider table has no duplicate ids or prefixes", () => {
  const ids = GIFT_PAYMENT_METHODS.map((m) => m.id);
  assert.equal(new Set(ids).size, ids.length);

  const prefixes = GIFT_PAYMENT_METHODS.flatMap((m) => m.prefixes);
  assert.equal(new Set(prefixes).size, prefixes.length, "a prefix maps to two networks");
});

test("unknown method ids are rejected rather than guessed", () => {
  assert.equal(isGiftPaymentMethodId("MTN_MOMO"), true);
  assert.equal(isGiftPaymentMethodId("VODAFONE_CASH"), false);
  assert.equal(isGiftPaymentMethodId(""), false);
  assert.equal(isGiftPaymentMethodId(null), false);
  assert.throws(() => getGiftPaymentMethod("BITCOIN" as never), /Unknown gift payment method/);
});

test("Ghanaian numbers normalise to local form from any input shape", () => {
  assert.equal(normaliseGhanaMsisdn("0244123456"), "0244123456");
  assert.equal(normaliseGhanaMsisdn("+233244123456"), "0244123456");
  assert.equal(normaliseGhanaMsisdn("233244123456"), "0244123456");
  assert.equal(normaliseGhanaMsisdn("244123456"), "0244123456");
  assert.equal(normaliseGhanaMsisdn("024 412 3456"), "0244123456");
  assert.equal(normaliseGhanaMsisdn("024-412-3456"), "0244123456");
  assert.equal(normaliseGhanaMsisdn("12345"), null);
  assert.equal(normaliseGhanaMsisdn("not a phone"), null);
});

test("the picker pre-selects the network from the guest's number", () => {
  assert.equal(detectMethodFromPhone("0244123456"), "MTN_MOMO");
  assert.equal(detectMethodFromPhone("+233551234567"), "MTN_MOMO");
  assert.equal(detectMethodFromPhone("0201234567"), "TELECEL_CASH");
  assert.equal(detectMethodFromPhone("0501234567"), "TELECEL_CASH");
  assert.equal(detectMethodFromPhone("0261234567"), "AIRTELTIGO_MONEY");
  assert.equal(detectMethodFromPhone("0271234567"), "AIRTELTIGO_MONEY");
  assert.equal(detectMethodFromPhone("0991234567"), null);
  assert.equal(detectMethodFromPhone("garbage"), null);
});

test("checkout is restricted to the channel the guest picked", () => {
  assert.deepEqual(paystackChannelsFor("MTN_MOMO"), ["mobile_money"]);
  assert.deepEqual(paystackChannelsFor("CARD"), ["card"]);
  assert.ok(listEnabledGiftPaymentMethods().length > 0);
  assert.ok(listEnabledGiftPaymentMethods().every((m) => m.enabled));
});

test("celebratory default copy never uses fundraising language", () => {
  const celebratory = Object.keys(GIFT_TYPE_LABELS).filter((t) => t !== "FUNERAL_SUPPORT");

  for (const giftType of celebratory) {
    const copy = getGiftCopy(giftType as keyof typeof GIFT_TYPE_LABELS);
    for (const [field, text] of Object.entries(copy)) {
      assert.equal(
        containsFundraisingLanguage(text),
        false,
        `${giftType}.${field} uses fundraising language: "${text}"`
      );
    }
  }
});

test("funeral copy stays supportive without saying donation", () => {
  const copy = getGiftCopy("FUNERAL_SUPPORT");
  assert.match(copy.ctaLabel, /Support/);
  assert.equal(containsFundraisingLanguage(copy.description), false);
});

test("containsFundraisingLanguage catches the words we ban", () => {
  assert.equal(containsFundraisingLanguage("Make a donation today"), true);
  assert.equal(containsFundraisingLanguage("Donate now"), true);
  assert.equal(containsFundraisingLanguage("GHS 5,000 raised so far"), true);
  assert.equal(containsFundraisingLanguage("Send a gift to the couple"), false);
});
