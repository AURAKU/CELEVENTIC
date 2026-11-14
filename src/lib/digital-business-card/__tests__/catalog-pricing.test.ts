import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  DEFAULT_CELECARD_CONCIERGE_PRICE_GHS,
  conciergeQuote,
  getSmartCardPlan,
  overlaySmartCardPlanPrices,
  planSavingsVsMonthly,
} from "@/lib/digital-business-card/plans";
import { isMaterialCeleCardPricingChange } from "@/services/digital-business-card/catalog.service";
import { CELEYOU_TIER_CATALOG, publishedCeleYouTiers } from "@/lib/digital-business-card/entitlements";
import { DEFAULT_CELECARD_LIFECYCLE_POLICY } from "@/lib/digital-business-card/lifecycle";
import {
  celeCardReminderDedupeLink,
  celeCardReminderLegacyLink,
} from "@/services/digital-business-card/smartcard-renewal.service";
import { celeYouPaymentEvidenceMatches } from "@/lib/digital-business-card/billing-rules";

describe("CeleYou launch catalog", () => {
  it("publishes Pro monthly through yearly with dynamic yearly savings", () => {
    const yearly = getSmartCardPlan("yearly");
    assert.equal(getSmartCardPlan("monthly")?.priceGhs, 49);
    assert.equal(getSmartCardPlan("quarter")?.priceGhs, 129);
    assert.equal(getSmartCardPlan("half")?.priceGhs, 239);
    assert.equal(yearly?.priceGhs, 399);
    assert.equal(yearly?.pricePesewas, 39900);
    assert.equal(yearly?.durationLabel, "12 months");
    assert.equal(yearly?.savePercent, 32);
    assert.match(yearly?.badge ?? "", /Best Value/);
    assert.equal(planSavingsVsMonthly(399, 12, 49).saveGhs, 189);
  });

  it("keeps concierge as an 800 one-time fee separate from the prepaid term", () => {
    const yearly = getSmartCardPlan("yearly");
    const bundled = conciergeQuote({ includeSubscription: true, plan: yearly });
    const designOnly = conciergeQuote({ includeSubscription: false, plan: yearly });
    assert.equal(DEFAULT_CELECARD_CONCIERGE_PRICE_GHS, 800);
    assert.equal(bundled.designFeeGhs, 800);
    assert.equal(bundled.subscriptionFeeGhs, 399);
    assert.equal(bundled.totalGhs, 1199);
    assert.equal(designOnly.totalGhs, 800);
    assert.equal(designOnly.planId, null);
  });

  it("recomputes savings against the published monthly overlay", () => {
    const plans = overlaySmartCardPlanPrices({ monthly: 59, yearly: 399 });
    const yearly = plans.find((plan) => plan.id === "yearly");
    assert.equal(yearly?.saveGhs, 59 * 12 - 399);
  });

  it("treats a catalog edit as material and leaves historical 449 evidence valid", () => {
    const previous = {
      planPrices: { monthly: 49, quarter: 129, half: 239, yearly: 449 },
      conciergePriceGhs: 199,
      conciergeBundledPlanId: "yearly" as const,
    };
    const next = {
      planPrices: { monthly: 49, quarter: 129, half: 239, yearly: 399 },
      conciergePriceGhs: 800,
      conciergeBundledPlanId: "yearly" as const,
    };
    assert.equal(isMaterialCeleCardPricingChange(previous, next), true);
    assert.equal(isMaterialCeleCardPricingChange(next, next), false);
    assert.equal(
      celeYouPaymentEvidenceMatches({
        storedAmountGhs: 449,
        storedCurrency: "GHS",
        providerStatus: "success",
        providerAmountMinor: 44900,
        providerCurrency: "GHS",
      }),
      true
    );
  });

  it("keeps Business and other future tiers unpublished", () => {
    const business = CELEYOU_TIER_CATALOG.find((tier) => tier.id === "business");
    assert.equal(business?.published, false);
    assert.equal(business?.proposedMonthlyGhs, 99);
    assert.deepEqual(
      publishedCeleYouTiers().map((tier) => tier.id),
      ["pro"]
    );
  });

  it("schedules 14, 7, 1, 0, 3-after, and 14-after reminders per term", () => {
    assert.deepEqual(DEFAULT_CELECARD_LIFECYCLE_POLICY.reminderOffsetsDays, [14, 7, 1, 0, -3, -14]);
    const expires = new Date("2027-01-15T00:00:00.000Z");
    const link = celeCardReminderDedupeLink("card_1", expires);
    assert.equal(link.includes("term=2027-01-15"), true);
    assert.equal(celeCardReminderLegacyLink("card_1"), "/dashboard/business-card/billing?card=card_1");
  });

  it("requires Super Admin confirmation and does not mix catalog sources", () => {
    const route = readFileSync(join(process.cwd(), "src/app/api/admin/celecard/pricing/route.ts"), "utf8");
    const command = readFileSync(
      join(process.cwd(), "src/services/digital-business-card/admin-command.service.ts"),
      "utf8"
    );
    const form = readFileSync(
      join(process.cwd(), "src/components/digital-business-card/celecard-pricing-form.tsx"),
      "utf8"
    );
    const migration = readFileSync(
      join(process.cwd(), "prisma/migrations/20261112183000_celeyou_launch_catalog/migration.sql"),
      "utf8"
    );
    assert.match(route, /CELECARD_PRICING_MANAGE/);
    assert.match(route, /CONFIRM_PRICING/);
    assert.match(command, /getCeleCardCatalog/);
    assert.doesNotMatch(command, /plans: SMARTCARD_PLANS\.map/);
    assert.match(form, /Subscription Catalog/);
    assert.match(form, /Published Pricing/);
    assert.match(form, /Concierge Pricing/);
    assert.match(form, /Pricing History/);
    assert.match(migration, /conciergePriceGhs = 800/);
    assert.match(migration, /Settled payments stay untouched/);
    const subscribe = readFileSync(
      join(process.cwd(), "src/app/api/digital-business-cards/[id]/subscribe/route.ts"),
      "utf8"
    );
    assert.match(subscribe, /planId: z\.enum\(\["monthly", "quarter", "half", "yearly"\]\)/);
    assert.doesNotMatch(subscribe, /amountGhs/);
    assert.doesNotMatch(subscribe, /alipay|wechat_pay/);
    assert.match(subscribe, /getCeleCardCatalog/);
    assert.match(subscribe, /findOpenCeleYouCheckout/);
  });
});
