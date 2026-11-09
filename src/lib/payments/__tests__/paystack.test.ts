import test from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import {
  parsePaystackWebhook,
  paystackAmountsMatch,
  paystackHmacValid,
} from "../paystack";
import { nextPaymentStatus } from "../payment-status";

const SECRET = "sk_test_celeventic_fixture";

function sign(body: string) {
  return crypto.createHmac("sha512", SECRET).update(body, "utf8").digest("hex");
}

test("Paystack HMAC accepts the raw body and rejects tampering", () => {
  const body = JSON.stringify({ event: "charge.success", data: { reference: "ref_1" } });
  assert.equal(paystackHmacValid(body, sign(body), SECRET), true);
  assert.equal(paystackHmacValid(body, sign(body), "wrong-secret"), false);
  assert.equal(paystackHmacValid(body + " ", sign(body), SECRET), false);
  assert.equal(paystackHmacValid(body, "", SECRET), false);
  assert.equal(paystackHmacValid(body, sign(body), ""), false);
});

test("only charge events confirm a payment", () => {
  const success = parsePaystackWebhook({
    event: "charge.success",
    data: { reference: "ref_ok" },
  });
  assert.equal(success.kind, "charge");
  assert.equal(success.successful, true);
  assert.equal(success.reference, "ref_ok");

  const failed = parsePaystackWebhook({
    event: "charge.failed",
    data: { reference: "ref_fail" },
  });
  assert.equal(failed.kind, "charge");
  assert.equal(failed.successful, false);

  const refund = parsePaystackWebhook({
    event: "refund.processed",
    data: { transaction_reference: "ref_ok" },
  });
  assert.equal(refund.kind, "lifecycle");
  assert.equal(refund.successful, false);

  const transfer = parsePaystackWebhook({
    event: "transfer.success",
    data: { reference: "tr_1" },
  });
  assert.equal(transfer.kind, "ignored");
});

test("out-of-order charge.failed cannot un-settle a successful payment", () => {
  assert.equal(nextPaymentStatus("SUCCESSFUL", "FAILED"), "SUCCESSFUL");
  assert.equal(nextPaymentStatus("SUCCESSFUL", "SUCCESSFUL"), "SUCCESSFUL");
  assert.equal(nextPaymentStatus("FAILED", "SUCCESSFUL"), "SUCCESSFUL");
  assert.equal(nextPaymentStatus("PENDING", "FAILED"), "FAILED");
  assert.equal(nextPaymentStatus("REFUNDED", "SUCCESSFUL"), "REFUNDED");
});

test("provider amount must match expected minor units exactly", () => {
  assert.equal(paystackAmountsMatch(12000, 12000), true);
  assert.equal(paystackAmountsMatch(12000, 12000.9), true);
  assert.equal(paystackAmountsMatch(12000, 11999), false);
  assert.equal(paystackAmountsMatch(12000, "12000"), false);
});
