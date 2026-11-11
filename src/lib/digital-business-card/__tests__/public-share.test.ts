import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  celeYouShareGuestMessage,
  resolveCeleYouPublicShare,
} from "@/lib/digital-business-card/access";
import { DEFAULT_CELECARD_LIFECYCLE_POLICY } from "@/lib/digital-business-card/lifecycle";

const now = new Date("2026-11-11T12:00:00.000Z");

function card(overrides: Record<string, unknown> = {}) {
  return {
    isPublished: true,
    subscriptionStatus: "ACTIVE",
    subscriptionExpiresAt: new Date(now.getTime() + 40 * 86_400_000),
    lastActivatedAt: new Date(now.getTime() - 20 * 86_400_000),
    adminSuspendedAt: null,
    adminDeactivatedAt: null,
    deletedAt: null,
    nfcEnabled: true,
    proximityDiscoverable: true,
    ...overrides,
  };
}

describe("CeleYou public share resolver", () => {
  it("lets a published trial stay guest-shareable when Paystack is missing", () => {
    const previous = process.env.PAYSTACK_SECRET_KEY;
    delete process.env.PAYSTACK_SECRET_KEY;
    const trial = card({
      subscriptionStatus: "TRIAL",
      lastActivatedAt: null,
      subscriptionExpiresAt: new Date(now.getTime() + 10 * 86_400_000),
    });
    const share = resolveCeleYouPublicShare({ card: trial, channel: "profile", now });
    assert.equal(share.guestShareable, true);
    assert.equal(share.presentation, "live");
    assert.equal(share.reason, "ok");
    assert.equal(resolveCeleYouPublicShare({ card: trial, channel: "qr", now }).recordOpen, true);
    assert.equal(resolveCeleYouPublicShare({ card: trial, channel: "tap", now }).channelAllowed, true);
    if (previous === undefined) delete process.env.PAYSTACK_SECRET_KEY;
    else process.env.PAYSTACK_SECRET_KEY = previous;
  });

  it("keeps paid, grace, unpublished, suspended, and expired cards on one policy", () => {
    const paid = resolveCeleYouPublicShare({ card: card(), channel: "profile", now });
    assert.equal(paid.guestShareable, true);
    const grace = resolveCeleYouPublicShare({
      card: card({
        subscriptionStatus: "EXPIRED",
        subscriptionExpiresAt: new Date(now.getTime() - 86_400_000),
      }),
      channel: "profile",
      now,
    });
    assert.equal(grace.guestShareable, true);
    const unpublished = resolveCeleYouPublicShare({
      card: card({ isPublished: false }),
      channel: "qr",
      now,
    });
    assert.equal(unpublished.guestShareable, false);
    assert.equal(unpublished.redirectToProfile, true);
    assert.equal(unpublished.recordOpen, false);
    assert.equal(unpublished.reason, "unpublished");
    const suspended = resolveCeleYouPublicShare({
      card: card({ adminSuspendedAt: now }),
      channel: "profile",
      now,
    });
    assert.equal(suspended.guestShareable, false);
    assert.equal(suspended.presentation, "suspended");
    const expired = resolveCeleYouPublicShare({
      card: card({
        subscriptionStatus: "EXPIRED",
        subscriptionExpiresAt: new Date(now.getTime() - 10 * 86_400_000),
      }),
      channel: "profile",
      now,
      policy: { ...DEFAULT_CELECARD_LIFECYCLE_POLICY, gracePeriodDays: 0 },
    });
    assert.equal(expired.guestShareable, false);
    assert.equal(expired.presentation, "courtesy");
    assert.equal(expired.reason, "inactive");
  });

  it("pauses lost NFC cards without changing QR eligibility", () => {
    const paused = resolveCeleYouPublicShare({
      card: card(),
      channel: "nfc",
      nfc: { deviceStatus: "DISABLED" },
      now,
    });
    assert.equal(paused.nfcOutcome, "paused");
    assert.equal(paused.redirectToProfile, false);
    assert.equal(paused.reason, "nfc_paused");
    const lost = resolveCeleYouPublicShare({
      card: card(),
      channel: "nfc",
      nfc: { deviceStatus: "LOST" },
      now,
    });
    assert.equal(lost.nfcOutcome, "lost");
    const qr = resolveCeleYouPublicShare({ card: card(), channel: "qr", now });
    assert.equal(qr.redirectToProfile, true);
    assert.equal(qr.recordOpen, true);
  });

  it("refuses Tap-to-Connect on unpublished or discoverable-off cards without billing copy", () => {
    const off = resolveCeleYouPublicShare({
      card: card({ proximityDiscoverable: false }),
      channel: "tap",
      now,
    });
    assert.equal(off.channelAllowed, false);
    assert.equal(off.reason, "tap_off");
    assert.equal(celeYouShareGuestMessage("tap_off"), "Tap-to-Connect is turned off on this CeleYou.");
    const draft = resolveCeleYouPublicShare({
      card: card({ isPublished: false }),
      channel: "tap",
      now,
    });
    assert.equal(draft.channelAllowed, false);
    assert.doesNotMatch(celeYouShareGuestMessage(draft.reason), /pay|Paystack|GH₵|subscribe/i);
  });

  it("does not consult a payment module for public eligibility", () => {
    const source = readFileSync(join(process.cwd(), "src/lib/digital-business-card/access.ts"), "utf8");
    assert.doesNotMatch(source, /PAYSTACK|payment\.service|fulfillCeleYouFromPayment/);
  });
});
