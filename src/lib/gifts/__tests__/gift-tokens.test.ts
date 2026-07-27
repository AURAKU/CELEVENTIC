import test from "node:test";
import assert from "node:assert/strict";

process.env.GIFT_RECEIPT_SECRET ??= "test-gift-receipt-secret";

import {
  fingerprintToken,
  generateGiftPublicToken,
  generateGiftReference,
  generateReceiptNumber,
  hashIp,
  issueReceiptToken,
  ledgerIdempotencyKey,
  secureToken,
  verifyReceiptToken,
} from "../tokens";

test("secureToken produces the requested length from a base62 alphabet", () => {
  for (const length of [4, 16, 28, 32, 64]) {
    const token = secureToken(length);
    assert.equal(token.length, length, `length ${length}`);
    assert.match(token, /^[A-Za-z0-9]+$/);
  }
});

test("gift tokens do not collide across a large sample", () => {
  const tokens = new Set<string>();
  for (let i = 0; i < 5000; i++) tokens.add(generateGiftPublicToken());
  assert.equal(tokens.size, 5000);
});

test("public tokens and references carry recognisable prefixes", () => {
  assert.match(generateGiftPublicToken(), /^gft_[A-Za-z0-9]{28}$/);
  assert.match(generateGiftReference(), /^CEVGIFT-[A-Za-z0-9]{18}$/);
  assert.match(generateReceiptNumber(), /^CEV-GFT-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
});

test("a receipt token round-trips to its receipt id", () => {
  const { token, fingerprint } = issueReceiptToken("rcpt_123");
  assert.deepEqual(verifyReceiptToken(token), { receiptId: "rcpt_123" });
  assert.equal(fingerprint, fingerprintToken(token));
});

test("a tampered receipt token is rejected", () => {
  const { token } = issueReceiptToken("rcpt_123");
  const [id, signature] = token.split(".");

  // Swapping the receipt id keeps the shape but breaks the signature.
  assert.equal(verifyReceiptToken(`rcpt_456.${signature}`), null);
  // Mutating the signature fails even at the same length.
  const flipped = signature.slice(0, -1) + (signature.at(-1) === "A" ? "B" : "A");
  assert.equal(verifyReceiptToken(`${id}.${flipped}`), null);
  // Truncated, empty and malformed inputs never throw, they just fail.
  assert.equal(verifyReceiptToken(id), null);
  assert.equal(verifyReceiptToken(""), null);
  assert.equal(verifyReceiptToken("a.b.c"), null);
  assert.equal(verifyReceiptToken(`${id}.`), null);
  assert.equal(verifyReceiptToken("x".repeat(600)), null);
  assert.equal(verifyReceiptToken(null as unknown as string), null);
});

test("guest IPs are stored one-way or not at all", () => {
  const hashed = hashIp("102.176.0.1");
  assert.ok(hashed);
  assert.equal(hashed.length, 32);
  assert.doesNotMatch(hashed, /102\.176/);
  assert.equal(hashIp("102.176.0.1"), hashed);
  assert.notEqual(hashIp("102.176.0.2"), hashed);
  assert.equal(hashIp(null), null);
  assert.equal(hashIp(undefined), null);
  assert.equal(hashIp(""), null);
});

test("ledger idempotency keys are deterministic and collision-resistant", () => {
  assert.equal(ledgerIdempotencyKey(["gift_credit", "CEVGIFT-1"]), "gift_credit:CEVGIFT-1");
  assert.equal(
    ledgerIdempotencyKey(["gift_credit", "CEVGIFT-1"]),
    ledgerIdempotencyKey(["gift_credit", "CEVGIFT-1"])
  );
  assert.notEqual(
    ledgerIdempotencyKey(["gift_credit", "CEVGIFT-1"]),
    ledgerIdempotencyKey(["gift_reversal", "CEVGIFT-1"])
  );
});
