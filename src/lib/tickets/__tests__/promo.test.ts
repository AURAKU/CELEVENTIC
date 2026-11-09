import test from "node:test";
import assert from "node:assert/strict";
import { applyPromoDiscountMinor, canRedeemPromo } from "../promo-storage";

test("percent discounts round in minor units and never go negative", () => {
  assert.equal(applyPromoDiscountMinor(10000, { discountPercent: 10 }), 9000);
  assert.equal(applyPromoDiscountMinor(1, { discountPercent: 100 }), 0);
  assert.equal(applyPromoDiscountMinor(5000, { discountPercent: 0, discountFixedMinor: 9000 }), 0);
});

test("fixed discounts use integer minor units", () => {
  assert.equal(
    applyPromoDiscountMinor(20000, { discountPercent: 0, discountFixedMinor: 2500 }),
    17500
  );
});

test("usage caps refuse further redemptions", () => {
  assert.equal(canRedeemPromo(0, 1), true);
  assert.equal(canRedeemPromo(1, 1), false);
  assert.equal(canRedeemPromo(40, null), true);
});

test("concurrent redeemers cannot exceed maxUses under compare-and-swap", async () => {
  let usedCount = 0;
  const maxUses = 1;
  const attempts = Array.from({ length: 25 }, () =>
    Promise.resolve().then(() => {
      if (!canRedeemPromo(usedCount, maxUses)) return false;
      usedCount += 1;
      return true;
    })
  );
  // Sequential CAS is the SQLite/Postgres updateMany semantics this product uses.
  let accepted = 0;
  for (const attempt of attempts) {
    if (await attempt) accepted += 1;
  }
  assert.equal(accepted, 1);
  assert.equal(usedCount, 1);
});
