import test from "node:test";
import assert from "node:assert/strict";

import {
  assertNoPrivateGiftData,
  displayGiftGuestName,
  giftPaymentUiState,
  isConfirmedGiftSuccess,
  type PublicGiftCampaignView,
  type PublicGiftPaymentView,
} from "../gift-privacy";

const campaignView: PublicGiftCampaignView = {
  publicToken: "gft_abc",
  giftType: "WEDDING_GIFT",
  status: "ACTIVE",
  currency: "GHS",
  title: "Send a Gift",
  subtitle: "Your presence is the greatest gift",
  description: "Your gift goes directly to the couple.",
  ctaLabel: "Send a Gift",
  amountPrompt: "How much would you like to gift?",
  messagePrompt: "Leave a note for the couple (optional)",
  privacyNote: "Your gift is private.",
  coverImageUrl: null,
  suggestedAmountsMinor: [5000, 10000],
  minAmountMinor: 500,
  maxAmountMinor: null,
  allowCustomAmount: true,
  allowGuestMessage: true,
  requireGuestName: true,
  requireGuestContact: false,
  allowAnonymous: true,
  closedReason: null,
  event: {
    title: "Afari Wedding",
    hostName: "Kwame & Ama",
    startDate: "2026-08-01T00:00:00.000Z",
    eventType: "WEDDING",
  },
  guest: null,
};

const paymentView: PublicGiftPaymentView = {
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

test("the real public payloads pass the privacy tripwire", () => {
  assert.doesNotThrow(() => assertNoPrivateGiftData(campaignView));
  assert.doesNotThrow(() => assertNoPrivateGiftData(paymentView));
  assert.doesNotThrow(() => assertNoPrivateGiftData(null));
  assert.doesNotThrow(() => assertNoPrivateGiftData(undefined));
  assert.doesNotThrow(() => assertNoPrivateGiftData("a string"));
});

test("aggregate and third-party data is refused on public payloads", () => {
  const leaks: Record<string, unknown>[] = [
    { totalMinor: 500000 },
    { balance: 1 },
    { giftCount: 12 },
    { contributors: [] },
    { leaderboard: [] },
    { recentGifts: [] },
    { goalMinor: 1000000 },
    { percentRaised: 42 },
    { guestEmail: "a@b.com" },
    { guestPhone: "0244000000" },
    { ipHash: "deadbeef" },
    { organiserNote: "internal" },
    { ledgerEntries: [] },
  ];

  for (const leak of leaks) {
    assert.throws(
      () => assertNoPrivateGiftData({ ...campaignView, ...leak }),
      /Gift privacy violation/,
      `expected ${Object.keys(leak)[0]} to be blocked`
    );
  }
});

test("the tripwire reaches nested objects and arrays", () => {
  assert.throws(
    () => assertNoPrivateGiftData({ ok: true, event: { meta: { totalMinor: 1 } } }),
    /payload\.event\.meta\.totalMinor/
  );
  assert.throws(
    () => assertNoPrivateGiftData({ items: [{ fine: 1 }, { balanceMinor: 2 }] }),
    /payload\.items\[1\]\.balanceMinor/
  );
});

test("key matching ignores casing so a rename cannot slip through", () => {
  assert.throws(() => assertNoPrivateGiftData({ TotalMinor: 1 }), /Gift privacy violation/);
  assert.throws(() => assertNoPrivateGiftData({ LEADERBOARD: [] }), /Gift privacy violation/);
});

test("only a server-confirmed SUCCESS reads as success", () => {
  assert.equal(isConfirmedGiftSuccess("SUCCESS"), true);
  for (const status of ["PENDING", "PROCESSING", "FAILED", "ABANDONED", "REFUNDED", "success", ""]) {
    assert.equal(isConfirmedGiftSuccess(status), false, status);
  }
});

test("provider statuses collapse into four UI states", () => {
  assert.equal(giftPaymentUiState("SUCCESS"), "success");
  assert.equal(giftPaymentUiState("PROCESSING"), "processing");
  assert.equal(giftPaymentUiState("PENDING"), "pending");
  assert.equal(giftPaymentUiState("UNKNOWN_FUTURE_STATUS"), "pending");
  for (const status of ["FAILED", "ABANDONED", "REVERSED", "REFUNDED", "DISPUTED"]) {
    assert.equal(giftPaymentUiState(status), "failed", status);
  }
});

test("anonymous gifts never surface a name, even to the organiser", () => {
  assert.equal(displayGiftGuestName("Yaa", false), "Yaa");
  assert.equal(displayGiftGuestName("Yaa", true), "Anonymous Guest");
  assert.equal(displayGiftGuestName("   ", false), "Anonymous Guest");
  assert.equal(displayGiftGuestName(null, false), "Anonymous Guest");
  assert.equal(displayGiftGuestName(undefined, false, "Guest"), "Guest");
});
