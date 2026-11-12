import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  DEFAULT_CELECARD_LIFECYCLE_POLICY,
  celeCardPublicPresentation,
  dueReminderOffsetDays,
  celeYouPaidTermIsRunning,
  pickAccountPaidEntitlement,
  isCeleCardFullyPublic,
  isCeleCardGuestShareable,
  renewalBaseDate,
  resolveCeleCardLifecycle,
  skipReminderForShortTerm,
} from "@/lib/digital-business-card/lifecycle";
import { courtesyCopyLeaksBilling, COURTESY_COPY } from "@/lib/digital-business-card/courtesy";
import {
  designChangeTouchesIdentity,
  designConfigFromCard,
  identityFromCard,
} from "@/lib/digital-business-card/design-vault";
import { pesewasMatch } from "@/lib/digital-business-card/plans";
import {
  CELECARD_CHECKOUT_IS_RECURRING_MANDATE,
  CELEYOU_RENEWAL_WAIT_MESSAGE,
  CELEYOU_TERM_LOCKED_HINT,
  celeYouPaymentEvidenceMatches,
  classifyCeleCardRenewal,
  ownerMayRenewSubscription,
  paidTermCannotBeCancelled,
  paymentFailureShouldActivate,
  refundShouldDeleteIdentity,
  renewalMustNotShorten,
} from "@/lib/digital-business-card/billing-rules";

const now = new Date("2026-11-09T12:00:00.000Z");

function card(overrides: Record<string, unknown> = {}) {
  return {
    isPublished: true,
    subscriptionStatus: "ACTIVE",
    subscriptionExpiresAt: new Date(now.getTime() + 40 * 86_400_000),
    lastActivatedAt: new Date(now.getTime() - 20 * 86_400_000),
    adminSuspendedAt: null,
    deletedAt: null,
    ...overrides,
  };
}

describe("CeleYou lifecycle", () => {
  it("maps draft, active, expiring, grace, courtesy, suspended, and deleted", () => {
    assert.equal(
      resolveCeleCardLifecycle(card({ subscriptionStatus: "TRIAL", lastActivatedAt: null }), now),
      "DRAFT"
    );
    assert.equal(resolveCeleCardLifecycle(card(), now), "ACTIVE");
    assert.equal(
      resolveCeleCardLifecycle(card({ subscriptionExpiresAt: new Date(now.getTime() + 5 * 86_400_000) }), now),
      "EXPIRING"
    );
    assert.equal(
      resolveCeleCardLifecycle(
        card({
          subscriptionStatus: "EXPIRED",
          subscriptionExpiresAt: new Date(now.getTime() - 1 * 86_400_000),
        }),
        now
      ),
      "GRACE_PERIOD"
    );
    assert.equal(
      resolveCeleCardLifecycle(
        card({
          subscriptionStatus: "EXPIRED",
          subscriptionExpiresAt: new Date(now.getTime() - 5 * 86_400_000),
        }),
        now
      ),
      "COURTESY"
    );
    assert.equal(resolveCeleCardLifecycle(card({ adminSuspendedAt: now }), now), "SUSPENDED");
    assert.equal(resolveCeleCardLifecycle(card({ deletedAt: now }), now), "DELETED");
    assert.equal(resolveCeleCardLifecycle(card({ adminDeactivatedAt: now }), now), "DRAFT");
    assert.equal(celeCardPublicPresentation(card({ adminDeactivatedAt: now }), now), "unavailable");
    assert.equal(celeCardPublicPresentation(card({ adminSuspendedAt: now }), now), "suspended");
  });

  it("honours administrator grace days on the paid live gate", () => {
    const expired = card({
      subscriptionStatus: "EXPIRED",
      subscriptionExpiresAt: new Date(now.getTime() - 5 * 86_400_000),
    });
    const seven = { ...DEFAULT_CELECARD_LIFECYCLE_POLICY, gracePeriodDays: 7 };
    const zero = { ...DEFAULT_CELECARD_LIFECYCLE_POLICY, gracePeriodDays: 0 };
    assert.equal(resolveCeleCardLifecycle(expired, now, seven), "GRACE_PERIOD");
    assert.equal(isCeleCardFullyPublic(resolveCeleCardLifecycle(expired, now, seven)), true);
    assert.equal(resolveCeleCardLifecycle(expired, now, zero), "COURTESY");
    assert.equal(celeCardPublicPresentation(expired, now, zero), "courtesy");
    assert.equal(celeCardPublicPresentation(expired, now, seven), "live");
  });

  it("keeps a paid term running until expiry, with no owner cancel", () => {
    const paid = card({
      subscriptionStatus: "ACTIVE",
      lastActivatedAt: now,
      subscriptionExpiresAt: new Date(now.getTime() + 10 * 86_400_000),
    });
    const trial = card({ subscriptionStatus: "TRIAL", lastActivatedAt: null });
    assert.equal(celeYouPaidTermIsRunning(paid, now), true);
    assert.equal(
      celeYouPaidTermIsRunning(
        card({
          subscriptionStatus: "EXPIRED",
          lastActivatedAt: new Date(now.getTime() - 40 * 86_400_000),
          subscriptionExpiresAt: new Date(now.getTime() - 1 * 86_400_000),
        }),
        now
      ),
      true
    );
    assert.equal(celeYouPaidTermIsRunning(trial, now), false);
    assert.equal(
      celeYouPaidTermIsRunning(
        card({
          subscriptionStatus: "EXPIRED",
          lastActivatedAt: new Date(now.getTime() - 40 * 86_400_000),
          subscriptionExpiresAt: new Date(now.getTime() - 10 * 86_400_000),
        }),
        now
      ),
      false
    );
  });

  it("lets a published trial identity stay guest-shareable without flipping paid live", () => {
    const trial = card({
      subscriptionStatus: "TRIAL",
      lastActivatedAt: null,
      subscriptionExpiresAt: new Date(now.getTime() + 10 * 86_400_000),
    });
    assert.equal(resolveCeleCardLifecycle(trial, now), "DRAFT");
    assert.equal(isCeleCardGuestShareable(trial, now), true);
    assert.equal(celeCardPublicPresentation(trial, now), "live");
    assert.equal(isCeleCardGuestShareable(card({ isPublished: false, subscriptionStatus: "TRIAL" }), now), false);
    assert.equal(
      isCeleCardGuestShareable(
        card({
          subscriptionStatus: "TRIAL",
          lastActivatedAt: null,
          subscriptionExpiresAt: new Date(now.getTime() - 86_400_000),
        }),
        now
      ),
      false
    );
  });

  it("extends early renewal from the current paid end", () => {
    const expires = new Date(now.getTime() + 10 * 86_400_000);
    const base = renewalBaseDate(card({ subscriptionExpiresAt: expires }), now);
    assert.equal(base.getTime(), expires.getTime());
    const late = renewalBaseDate(
      card({
        subscriptionStatus: "EXPIRED",
        subscriptionExpiresAt: new Date(now.getTime() - 10 * 86_400_000),
      }),
      now
    );
    assert.equal(late.getTime(), now.getTime());
  });

  it("selects reminder offsets without double-firing short terms", () => {
    assert.equal(dueReminderOffsetDays(new Date(now.getTime() + 20 * 86_400_000), now), null);
    assert.equal(dueReminderOffsetDays(new Date(now.getTime() + 10 * 86_400_000), now), 14);
    assert.equal(dueReminderOffsetDays(new Date(now.getTime() + 2 * 86_400_000), now), 7);
    assert.equal(dueReminderOffsetDays(new Date(now.getTime() + 1 * 86_400_000), now), 1);
    assert.equal(dueReminderOffsetDays(now, now), 0);
    assert.equal(dueReminderOffsetDays(new Date(now.getTime() - 4 * 86_400_000), now), -3);
    assert.equal(dueReminderOffsetDays(new Date(now.getTime() - 16 * 86_400_000), now), -14);
    assert.equal(skipReminderForShortTerm(14, 10), true);
    assert.equal(skipReminderForShortTerm(14, 30), false);
  });
});

describe("courtesy copy", () => {
  it("never names billing in visitor copy", () => {
    for (const text of Object.values(COURTESY_COPY)) {
      assert.equal(courtesyCopyLeaksBilling(text), false, text);
    }
    assert.match(COURTESY_COPY.description, /temporarily unavailable/);
    assert.match(COURTESY_COPY.description, /You can contact the cardholder directly/);
    assert.match(COURTESY_COPY.footer, /Powered by CeleYou/);
    assert.equal(COURTESY_COPY.footerLine, "One Identity. Infinite Connections.");
  });
});

describe("design vault identity split", () => {
  it("lets the cardholder remove a saved look without touching identity", () => {
    const vault = readFileSync(
      join(process.cwd(), "src/components/digital-business-card/digital-card-design-vault.tsx"),
      "utf8"
    );
    const route = readFileSync(
      join(process.cwd(), "src/app/api/digital-business-cards/[id]/designs/route.ts"),
      "utf8"
    );
    const service = readFileSync(
      join(process.cwd(), "src/services/digital-business-card/design-vault.service.ts"),
      "utf8"
    );
    assert.match(vault, />\s*Delete\s*</);
    assert.match(vault, /act\("archive"/);
    assert.match(vault, /public link stay the same/);
    assert.match(route, /archiveDesignVersion/);
    assert.match(service, /status: "ARCHIVED"/);
    assert.match(service, /publishedDesignVersionId: null/);
  });

  it("keeps canonical identity off the design config", () => {
    const identity = identityFromCard({
      displayName: "Ama Serwaa",
      title: "Creative Director",
      company: "Folio Maison",
      bio: "Private",
      email: "ama@secret.test",
      phone: "+233240000000",
      website: "https://folio.secret",
      socials: { instagram: "ama" },
      avatarUrl: "/photo.jpg",
    });
    const design = designConfigFromCard({ themeId: "gold-folio" });
    assert.equal("email" in design, false);
    assert.equal(design.themeId, "gold-folio");
    const restored = { ...identity };
    assert.equal(designChangeTouchesIdentity(identity, restored), false);
  });
});

describe("plan pesewas", () => {
  it("matches catalog amounts in minor units", () => {
    assert.equal(pesewasMatch(49, 49), true);
    assert.equal(pesewasMatch(49, 50), false);
  });
});

describe("CeleYou billing rules", () => {
  it("treats checkout as prepaid one-time, never a silent mandate", () => {
    assert.equal(CELECARD_CHECKOUT_IS_RECURRING_MANDATE, false);
    assert.equal(paymentFailureShouldActivate(), false);
    assert.equal(refundShouldDeleteIdentity(), false);
    assert.equal(paidTermCannotBeCancelled(), true);
  });

  it("blocks owner renewal until the paid window ends, then allows extra cards to share that term", () => {
    const paid = card({
      subscriptionStatus: "ACTIVE",
      lastActivatedAt: now,
      subscriptionExpiresAt: new Date(now.getTime() + 10 * 86_400_000),
    });
    const trial = card({ subscriptionStatus: "TRIAL", lastActivatedAt: null });
    const ended = card({
      subscriptionStatus: "EXPIRED",
      lastActivatedAt: new Date(now.getTime() - 40 * 86_400_000),
      subscriptionExpiresAt: new Date(now.getTime() - 10 * 86_400_000),
    });
    assert.equal(ownerMayRenewSubscription(paid, now), false);
    assert.equal(ownerMayRenewSubscription(trial, now), true);
    assert.equal(ownerMayRenewSubscription(ended, now), true);
    assert.equal(ownerMayRenewSubscription(null, now), true);
    assert.match(CELEYOU_TERM_LOCKED_HINT, /cannot renew or upgrade until this term ends/);
    assert.match(CELEYOU_RENEWAL_WAIT_MESSAGE, /renew or change plan after it ends/);
    const household = pickAccountPaidEntitlement([trial, paid, ended], now);
    assert.equal(household, paid);
    assert.equal(pickAccountPaidEntitlement([trial], now), null);
  });

  it("extends early renewal and starts late renewal from now", () => {
    const expires = new Date(now.getTime() + 10 * 86_400_000);
    assert.equal(
      classifyCeleCardRenewal(
        card({ subscriptionExpiresAt: expires, lastActivatedAt: new Date(now.getTime() - 20 * 86_400_000) }),
        now
      ),
      "early"
    );
    assert.equal(
      classifyCeleCardRenewal(
        card({
          subscriptionStatus: "EXPIRED",
          subscriptionExpiresAt: new Date(now.getTime() - 10 * 86_400_000),
          lastActivatedAt: new Date(now.getTime() - 40 * 86_400_000),
        }),
        now
      ),
      "late"
    );
    assert.equal(renewalMustNotShorten(expires, new Date(expires.getTime() - 1000), now), false);
    assert.equal(renewalMustNotShorten(expires, new Date(expires.getTime() + 30 * 86_400_000), now), true);
    assert.equal(
      classifyCeleCardRenewal(card({ subscriptionStatus: "TRIAL", lastActivatedAt: null }), now),
      "new"
    );
  });

  it("requires Paystack-verified amount and currency before prepaid activation", () => {
    const monthly = {
      storedAmountGhs: 49,
      storedCurrency: "GHS",
      providerAmountMinor: 4900,
      providerCurrency: "GHS",
      providerStatus: "success",
    };
    assert.equal(celeYouPaymentEvidenceMatches(monthly), true);
    assert.equal(celeYouPaymentEvidenceMatches({ ...monthly, storedAmountGhs: 129, providerAmountMinor: 12900 }), true);
    assert.equal(celeYouPaymentEvidenceMatches({ ...monthly, storedAmountGhs: 239, providerAmountMinor: 23900 }), true);
    assert.equal(celeYouPaymentEvidenceMatches({ ...monthly, storedAmountGhs: 449, providerAmountMinor: 44900 }), true);
    assert.equal(celeYouPaymentEvidenceMatches({ ...monthly, providerAmountMinor: 1 }), false);
    assert.equal(celeYouPaymentEvidenceMatches({ ...monthly, providerCurrency: "NGN" }), false);
    assert.equal(celeYouPaymentEvidenceMatches({ ...monthly, providerStatus: "failed" }), false);
    assert.equal(celeYouPaymentEvidenceMatches({ ...monthly, providerStatus: "pending" }), false);
    assert.equal(celeYouPaymentEvidenceMatches({ ...monthly, storedAmountGhs: 0 }), false);
  });
});
