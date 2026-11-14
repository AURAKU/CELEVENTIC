import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  CHECKOUT_METHOD_IDS,
  getCheckoutMethod,
  ghsToWalletChargeMinor,
  isCheckoutMethodId,
  resolveInitializeChannels,
} from "../checkout-methods";
import { parseStripeCheckoutEvent, stripeSignatureValid } from "../stripe-wallet";
import crypto from "crypto";

describe("checkout methods", () => {
  it("exposes card, mobile money, bank transfer, Alipay, and WeChat Pay", () => {
    assert.deepEqual([...CHECKOUT_METHOD_IDS], [
      "card",
      "mobile_money",
      "bank_transfer",
      "alipay",
      "wechat_pay",
    ]);
    assert.equal(getCheckoutMethod("card").rail, "PAYSTACK");
    assert.equal(getCheckoutMethod("mobile_money").paystackChannel, "mobile_money");
    assert.equal(getCheckoutMethod("bank_transfer").paystackChannel, "bank_transfer");
    assert.equal(getCheckoutMethod("alipay").rail, "STRIPE");
    assert.equal(getCheckoutMethod("wechat_pay").stripePaymentMethod, "wechat_pay");
    assert.equal(isCheckoutMethodId("paypal"), false);
  });

  it("pins Paystack channels to the selected method and defaults to all three", () => {
    assert.deepEqual(resolveInitializeChannels("card"), ["card"]);
    assert.deepEqual(resolveInitializeChannels("mobile_money"), ["mobile_money"]);
    assert.deepEqual(resolveInitializeChannels("bank_transfer"), ["bank_transfer"]);
    assert.deepEqual(resolveInitializeChannels(null), ["card", "mobile_money", "bank_transfer"]);
    assert.deepEqual(resolveInitializeChannels("alipay", ["card"]), ["card"]);
  });

  it("converts GHS to CNY minor units for wallet rails", () => {
    assert.equal(ghsToWalletChargeMinor(100, "CNY"), 5300);
    assert.ok(ghsToWalletChargeMinor(0.01, "CNY") >= 1);
  });
});

describe("Stripe webhook signatures", () => {
  it("accepts a fresh t,v1 HMAC and rejects a wrong secret", () => {
    const secret = "whsec_test";
    const raw = "{\"type\":\"checkout.session.completed\"}";
    const t = Math.floor(Date.now() / 1000);
    const v1 = crypto.createHmac("sha256", secret).update(`${t}.${raw}`, "utf8").digest("hex");
    assert.equal(stripeSignatureValid(raw, `t=${t},v1=${v1}`, secret), true);
    assert.equal(stripeSignatureValid(raw, `t=${t},v1=${v1}`, "wrong"), false);
    assert.equal(stripeSignatureValid(raw, "", secret), false);
  });

  it("reads Celeventic reference from a Checkout session event", () => {
    const parsed = parseStripeCheckoutEvent({
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test",
          client_reference_id: "CEV-abc",
          payment_status: "paid",
        },
      },
    });
    assert.equal(parsed?.reference, "CEV-abc");
    assert.equal(parsed?.successful, true);
  });

  it("leaves unpaid Alipay and WeChat sessions pending instead of failed", () => {
    const pending = parseStripeCheckoutEvent({
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_pending",
          client_reference_id: "CEV-pending",
          payment_status: "unpaid",
        },
      },
    });
    assert.equal(pending, null);
    const later = parseStripeCheckoutEvent({
      type: "checkout.session.async_payment_succeeded",
      data: {
        object: {
          id: "cs_pending",
          client_reference_id: "CEV-pending",
          payment_status: "paid",
        },
      },
    });
    assert.equal(later?.successful, true);
  });
});
