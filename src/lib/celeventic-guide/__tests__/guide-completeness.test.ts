import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildCoverageReport,
  coverageGatePasses,
  CELEVENTIC_HELP_COVERAGE,
} from "../coverage-matrix";
import {
  buildSafeGuideAnalyticsPayload,
  sanitizeGuideAnalyticsPath,
  sanitizeGuideSearchQuery,
} from "../analytics-privacy";
import { resolveGuidePlayback, isVideoProductionRequired } from "../media";
import { CELEVENTIC_GUIDE_CATALOG } from "../catalog";
import { PRIORITY_VIDEO_SLUGS } from "../types";
import { CONTEXT_HELP_MAP, resolveContextHelp } from "../context-map";
import { MINI_TOURS } from "../tours";
import { buildGuideSnapshot } from "../../../services/celeventic-guide/versioning.service";

describe("coverage matrix §51/§60", () => {
  it("audits real features without unexplained high-priority MISSING", () => {
    assert.ok(CELEVENTIC_HELP_COVERAGE.length >= 40);
    const report = buildCoverageReport();
    assert.ok(report.totalUserFacing > 0);
    assert.ok(report.coveragePercent > 0);
    assert.ok(
      report.coveragePercent < 100 || report.partial === 0,
      "do not claim 100% while PARTIAL videos remain"
    );
    const gate = coverageGatePasses(report);
    assert.equal(gate.ok, true, gate.reason);
    assert.equal(report.unexplainedHighPriorityMissing.length, 0);
  });

  it("marks priority videos as not available yet", () => {
    for (const slug of PRIORITY_VIDEO_SLUGS) {
      const g = CELEVENTIC_GUIDE_CATALOG.find((x) => x.slug === slug);
      assert.ok(g, `catalog has ${slug}`);
      assert.equal(g!.videoUrl ?? null, null);
      assert.equal(g!.mp4Url ?? null, null);
    }
  });
});

describe("analytics privacy §57", () => {
  it("redacts invite tokens and admission paths", () => {
    const path = sanitizeGuideAnalyticsPath("/invite/supersecrettokenvalue123456/rsvp?code=ABC123XYZ");
    assert.ok(!path.includes("supersecrettokenvalue123456"));
  });

  it("sanitizes search queries (emails, phones, codes)", () => {
    const q = sanitizeGuideSearchQuery("alex@example.com +15551234567 ABC12Z admission");
    assert.ok(!q.includes("alex@example.com"));
    assert.ok(!q.includes("555"));
  });

  it("drops blocked meta keys from payloads", () => {
    const safe = buildSafeGuideAnalyticsPayload({
      event: "guide_search",
      path: "/invite/privateTokenValueHere999",
      slug: "rsvp",
      q: "find jordan guest",
      meta: {
        guestName: "Jordan Guest",
        admissionCode: "PASS-999",
        token: "qrtokenvalueabcdefghijk",
        payment: "pi_123",
        milestone: 0.5,
      },
    });
    assert.equal(safe.meta.guestName, undefined);
    assert.equal(safe.meta.admissionCode, undefined);
    assert.equal(safe.meta.token, undefined);
    assert.equal(safe.meta.payment, undefined);
    assert.equal(safe.meta.milestone, 0.5);
    assert.ok(!safe.path.includes("privateTokenValueHere999"));
  });
});

describe("media pipeline §54", () => {
  it("prefers mobile source when present", () => {
    const r = resolveGuidePlayback({
      mobileVideoUrl: "/guides/videos/a-mobile.mp4",
      desktopVideoUrl: "/guides/videos/a-desktop.mp4",
      mp4Url: "/guides/videos/a.mp4",
      videoUrl: "/guides/videos/legacy.mp4",
    });
    assert.equal(r.primaryUrl, "/guides/videos/a-mobile.mp4");
    assert.equal(r.videoProductionRequired, false);
    assert.equal(r.lazy, true);
  });

  it("marks VIDEO PRODUCTION REQUIRED when no media", () => {
    assert.equal(isVideoProductionRequired({ posterUrl: "/x.svg" }), true);
  });
});

describe("expanded inventory §52/§59", () => {
  it("includes tickets, gifts, marketplace, wallet, troubleshooting guides", () => {
    const need = [
      "tickets-organizer",
      "payments-overview",
      "gifts-organizer",
      "marketplace-organizer",
      "vendor-portal",
      "venues-organizer",
      "wallet-organizer",
      "contributions-organizer",
      "qr-hub",
      "communications-organizer",
      "collaboration-workspace",
      "privacy-security",
      "event-os-wedding",
      "event-os-funeral",
      "event-os-corporate",
      "organizer-quick-start",
      "troubleshoot-invitation-wont-open",
      "troubleshoot-qr-wont-scan",
      "troubleshoot-vendor-pass",
    ];
    for (const slug of need) {
      assert.ok(CELEVENTIC_GUIDE_CATALOG.some((g) => g.slug === slug), slug);
    }
    assert.ok(CELEVENTIC_GUIDE_CATALOG.length >= 55);
  });

  it("ships EN/FR captions for organizer-quick-start priority title", () => {
    const quick = CELEVENTIC_GUIDE_CATALOG.find((x) => x.slug === "organizer-quick-start");
    assert.ok(quick?.captionsEnUrl);
    assert.ok(quick?.captionsFrUrl);
  });
});

describe("contextual help expansion §58/§62", () => {
  it("maps high-priority product routes", () => {
    assert.ok(CONTEXT_HELP_MAP.length >= 15);
    assert.ok(resolveContextHelp("/dashboard/tickets"));
    assert.ok(resolveContextHelp("/dashboard/qr-hub"));
    assert.ok(resolveContextHelp("/dashboard/wallet"));
    assert.equal(resolveContextHelp("/invite/abc"), null);
    assert.ok(MINI_TOURS.length >= 2);
  });
});

describe("versioning snapshot shape §55", () => {
  it("builds a snapshot object with steps and omits analytics counters", () => {
    const snap = buildGuideSnapshot({
      id: "g1",
      slug: "rsvp",
      title: "RSVP",
      summary: "s",
      body: "b",
      role: "GUEST",
      category: "RSVP",
      status: "PUBLISHED",
      sortOrder: 1,
      featured: false,
      adminOnly: false,
      posterUrl: null,
      thumbnailUrl: null,
      videoUrl: null,
      mp4Url: null,
      webmUrl: null,
      mobileVideoUrl: null,
      desktopVideoUrl: null,
      durationSec: 25,
      captionsEnUrl: null,
      captionsFrUrl: null,
      voiceoverEnUrl: null,
      voiceoverFrUrl: null,
      storyboardKey: "rsvp",
      transcript: "t",
      narrationScript: "n",
      a11yDescription: "a",
      videoProductionRequired: true,
      featureKey: "rsvp",
      lastVerifiedAt: null,
      verifiedAgainstBuild: null,
      verifiedAgainstFeatureVersion: null,
      reviewStatus: "CURRENT",
      synonyms: "[]",
      contextRoutes: "[]",
      relatedSlugs: "[]",
      analyticsEvents: "[]",
      isNew: false,
      newUntil: null,
      scheduledPublishAt: null,
      ogTitle: null,
      ogDescription: null,
      viewCount: 99,
      helpfulYes: 1,
      helpfulNo: 0,
      publishedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      steps: [
        {
          id: "s1",
          guideId: "g1",
          sortOrder: 0,
          title: "Step",
          body: "Body",
          stepType: "motion",
          mediaUrl: null,
          motionKey: "step-1",
          durationMs: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    } as never);
    assert.equal(snap.slug, "rsvp");
    assert.equal(snap.steps.length, 1);
    assert.ok(!("viewCount" in snap));
  });
});
