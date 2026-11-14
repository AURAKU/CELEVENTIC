import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { canPerformCeleCardAction } from "@/lib/digital-business-card/admin-permissions";
import {
  CELEYOU_CHECKOUT_METHOD_MESSAGE,
  CELEYOU_PAYSTACK_CHECKOUT_METHODS,
  celeYouBillingPhase,
  celeYouDirectoryExpiryRange,
  celeYouPaymentEvidenceMatches,
  isCeleYouPaystackCheckoutMethod,
  newCeleYouCheckoutIdempotencyKey,
  ownerMayRenewSubscription,
  paidTermCannotBeCancelled,
  paymentFailureShouldActivate,
  renewalMustNotShorten,
} from "@/lib/digital-business-card/billing-rules";
import {
  courtesyGuestPayload,
  courtesyPayloadExposesPrivateReach,
} from "@/lib/digital-business-card/courtesy";
import { publishedCeleYouTiers } from "@/lib/digital-business-card/entitlements";
import {
  CELECARD_LIFECYCLE_EVENTS,
  DEFAULT_CELECARD_LIFECYCLE_POLICY,
  renewalBaseDate,
  resolveCeleCardLifecycle,
} from "@/lib/digital-business-card/lifecycle";
import { getSmartCardPlan, smartCardExpiryFromNow } from "@/lib/digital-business-card/plans";
import {
  SMARTCARD_RENEWAL_SCAN_MAX,
  SMARTCARD_RENEWAL_SCAN_PAGE_SIZE,
  celeCardReminderDedupeLink,
} from "@/services/digital-business-card/smartcard-renewal.service";

function source(relative: string) {
  return readFileSync(join(process.cwd(), relative), "utf8");
}

const now = new Date("2026-11-14T12:00:00.000Z");

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

describe("CeleYou subscription lifecycle", () => {
  it("maps stored lifecycle onto pending, active, renewal due, expired, and suspended", () => {
    assert.equal(celeYouBillingPhase("DRAFT"), "pending_activation");
    assert.equal(celeYouBillingPhase("ACTIVE"), "active");
    assert.equal(celeYouBillingPhase("EXPIRING"), "renewal_due");
    assert.equal(celeYouBillingPhase("GRACE_PERIOD"), "expired");
    assert.equal(celeYouBillingPhase("COURTESY"), "expired");
    assert.equal(celeYouBillingPhase("SUSPENDED"), "suspended");
    assert.equal(celeYouBillingPhase("DELETED"), "deleted");
    assert.equal(paidTermCannotBeCancelled(), true);
    assert.equal(resolveCeleCardLifecycle(card(), now), "ACTIVE");
    assert.equal(
      resolveCeleCardLifecycle(
        card({ subscriptionExpiresAt: new Date(now.getTime() + 5 * 86_400_000) }),
        now
      ),
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
  });

  it("keeps admin directory expiry windows aligned with grace and expiring policy", () => {
    const policy = DEFAULT_CELECARD_LIFECYCLE_POLICY;
    const active = celeYouDirectoryExpiryRange("active", now, policy);
    const expiring = celeYouDirectoryExpiryRange("expiring", now, policy);
    const grace = celeYouDirectoryExpiryRange("grace", now, policy);
    const courtesy = celeYouDirectoryExpiryRange("courtesy", now, policy);
    assert.equal(active.gt?.toISOString(), now.toISOString());
    assert.equal(expiring.gte?.toISOString(), now.toISOString());
    assert.equal(
      expiring.lte?.toISOString(),
      new Date(now.getTime() + policy.expiringSoonDays * 86_400_000).toISOString()
    );
    assert.equal(grace.lt?.toISOString(), now.toISOString());
    assert.equal(
      grace.gte?.toISOString(),
      new Date(now.getTime() - policy.gracePeriodDays * 86_400_000).toISOString()
    );
    assert.equal(
      courtesy.lte?.toISOString(),
      new Date(now.getTime() - policy.gracePeriodDays * 86_400_000).toISOString()
    );
  });

  it("extends a live term from expiry and starts a lapsed term from now", () => {
    const monthly = getSmartCardPlan("monthly");
    assert.equal(monthly?.priceGhs, 49);
    const liveExpiry = new Date(now.getTime() + 10 * 86_400_000);
    const live = card({ subscriptionExpiresAt: liveExpiry });
    const late = card({
      subscriptionStatus: "EXPIRED",
      subscriptionExpiresAt: new Date(now.getTime() - 10 * 86_400_000),
      lastActivatedAt: new Date(now.getTime() - 40 * 86_400_000),
    });
    const nextLive = smartCardExpiryFromNow(1, renewalBaseDate(live, now));
    const nextLate = smartCardExpiryFromNow(1, renewalBaseDate(late, now));
    assert.equal(renewalMustNotShorten(liveExpiry, nextLive, now), true);
    assert.equal(nextLive.getTime() > liveExpiry.getTime(), true);
    assert.equal(nextLate.getTime() > now.getTime(), true);
    assert.equal(ownerMayRenewSubscription(live, now), false);
    assert.equal(ownerMayRenewSubscription(late, now), true);
  });

  it("never activates from a client success report or a failed Paystack charge", () => {
    assert.equal(paymentFailureShouldActivate(), false);
    assert.equal(
      celeYouPaymentEvidenceMatches({
        storedAmountGhs: 49,
        storedCurrency: "GHS",
        providerAmountMinor: 4900,
        providerCurrency: "GHS",
        providerStatus: "success",
      }),
      true
    );
    assert.equal(
      celeYouPaymentEvidenceMatches({
        storedAmountGhs: 49,
        storedCurrency: "GHS",
        providerAmountMinor: 4900,
        providerCurrency: "GHS",
        providerStatus: "failed",
      }),
      false
    );
    const fulfill = source("src/services/payments/payment.service.ts");
    assert.match(fulfill, /celeYouPaymentEvidenceMatches/);
    assert.match(fulfill, /kind: "ActivationFailed"/);
    assert.match(fulfill, /recordCeleYouCheckoutFailed/);
    assert.match(fulfill, /kind: "CheckoutFailed"/);
    assert.doesNotMatch(fulfill, /clientReportedSuccess/);
  });

  it("reuses one open Paystack checkout per card and plan", () => {
    assert.deepEqual([...CELEYOU_PAYSTACK_CHECKOUT_METHODS], [
      "card",
      "mobile_money",
      "bank_transfer",
    ]);
    assert.equal(isCeleYouPaystackCheckoutMethod("alipay"), false);
    assert.equal(isCeleYouPaystackCheckoutMethod("card"), true);
    assert.match(CELEYOU_CHECKOUT_METHOD_MESSAGE, /Paystack in Ghana cedis/);
    const first = newCeleYouCheckoutIdempotencyKey("card_1", "monthly", 1);
    const second = newCeleYouCheckoutIdempotencyKey("card_1", "monthly", 2);
    assert.equal(first === second, false);
    const subscribe = source("src/app/api/digital-business-cards/[id]/subscribe/route.ts");
    assert.match(subscribe, /findOpenCeleYouCheckout/);
    assert.match(subscribe, /newCeleYouCheckoutIdempotencyKey/);
    assert.doesNotMatch(subscribe, /Math\.floor\(Date\.now\(\) \/ 60000\)/);
    assert.doesNotMatch(subscribe, /alipay|wechat_pay/);
    const activate = source("src/services/digital-business-card/digital-business-card.service.ts");
    const paidWindow = activate.slice(
      activate.indexOf("export async function activateDigitalCardFromPayment"),
      activate.indexOf("export async function activateDigitalCardPlan")
    );
    assert.match(paidWindow, /lastActivationPaymentId === input.paymentId/);
    assert.doesNotMatch(paidWindow, /publicToken/);
    assert.doesNotMatch(paidWindow, /slug:/);
  });

  it("pages renewal reminders past the first 200 cards and dedupes by term", () => {
    assert.equal(SMARTCARD_RENEWAL_SCAN_PAGE_SIZE, 100);
    assert.equal(SMARTCARD_RENEWAL_SCAN_MAX, 5_000);
    const link = celeCardReminderDedupeLink("card_1", new Date("2027-01-15T00:00:00.000Z"));
    assert.equal(link.includes("term=2027-01-15"), true);
    const job = source("src/services/digital-business-card/smartcard-renewal.service.ts");
    assert.match(job, /SMARTCARD_RENEWAL_SCAN_PAGE_SIZE/);
    assert.match(job, /cursor: \{ id: cursor \}/);
    assert.doesNotMatch(job, /take: 200/);
    const cron = source("src/app/api/cron/smartcard-renewals/route.ts");
    assert.match(cron, /CRON_SECRET/);
    assert.match(cron, /runSmartCardRenewalReminders/);
  });

  it("preserves identity on expiry and withholds reach from courtesy HTML", () => {
    const payload = courtesyGuestPayload({
      slug: "kojo-mensah",
      displayName: "Kojo Mensah",
      title: "Director",
      company: "House of Gold",
      avatarUrl: "/kojo.jpg",
      themeId: "gold-folio",
    });
    assert.equal(payload.slug, "kojo-mensah");
    assert.equal(payload.email, null);
    assert.equal(payload.phone, null);
    assert.equal(payload.bio, null);
    assert.equal(payload.publicToken, "");
    assert.equal(courtesyPayloadExposesPrivateReach(payload), false);
    const view = source("src/components/digital-business-card/digital-card-continuity-view.tsx");
    assert.match(view, /blur-\[9px\]/);
    assert.match(view, /displayName=\{card.displayName\}/);
    assert.doesNotMatch(view, /card.email/);
    assert.doesNotMatch(view, /card.phone/);
    const publicView = source("src/components/digital-business-card/digital-card-public-view.tsx");
    assert.match(publicView, /DigitalCardContinuityView/);
    assert.match(publicView, /presentationMode === "courtesy"/);
  });

  it("enforces published Pro entitlements and does not invent Business or Teams checkout", () => {
    assert.deepEqual(
      publishedCeleYouTiers().map((tier) => tier.id),
      ["pro"]
    );
    const entitlements = source("src/lib/digital-business-card/entitlements.ts");
    assert.match(entitlements, /proposedMonthlyGhs: 99/);
    assert.match(entitlements, /published: false/);
    const subscribe = source("src/app/api/digital-business-cards/[id]/subscribe/route.ts");
    assert.doesNotMatch(subscribe, /"teams"|"enterprise"|planId: "business"/);
    const themes = source("src/lib/digital-business-card/themes.ts");
    assert.match(themes, /premium: true/);
    const picker = source("src/components/digital-business-card/digital-card-theme-picker.tsx");
    assert.doesNotMatch(picker, /requiresPro|lockedTheme|premiumGated/);
  });

  it("rejects unauthorized subscription changes and lists Paystack history for admins", () => {
    assert.equal(canPerformCeleCardAction({ role: "GUEST" }, "extend"), false);
    assert.equal(canPerformCeleCardAction({ role: "ORGANIZER" }, "complimentary"), false);
    assert.equal(canPerformCeleCardAction({ role: "GUEST" }, "change_plan"), false);
    assert.equal(canPerformCeleCardAction({ role: "ADMIN" }, "extend"), true);
    assert.equal(canPerformCeleCardAction({ role: "ADMIN" }, "remind_renewal"), true);
    assert.equal(CELECARD_LIFECYCLE_EVENTS.includes("ActivationFailed"), true);
    assert.equal(CELECARD_LIFECYCLE_EVENTS.includes("CheckoutFailed"), true);
    const command = source("src/services/digital-business-card/admin-command.service.ts");
    assert.match(command, /listCeleYouPaymentsForCard/);
    assert.match(command, /celeYouDirectoryExpiryRange\("grace"/);
    assert.match(command, /status === "courtesy" \|\| status === "expired"/);
    const detail = source("src/components/digital-business-card/celecard-card-detail.tsx");
    assert.match(detail, /Payment history/);
    const directory = source("src/components/digital-business-card/celecard-command-directory.tsx");
    assert.match(directory, /Pending activation/);
    assert.match(directory, /Renewal due/);
  });
});
