import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { canPerformCeleCardAction } from "@/lib/digital-business-card/admin-permissions";
import {
  CELEYOU_ANALYTICS_RANGE_MAX_DAYS,
  CELEYOU_NFC_ATTRIBUTION,
  CELEYOU_PAYMENT_ATTRIBUTION,
  CELEYOU_QR_ATTRIBUTION,
  buildCeleYouTrendSeries,
  celeYouDeviceBreakdown,
  celeYouDeviceCategory,
  celeYouEventOutcome,
  celeYouPopularLinks,
  clampAnalyticsRangeDays,
  ownerMayViewCeleYouAnalytics,
  sanitizeCeleYouActivityMeta,
} from "@/lib/digital-business-card/analytics";
import { guestReachEventKind } from "@/lib/celeyou-share/guest-actions";
import { isCeleYouPublicEventKind } from "@/lib/celeyou-share/events";
import { publishedCeleYouTiers } from "@/lib/digital-business-card/entitlements";

function source(relative: string) {
  return readFileSync(join(process.cwd(), relative), "utf8");
}

describe("CeleYou analytics taxonomy", () => {
  it("distinguishes attempted guest actions from verified server events", () => {
    assert.equal(celeYouEventOutcome("payment_open"), "attempted");
    assert.equal(celeYouEventOutcome("share_tap"), "attempted");
    assert.equal(celeYouEventOutcome("vcard_save"), "attempted");
    assert.equal(celeYouEventOutcome("vcard_download"), "completed");
    assert.equal(celeYouEventOutcome("nfc_tap"), "completed");
    assert.equal(celeYouEventOutcome("qr_open"), "completed");
    assert.equal(celeYouEventOutcome("meeting_booked"), "completed");
    assert.equal(celeYouEventOutcome("payment_open", "completed"), "attempted");
    assert.equal(isCeleYouPublicEventKind("payment_open"), true);
    assert.equal(isCeleYouPublicEventKind("vcard_download"), false);
    assert.match(CELEYOU_PAYMENT_ATTRIBUTION, /not a Paystack charge/);
    assert.match(CELEYOU_QR_ATTRIBUTION, /type or share that same link/);
    assert.match(CELEYOU_NFC_ATTRIBUTION, /NFC tag address/);
  });

  it("maps reach brands without treating a wallet sheet as a payment", () => {
    assert.equal(guestReachEventKind({ brand: "linkedin", href: "https://linkedin.com/in/ama" }), "social_tap");
    assert.equal(guestReachEventKind({ brand: "location", href: "https://maps.google.com/?q=Accra" }), "location_tap");
    assert.equal(guestReachEventKind({ brand: "meeting", href: "" }), "meeting_open");
    assert.equal(guestReachEventKind({ brand: "momo", href: "", locked: false }), "payment_open");
    assert.equal(guestReachEventKind({ brand: "bank", href: "" }), "payment_open");
    assert.equal(guestReachEventKind({ brand: "phone", href: "tel:+233", locked: true }), null);
  });

  it("classifies devices without keeping the user agent", () => {
    assert.equal(
      celeYouDeviceCategory(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15"
      ),
      "phone"
    );
    assert.equal(celeYouDeviceCategory("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)"), "tablet");
    assert.equal(
      celeYouDeviceCategory("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0.0.0"),
      "desktop"
    );
    const clean = sanitizeCeleYouActivityMeta({
      surface: "public",
      brand: "linkedin",
      outcome: "attempted",
      device: "phone",
      ip: "1.1.1.1",
      userAgent: "Mozilla/5.0",
      email: "guest@hidden.test",
    });
    assert.equal(clean.brand, "linkedin");
    assert.equal(clean.device, "phone");
    assert.equal("ip" in clean, false);
    assert.equal("userAgent" in clean, false);
    assert.equal("email" in clean, false);
  });

  it("builds a bounded trend and ranks popular actions", () => {
    const from = new Date("2026-11-01T00:00:00");
    const to = new Date("2026-11-03T00:00:00");
    const series = buildCeleYouTrendSeries(
      [
        { kind: "profile_open", createdAt: new Date("2026-11-01T10:00:00") },
        { kind: "profile_open", createdAt: new Date("2026-11-01T11:00:00") },
        { kind: "qr_open", createdAt: new Date("2026-11-02T09:00:00") },
      ],
      from,
      to
    );
    assert.equal(series.length, 3);
    assert.equal(series[0].views, 2);
    assert.equal(series[1].actions, 1);
    const popular = celeYouPopularLinks({ qr_open: 4, payment_open: 9, vcard_download: 2 });
    assert.equal(popular[0].kind, "payment_open");
    assert.equal(popular[0].outcome, "attempted");
    assert.equal(popular.find((row) => row.kind === "vcard_download")?.outcome, "completed");
    const devices = celeYouDeviceBreakdown([
      { meta: { device: "phone" } },
      { meta: { device: "phone" } },
      { meta: { device: "desktop" } },
    ]);
    assert.equal(devices.phone, 2);
    assert.equal(devices.desktop, 1);
    const clamped = clampAnalyticsRangeDays(new Date("2026-01-01"), new Date("2026-12-01"));
    assert.equal(
      Math.round((clamped.to.getTime() - clamped.from.getTime()) / 86_400_000),
      CELEYOU_ANALYTICS_RANGE_MAX_DAYS
    );
  });

  it("keeps analytics owner-only and does not invent a paid analytics lock", () => {
    assert.equal(ownerMayViewCeleYouAnalytics({ ownerUserId: "a", viewerUserId: "a" }), true);
    assert.equal(ownerMayViewCeleYouAnalytics({ ownerUserId: "a", viewerUserId: "b" }), false);
    assert.equal(canPerformCeleCardAction({ role: "GUEST" }, "extend"), false);
    assert.deepEqual(
      publishedCeleYouTiers().map((tier) => tier.id),
      ["free", "pro"]
    );
    const route = source("src/app/api/digital-business-cards/[id]/analytics/route.ts");
    assert.match(route, /getServerSession/);
    assert.match(route, /getDigitalCardAnalyticsForUser\(session.user.id/);
    assert.doesNotMatch(route, /advancedAnalytics|entitlementKind/);
    const events = source("src/app/api/digital-business-cards/public/[slug]/events/route.ts");
    assert.match(events, /celecard-event-dedupe/);
    assert.match(events, /celeYouDeviceCategory/);
    assert.doesNotMatch(events, /requestClientIp\(req\).*;\s*meta/);
    const service = source("src/services/digital-business-card/digital-business-card.service.ts");
    assert.match(service, /CELEYOU_ANALYTICS_TREND_MAX_ROWS/);
    assert.match(service, /vcardDownloads/);
    assert.match(service, /sanitizeCeleYouActivityMeta/);
    const vcf = source("src/app/card/[slug]/contact.vcf/route.ts");
    assert.match(vcf, /vcard_download/);
    const qr = source("src/app/c/[token]/page.tsx");
    assert.match(qr, /attribution: "qr"/);
    const nfc = source("src/services/digital-business-card/nfc-device.service.ts");
    assert.match(nfc, /attribution: "nfc"/);
  });
});
