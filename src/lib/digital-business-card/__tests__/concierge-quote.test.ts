import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  conciergeQuote,
  overlaySmartCardPlanPrices,
  getSmartCardPlanFromCatalog,
  DEFAULT_CELECARD_CONCIERGE_PRICE_GHS,
} from "@/lib/digital-business-card/plans";

describe("CeleYou concierge quote", () => {
  it("overlays catalog prices without rewriting default months", () => {
    const plans = overlaySmartCardPlanPrices({ yearly: 500 });
    const yearly = getSmartCardPlanFromCatalog("yearly", plans);
    assert.equal(yearly?.months, 12);
    assert.equal(yearly?.priceGhs, 500);
    assert.equal(yearly?.pricePesewas, 50000);
    const monthly = getSmartCardPlanFromCatalog("monthly", plans);
    assert.equal(monthly?.priceGhs, 49);
    const raisedMonthly = overlaySmartCardPlanPrices({ monthly: 59, yearly: 399 });
    const yearlyVsNewMonthly = getSmartCardPlanFromCatalog("yearly", raisedMonthly);
    assert.equal(yearlyVsNewMonthly?.saveGhs, 59 * 12 - 399);
  });

  it("quotes design plus optional subscription and never invents a payment", () => {
    const plans = overlaySmartCardPlanPrices();
    const yearly = getSmartCardPlanFromCatalog("yearly", plans);
    const withPlan = conciergeQuote({ includeSubscription: true, plan: yearly });
    assert.equal(withPlan.designFeeGhs, DEFAULT_CELECARD_CONCIERGE_PRICE_GHS);
    assert.equal(withPlan.subscriptionFeeGhs, 399);
    assert.equal(withPlan.totalGhs, 800 + 399);
    const designOnly = conciergeQuote({ includeSubscription: false, plan: yearly });
    assert.equal(designOnly.subscriptionFeeGhs, 0);
    assert.equal(designOnly.totalGhs, 800);
  });
});
