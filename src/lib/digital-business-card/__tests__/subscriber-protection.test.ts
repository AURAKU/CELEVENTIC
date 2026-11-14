import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { celeYouTrialEligibility } from "@/lib/digital-business-card/freemium";
import { SMARTCARD_PLANS } from "@/lib/digital-business-card/plans";
import {
  CELEYOU_FREEMIUM_SHIP_AT,
  CELEYOU_LEGACY_TRIAL_POLICY,
  accountHasLegacyPaidSignal,
  assertCeleYouSubscriberMutationSafe,
  bucketCeleYouSubscriptionRow,
  celeYouTrialExpiryMayTouchCard,
  celeYouTrialMutationTouchesPaidCard,
  classifyCeleYouAccount,
  resolveCeleYouSubscriptionFeatureFlags,
  summarizeCeleYouSubscriptionAudit,
} from "@/lib/digital-business-card/subscriber-protection";
import { renewalMustNotShorten } from "@/lib/digital-business-card/billing-rules";

const now = new Date("2026-11-14T18:00:00.000Z");

function card(overrides: Record<string, unknown> = {}) {
  return {
    isPublished: true,
    subscriptionStatus: "ACTIVE",
    subscriptionExpiresAt: new Date(now.getTime() + 30 * 86_400_000),
    lastActivatedAt: new Date(now.getTime() - 10 * 86_400_000),
    lastActivationPaymentId: "pay_1",
    entitlementKind: "PAID",
    publicToken: "tok_live",
    slug: "kojo-mensah",
    themeId: "elegant-frost",
    createdAt: new Date("2026-11-01T00:00:00.000Z"),
    deletedAt: null,
    ...overrides,
  };
}

describe("CeleYou existing subscriber protection", () => {
  it("keeps safe feature-flag defaults that never auto-apply Free or trial to legacy", () => {
    const flags = resolveCeleYouSubscriptionFeatureFlags({});
    assert.equal(flags.freePlanEnabled, true);
    assert.equal(flags.proTrialEnabled, true);
    assert.equal(flags.internationalPricingEnabled, false);
    assert.equal(flags.autoApplyFreeOrTrialToLegacy, false);
    assert.equal(
      resolveCeleYouSubscriptionFeatureFlags({ CELEYOU_FEATURE_PRO_TRIAL: "false" }).proTrialEnabled,
      false
    );
  });

  it("classifies monthly, quarterly, half-yearly, and yearly active subscribers as protected", () => {
    for (const plan of SMARTCARD_PLANS) {
      const expiresAt = new Date(now.getTime() + plan.months * 30 * 86_400_000);
      const verdict = classifyCeleYouAccount({
        cards: [card({ subscriptionExpiresAt: expiresAt })],
        now,
      });
      assert.equal(verdict.class, "existing_active_subscriber", plan.id);
      assert.equal(verdict.mayStartProTrial, false, plan.id);
      assert.equal(verdict.mayReclassifyToFree, false, plan.id);
      assert.equal(verdict.preservePaidTerm, true, plan.id);
    }
  });

  it("protects a subscriber with one day remaining and an upcoming renewal window", () => {
    const oneDay = card({
      subscriptionExpiresAt: new Date(now.getTime() + 1 * 86_400_000),
    });
    const verdict = classifyCeleYouAccount({ cards: [oneDay], now });
    assert.equal(verdict.class, "existing_active_subscriber");
    assert.equal(verdict.mayStartProTrial, false);
    assert.equal(celeYouTrialMutationTouchesPaidCard(oneDay, now), true);
    assert.equal(celeYouTrialExpiryMayTouchCard(oneDay), false);
  });

  it("never grants a Pro trial to expired paid subscribers or paid payment history", () => {
    const expired = card({
      subscriptionStatus: "EXPIRED",
      subscriptionExpiresAt: new Date(now.getTime() - 2 * 86_400_000),
    });
    const verdict = classifyCeleYouAccount({ cards: [expired], now });
    assert.equal(verdict.class, "existing_expired_subscriber");
    assert.equal(verdict.mayStartProTrial, false);
    assert.equal(
      celeYouTrialEligibility({
        published: true,
        paidNow: false,
        hasPaidHistory: true,
        trial: null,
        now,
      }).reason,
      "paid_history"
    );
    assert.equal(
      classifyCeleYouAccount({
        cards: [
          card({
            subscriptionStatus: "FREE",
            lastActivatedAt: null,
            lastActivationPaymentId: null,
            entitlementKind: null,
            subscriptionExpiresAt: null,
          }),
        ],
        hasAdvertisingPayment: true,
        now,
      }).mayStartProTrial,
      false
    );
  });

  it("blocks trial activation when the Pro trial feature flag is off", () => {
    assert.equal(
      celeYouTrialEligibility({
        published: true,
        paidNow: false,
        proTrialEnabled: false,
        trial: null,
        now,
      }).reason,
      "feature_off"
    );
  });

  it("refuses to rewrite paid identity fields during a trial-shaped mutation", () => {
    const before = card();
    const unsafe = assertCeleYouSubscriberMutationSafe({
      before,
      after: {
        subscriptionStatus: "FREE",
        subscriptionExpiresAt: new Date(now.getTime() + 7 * 86_400_000),
        publicToken: "rewritten",
      },
      now,
    });
    assert.equal(unsafe.ok, false);
    if (!unsafe.ok) {
      assert.ok(unsafe.blocked.includes("subscriptionStatus"));
      assert.ok(unsafe.blocked.includes("publicToken"));
    }
    const freeCard = card({
      subscriptionStatus: "FREE",
      lastActivatedAt: null,
      lastActivationPaymentId: null,
      entitlementKind: null,
      subscriptionExpiresAt: null,
    });
    const safe = assertCeleYouSubscriberMutationSafe({
      before: freeCard,
      after: {
        subscriptionStatus: "TRIAL",
        subscriptionExpiresAt: new Date(now.getTime() + 7 * 86_400_000),
      },
      now,
    });
    assert.equal(safe.ok, true);
  });

  it("only demotes unpaid optional trial rows to Free on expiry", () => {
    assert.equal(
      celeYouTrialExpiryMayTouchCard(
        card({
          subscriptionStatus: "TRIAL",
          lastActivatedAt: null,
          lastActivationPaymentId: null,
          entitlementKind: null,
        })
      ),
      true
    );
    assert.equal(celeYouTrialExpiryMayTouchCard(card()), false);
    assert.equal(
      celeYouTrialExpiryMayTouchCard(
        card({
          subscriptionStatus: "TRIAL",
          lastActivatedAt: null,
          entitlementKind: "COMPLIMENTARY",
        })
      ),
      false
    );
  });

  it("does not assume every account without a trial row is Free", () => {
    const ambiguous = classifyCeleYouAccount({
      cards: [
        card({
          subscriptionStatus: "INACTIVE",
          lastActivatedAt: null,
          lastActivationPaymentId: null,
          entitlementKind: null,
          subscriptionExpiresAt: null,
        }),
      ],
      now,
    });
    assert.equal(ambiguous.class, "existing_ambiguous_account");
    assert.equal(ambiguous.mayReclassifyToFree, false);
    assert.equal(ambiguous.reviewRequired, true);
    assert.equal(ambiguous.preservePaidTerm, true);
  });

  it("documents legacy unpaid trial policy and keeps renewal from shortening paid time", () => {
    assert.match(CELEYOU_LEGACY_TRIAL_POLICY, /paid activation/i);
    assert.match(CELEYOU_LEGACY_TRIAL_POLICY, /second Pro trial/i);
    const current = new Date(now.getTime() + 20 * 86_400_000);
    const shorter = new Date(now.getTime() + 5 * 86_400_000);
    assert.equal(renewalMustNotShorten(current, shorter, now), false);
    assert.equal(renewalMustNotShorten(current, new Date(now.getTime() + 40 * 86_400_000), now), true);
  });

  it("summarizes audit buckets without rewriting rows", () => {
    const rows = [
      card(),
      card({
        subscriptionStatus: "EXPIRED",
        subscriptionExpiresAt: new Date(now.getTime() - 86_400_000),
      }),
      card({
        subscriptionStatus: "TRIAL",
        lastActivatedAt: null,
        lastActivationPaymentId: null,
        entitlementKind: null,
      }),
      card({
        subscriptionStatus: "FREE",
        lastActivatedAt: null,
        lastActivationPaymentId: null,
        entitlementKind: null,
        subscriptionExpiresAt: null,
        createdAt: new Date(CELEYOU_FREEMIUM_SHIP_AT.getTime() + 3_600_000),
      }),
    ];
    assert.equal(bucketCeleYouSubscriptionRow(rows[0], now), "active");
    assert.equal(bucketCeleYouSubscriptionRow(rows[1], now), "expired");
    assert.deepEqual(summarizeCeleYouSubscriptionAudit(rows, now), {
      active: 1,
      expired: 1,
      trial: 1,
      free: 1,
      pending_payment: 0,
      other: 0,
    });
    assert.equal(accountHasLegacyPaidSignal([rows[0]], now), true);
    assert.equal(accountHasLegacyPaidSignal([rows[3]], now), false);
  });

  it("keeps freemium migration additive and trial service subscriber-safe", () => {
    const migration = readFileSync(
      join(process.cwd(), "prisma/migrations/20261114210000_celeyou_freemium_trial/migration.sql"),
      "utf8"
    );
    assert.match(migration, /Existing paid terms/);
    assert.doesNotMatch(migration, /UPDATE\s+"digital_business_cards"/i);
    assert.doesNotMatch(migration, /SET\s+"subscriptionStatus"/i);
    assert.doesNotMatch(migration, /DELETE FROM\s+"digital_business_cards"/i);
    const trial = readFileSync(
      join(process.cwd(), "src/services/digital-business-card/trial.service.ts"),
      "utf8"
    );
    assert.match(trial, /classifyCeleYouAccount/);
    assert.match(trial, /celeYouTrialExpiryMayTouchCard/);
    assert.match(trial, /assertCeleYouSubscriberMutationSafe/);
    assert.match(trial, /hasPaidHistory/);
    const billing = readFileSync(
      join(process.cwd(), "src/services/digital-business-card/digital-business-card.service.ts"),
      "utf8"
    );
    assert.match(billing, /renewalMustNotShorten/);
    const envExample = readFileSync(join(process.cwd(), ".env.example"), "utf8");
    assert.match(envExample, /CELEYOU_FEATURE_PRO_TRIAL/);
    assert.match(envExample, /CELEYOU_FEATURE_AUTO_APPLY_FREE_TRIAL_TO_LEGACY=false/);
  });

  it("classifies multi-card NFC-ready paid households as a single protected active account", () => {
    const household = [
      card({ id: "a", slug: "kojo-mensah", publicToken: "tok_a" }),
      card({
        id: "b",
        slug: "kojo-studio",
        publicToken: "tok_b",
        subscriptionExpiresAt: new Date(now.getTime() + 30 * 86_400_000),
      }),
    ];
    const verdict = classifyCeleYouAccount({ cards: household, now });
    assert.equal(verdict.class, "existing_active_subscriber");
    assert.equal(verdict.mayStartProTrial, false);
    assert.equal(accountHasLegacyPaidSignal(household, now), true);
  });
});
