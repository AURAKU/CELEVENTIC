import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CELEVENTIC_GUIDE_CATALOG } from "../catalog";
import { searchGuides } from "../search";
import { isGuidePubliclyVisible, canViewerAccessGuide, filterPublicGuides, roleFromUserRole } from "../visibility";
import { resolveRelatedGuides } from "../related";
import {
  resolveContextHelp,
  isContextHelpAllowed,
  CONTEXT_HELP_MAP,
} from "../context-map";
import { sanitizeGuideText, sanitizeGuideSlug, parseJsonStringArray } from "../sanitize";
import { getStoryboard, HOW_CELEVENTIC_WORKS_STORYBOARD } from "../storyboards";
import { getMiniTour, MINI_TOURS } from "../tours";
import { guideStorageKey } from "../tour-storage";

describe("celeventic-guide catalog", () => {
  it("ships the initial catalog including flagship + guest/organizer/vendor/scanner", () => {
    assert.ok(CELEVENTIC_GUIDE_CATALOG.length >= 37);
    assert.ok(CELEVENTIC_GUIDE_CATALOG.some((g) => g.slug === "how-celeventic-works"));
    assert.ok(CELEVENTIC_GUIDE_CATALOG.filter((g) => g.role === "GUEST").length >= 13);
    assert.ok(CELEVENTIC_GUIDE_CATALOG.filter((g) => g.role === "ORGANIZER").length >= 18);
    assert.ok(CELEVENTIC_GUIDE_CATALOG.filter((g) => g.role === "VENDOR").length >= 2);
    assert.ok(CELEVENTIC_GUIDE_CATALOG.filter((g) => g.role === "SCANNER").length >= 4);
  });

  it("keeps videoUrl null until real media exists", () => {
    for (const g of CELEVENTIC_GUIDE_CATALOG) {
      assert.equal(g.videoUrl ?? null, null);
      assert.ok(g.steps.length >= 1);
    }
  });

  it("marks admin guides as adminOnly", () => {
    const admin = CELEVENTIC_GUIDE_CATALOG.filter((g) => g.role === "ADMIN" || g.adminOnly);
    assert.ok(admin.length >= 1);
    assert.ok(admin.every((g) => g.adminOnly));
  });
});

describe("celeventic-guide visibility", () => {
  it("hides adminOnly, draft, and archived from public", () => {
    assert.equal(isGuidePubliclyVisible({ status: "PUBLISHED", adminOnly: false }), true);
    assert.equal(isGuidePubliclyVisible({ status: "PUBLISHED", adminOnly: true }), false);
    assert.equal(isGuidePubliclyVisible({ status: "DRAFT", adminOnly: false }), false);
    assert.equal(isGuidePubliclyVisible({ status: "ARCHIVED", adminOnly: false }), false);
  });

  it("allows admin viewers to access admin-only guides", () => {
    assert.equal(
      canViewerAccessGuide({ status: "DRAFT", adminOnly: true, viewerIsAdmin: true, includeDrafts: true }),
      true
    );
  });

  it("filterPublicGuides drops unpublished and adminOnly", () => {
    const rows = [
      { status: "PUBLISHED", adminOnly: false },
      { status: "DRAFT", adminOnly: false },
      { status: "PUBLISHED", adminOnly: true },
      { status: "ARCHIVED", adminOnly: false },
    ];
    assert.equal(filterPublicGuides(rows).length, 1);
  });

  it("maps user roles to guide roles", () => {
    assert.equal(roleFromUserRole("ORGANIZER"), "ORGANIZER");
    assert.equal(roleFromUserRole("VENDOR"), "VENDOR");
    assert.equal(roleFromUserRole("STAFF"), "SCANNER");
    assert.equal(roleFromUserRole("SUPER_ADMIN"), "ADMIN");
  });
});

describe("celeventic-guide search", () => {
  it("matches synonyms and intent phrases", () => {
    const hits = searchGuides("where do i sit");
    assert.ok(hits.some((h) => h.slug === "find-your-seat" || h.category === "SEATING"));
  });

  it("returns no-result empty for nonsense", () => {
    const hits = searchGuides("zzzzqxrymnotarealtermqqq");
    assert.equal(hits.length, 0);
  });

  it("orders preferred role first when logged in", () => {
    const hits = searchGuides("pass", { role: "VENDOR" });
    assert.ok(hits.length > 0);
    assert.equal(hits[0].role, "VENDOR");
  });

  it("excludes admin guides from public search", () => {
    const hits = searchGuides("admin", { includeAdmin: false });
    assert.ok(hits.every((h) => h.role !== "ADMIN"));
  });
});

describe("celeventic-guide related + slug sanitize", () => {
  it("resolves related guides without self or admin", () => {
    const flagship = CELEVENTIC_GUIDE_CATALOG.find((g) => g.slug === "how-celeventic-works")!;
    const related = resolveRelatedGuides(flagship, CELEVENTIC_GUIDE_CATALOG, 4);
    assert.ok(related.length > 0);
    assert.ok(related.every((r) => r.slug !== flagship.slug && !r.adminOnly));
  });

  it("sanitizes slug and strips HTML", () => {
    assert.equal(sanitizeGuideSlug("Hello World!!"), "hello-world");
    assert.equal(sanitizeGuideText('<script>alert(1)</script>Safe'), "Safe");
    assert.deepEqual(parseJsonStringArray('["a","b"]'), ["a", "b"]);
  });
});

describe("celeventic-guide context mapping", () => {
  it("maps dashboard routes and blocks invitation templates", () => {
    assert.ok(resolveContextHelp("/dashboard/guests"));
    assert.ok(resolveContextHelp("/dashboard/seating/abc"));
    assert.ok(resolveContextHelp("/dashboard/memory"));
    assert.ok(resolveContextHelp("/dashboard/qr"));
    assert.equal(isContextHelpAllowed("/invite/abc"), false);
    assert.equal(isContextHelpAllowed("/invitations/templates/foo"), false);
    assert.equal(resolveContextHelp("/invite/abc"), null);
    assert.ok(CONTEXT_HELP_MAP.length >= 5);
  });
});

describe("celeventic-guide storyboards + tours", () => {
  it("stores flagship storyboard without claiming video exists", () => {
    assert.equal(HOW_CELEVENTIC_WORKS_STORYBOARD.videoUrl, null);
    assert.ok(HOW_CELEVENTIC_WORKS_STORYBOARD.beats.length >= 6);
    assert.ok(HOW_CELEVENTIC_WORKS_STORYBOARD.captionsEnUrl);
    assert.equal(getStoryboard("how-celeventic-works")?.key, "how-celeventic-works");
  });

  it("ships two mini tours with completion storage keys", () => {
    assert.equal(MINI_TOURS.length, 2);
    assert.ok(getMiniTour("guest-list"));
    assert.ok(getMiniTour("seating"));
    assert.ok(guideStorageKey("tour", "guest-list").includes("celeventic-guide"));
  });
});

describe("celeventic-guide share/OG contract", () => {
  it("catalog entries expose title/summary for OG metadata", () => {
    for (const g of CELEVENTIC_GUIDE_CATALOG.filter((x) => !x.adminOnly).slice(0, 10)) {
      assert.ok(g.title.length > 0);
      assert.ok(g.summary.length > 0);
      assert.ok(g.slug.length > 0);
    }
  });
});
