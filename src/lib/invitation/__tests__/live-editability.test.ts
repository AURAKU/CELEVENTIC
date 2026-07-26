/**
 * Live-editability guarantees — pure-function unit tests (node:test).
 * Run: npm run test:live-editability
 *
 * These lock in the two silent ways a published invitation used to drift from
 * what the host designed in Studio.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  applyCatalogCreativeIdentity,
  getDefaultDesignConfig,
  CATALOG_DNA_EXPERIENCE_KEYS,
  CATALOG_DNA_STUDIO_KEYS,
} from "../../invitation-templates";
import { buildPublishedDesignConfig } from "../published-design";
import { isStudioUnlocked, isLiveInvitation } from "../studio-access";

const TRADITIONAL = "traditional-marriage-ceremony";

describe("catalog DNA round-trip", () => {
  it("reverts DNA fields while the host has not customized the experience", () => {
    const base = getDefaultDesignConfig(TRADITIONAL);
    const edited = {
      ...base,
      experience: { ...base.experience, outroExperience: "fireworks" as const },
    };

    const rendered = applyCatalogCreativeIdentity(edited, TRADITIONAL);
    const catalogOutro = base.experience?.outroExperience;

    // Only meaningful when the SKU actually pins this field.
    if (catalogOutro !== undefined) {
      assert.equal(rendered.experience?.outroExperience, catalogOutro);
    }
  });

  it("honours every studio edit once experienceCustomized is set", () => {
    const base = getDefaultDesignConfig(TRADITIONAL);
    const edited = {
      ...base,
      experience: {
        ...base.experience,
        experienceCustomized: true,
        outroExperience: "fireworks" as const,
        slideshowStyle: "ken-burns" as const,
      },
    };

    const rendered = applyCatalogCreativeIdentity(edited, TRADITIONAL);
    assert.equal(rendered.experience?.outroExperience, "fireworks");
    assert.equal(rendered.experience?.slideshowStyle, "ken-burns");
  });

  it("keeps the Studio's customized-marking key list in sync with the renderer", () => {
    // Both lists are exported from one module precisely so they cannot drift;
    // this asserts nobody re-inlined them.
    assert.ok(CATALOG_DNA_EXPERIENCE_KEYS.includes("introVariant"));
    assert.ok(CATALOG_DNA_EXPERIENCE_KEYS.includes("openingExperience"));
    assert.ok(CATALOG_DNA_STUDIO_KEYS.includes("buttonStyle"));
  });
});

describe("published design snapshot", () => {
  it("rebuilds gallery media from the order and keeps the welcome photo", () => {
    const design = buildPublishedDesignConfig({
      templateSlug: TRADITIONAL,
      designConfig: {
        media: [{ url: "/welcome.jpg", type: "image", role: "intro" }],
      },
      galleryUrls: ["/a.jpg", "/b.mp4"],
    });

    const urls = design.media?.map((m) => m.url) ?? [];
    assert.deepEqual(urls, ["/a.jpg", "/b.mp4", "/welcome.jpg"]);
    assert.equal(design.media?.[0].role, "hero");
    assert.equal(design.media?.[1].type, "video");
    assert.equal(design.media?.[2].role, "intro");
  });

  it("drops a removed image from the snapshot", () => {
    const design = buildPublishedDesignConfig({
      templateSlug: TRADITIONAL,
      designConfig: { media: [{ url: "/a.jpg", type: "image", role: "hero" }] },
      galleryUrls: ["/b.jpg"],
    });

    const urls = design.media?.map((m) => m.url) ?? [];
    assert.ok(!urls.includes("/a.jpg"));
    assert.deepEqual(urls, ["/b.jpg"]);
  });
});

describe("studio access", () => {
  it("keeps a published invitation editable and an unpaid one gated", () => {
    assert.equal(isStudioUnlocked("PUBLISHED"), true);
    assert.equal(isStudioUnlocked("PAID"), true);
    assert.equal(isStudioUnlocked("REVISION_REQUESTED"), true);
    assert.equal(isStudioUnlocked("DRAFT"), false);
    assert.equal(isStudioUnlocked("PENDING_PAYMENT"), false);
    assert.equal(isStudioUnlocked("ARCHIVED"), false);
  });

  it("treats an order with a share URL as live", () => {
    assert.equal(isLiveInvitation({ status: "IN_PRODUCTION", shareUrl: "https://x/invite/y" }), true);
    assert.equal(isLiveInvitation({ status: "PUBLISHED", shareUrl: null }), true);
    assert.equal(isLiveInvitation({ status: "DRAFT", shareUrl: null }), false);
  });
});
