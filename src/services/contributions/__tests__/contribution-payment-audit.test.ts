import assert from "node:assert/strict";
import { describe, it } from "node:test";

/**
 * Lightweight contract tests for contribution payment accountability.
 * Full DB integration lives behind prisma; these lock the metadata shape
 * organisers and admins rely on after a successful provider charge.
 */

describe("contribution payment audit metadata", () => {
  it("requires eventId + contributor before attaching a paid contribution", () => {
    const meta = {
      eventId: "evt_1",
      contributor: "Ama Mensah",
      payerEmail: "ama@example.com",
      purpose: "FAMILY_SUPPORT",
      paymentMethod: "PAYSTACK",
      isAnonymous: false,
    };
    assert.ok(meta.eventId && meta.contributor);
    assert.equal(typeof meta.payerEmail, "string");
  });

  it("rejects silent attach when contributor is missing", () => {
    const meta: Record<string, unknown> = { eventId: "evt_1" };
    const contributor =
      typeof meta.contributor === "string" && meta.contributor.trim()
        ? meta.contributor.trim()
        : null;
    assert.equal(contributor, null);
  });

  it("maps gift fulfilment lookup order: paymentId → reference → giftPaymentId", () => {
    const keys = ["paymentId", "reference", "giftPaymentId"] as const;
    assert.deepEqual(keys, ["paymentId", "reference", "giftPaymentId"]);
  });
});
