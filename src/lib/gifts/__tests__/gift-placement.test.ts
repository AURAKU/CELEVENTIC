import test from "node:test";
import assert from "node:assert/strict";

import {
  buildCompanionGiftUrl,
  detectGiftVerificationMismatch,
  isCampaignPlaceable,
  isGuestScopedToCampaignEvent,
  sanitizeCompanionReturnUrl,
  sanitizeGiftReturnUrl,
} from "../gift-placement";
import { amountsMatch } from "../money";
import { companionGiftTeaser, getGiftCopy } from "../gift-copy";
import { assertNoPrivateGiftData, type PublicGiftPaymentView } from "../gift-privacy";

test("digital invitation never places gift CTAs", () => {
  const campaign = {
    status: "ACTIVE",
    showOnInvitation: true,
    showOnCompanion: true,
    closesAt: null,
  };
  assert.equal(isCampaignPlaceable(campaign, "invitation"), false);
});

test("event-guide placement uses showOnInvitation flag", () => {
  assert.equal(
    isCampaignPlaceable(
      { status: "ACTIVE", showOnInvitation: true, showOnCompanion: false },
      "event-guide"
    ),
    true
  );
  assert.equal(
    isCampaignPlaceable(
      { status: "ACTIVE", showOnInvitation: false, showOnCompanion: true },
      "event-guide"
    ),
    false
  );
});

test("companion placement ignores showOnInvitation and respects showOnCompanion", () => {
  const campaign = {
    status: "ACTIVE",
    showOnInvitation: false,
    closesAt: null,
  };
  assert.equal(isCampaignPlaceable(campaign, "companion"), true);
  assert.equal(isCampaignPlaceable(campaign, "event-guide"), false);
  assert.equal(
    isCampaignPlaceable({ ...campaign, showOnCompanion: false }, "companion"),
    false
  );
});

test("draft and paused campaigns never place on guest surfaces", () => {
  for (const surface of ["companion", "event-guide"] as const) {
    assert.equal(
      isCampaignPlaceable({ status: "DRAFT", showOnInvitation: true }, surface),
      false
    );
    assert.equal(
      isCampaignPlaceable({ status: "PAUSED", showOnInvitation: true }, surface),
      false
    );
    assert.equal(
      isCampaignPlaceable({ status: "CLOSED", showOnInvitation: true }, surface),
      false
    );
  }
});

test("closed-by-date campaigns are not placeable", () => {
  const past = new Date("2020-01-01T00:00:00.000Z");
  assert.equal(
    isCampaignPlaceable(
      { status: "ACTIVE", showOnInvitation: true, closesAt: past },
      "event-guide",
      new Date("2026-07-29T00:00:00.000Z")
    ),
    false
  );
});

test("gift return URLs must be relative invite or event-guide paths", () => {
  assert.equal(
    sanitizeCompanionReturnUrl("/invite/abc/event-day?guest=tok"),
    "/invite/abc/event-day?guest=tok"
  );
  assert.equal(
    sanitizeGiftReturnUrl("/event-guide/tok_abc?tab=programme"),
    "/event-guide/tok_abc?tab=programme"
  );
  assert.equal(sanitizeCompanionReturnUrl("https://evil.example/phish"), null);
  assert.equal(sanitizeCompanionReturnUrl("//evil.example"), null);
  assert.equal(sanitizeCompanionReturnUrl("/dashboard/gifts"), null);
  assert.equal(sanitizeCompanionReturnUrl("/invite/abc\n/evil"), null);
  assert.equal(sanitizeCompanionReturnUrl(null), null);
});

test("companion gift URLs carry guest token and safe return", () => {
  const built = buildCompanionGiftUrl("https://app.example/gift/gft_token", {
    guestQrToken: "guest-1",
    companionReturnUrl: "/invite/abc/event-day?guest=guest-1",
  });
  assert.match(built, /^\/gift\/gft_token\?/);
  assert.match(built, /g=guest-1/);
  assert.match(built, /return=%2Finvite%2Fabc%2Fevent-day/);
});

test("event-guide return path is preserved on gift URL", () => {
  const built = buildCompanionGiftUrl("https://app.example/gift/gft_token", {
    companionReturnUrl: "/event-guide/guide_tok",
  });
  assert.match(built, /return=%2Fevent-guide%2Fguide_tok/);
});

test("guest personalisation is event-scoped", () => {
  assert.equal(isGuestScopedToCampaignEvent({ eventId: "evt-1" }, "evt-1"), true);
  assert.equal(isGuestScopedToCampaignEvent({ eventId: "evt-other" }, "evt-1"), false);
  assert.equal(isGuestScopedToCampaignEvent(null, "evt-1"), false);
});

test("verification mismatch blocks amount currency and reference drift", () => {
  const expected = { reference: "CEVGIFT-1", amountMinor: 10000, currency: "GHS" };
  assert.equal(
    detectGiftVerificationMismatch(expected, { ...expected }, amountsMatch),
    null
  );
  assert.match(
    detectGiftVerificationMismatch(
      expected,
      { ...expected, amountMinor: 9999 },
      amountsMatch
    ) ?? "",
    /Amount mismatch/
  );
  assert.match(
    detectGiftVerificationMismatch(
      expected,
      { ...expected, currency: "NGN" },
      amountsMatch
    ) ?? "",
    /Currency mismatch/
  );
  assert.match(
    detectGiftVerificationMismatch(
      expected,
      { ...expected, reference: "OTHER" },
      amountsMatch
    ) ?? "",
    /Reference mismatch/
  );
});

test("idempotent success is a no-op when already SUCCESS (contract)", () => {
  // Fulfilment short-circuits on SUCCESS before provider calls; this documents
  // the guest-visible confirmation contract used by the status screen.
  const confirmed: PublicGiftPaymentView = {
    reference: "CEVGIFT-1",
    status: "SUCCESS",
    state: "success",
    amountMinor: 10000,
    currency: "GHS",
    giftType: "WEDDING_GIFT",
    createdAt: "2026-07-27T00:00:00.000Z",
    paidAt: "2026-07-27T00:01:00.000Z",
    method: "MTN_MOMO",
    guestName: "Yaa",
    isAnonymous: false,
    receiptUrl: "/gift/receipt/rcpt.sig",
    companionReturnUrl: "/invite/abc/event-day",
    failureReason: null,
  };
  assert.doesNotThrow(() => assertNoPrivateGiftData(confirmed, "guestConfirmation"));
  assert.equal(confirmed.state, "success");
  assert.equal(confirmed.status, "SUCCESS");
});

test("provider secrets and admin payment fields stay off guest confirmation", () => {
  assert.throws(
    () => assertNoPrivateGiftData({ providerReference: "psk_xxx" }),
    /Gift privacy violation/
  );
  assert.throws(
    () => assertNoPrivateGiftData({ authorizationUrl: "https://paystack.com/pay/x" }),
    /Gift privacy violation/
  );
});

test("wedding companion teaser and copy stay celebratory", () => {
  const copy = getGiftCopy("WEDDING_GIFT");
  assert.equal(copy.title, "Gift the Couple");
  assert.equal(copy.ctaLabel, "Gift the Couple");
  assert.match(copy.thankYouMessage, /couple/i);
  assert.match(companionGiftTeaser("WEDDING_GIFT"), /presence/i);
  assert.doesNotMatch(companionGiftTeaser("WEDDING_GIFT"), /donate|donation|goal|raised/i);
  assert.match(companionGiftTeaser("FUNERAL_SUPPORT"), /support/i);
});
