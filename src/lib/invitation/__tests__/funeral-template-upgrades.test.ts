import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CATALOG_TEMPLATES } from "@/lib/invitation-mvp/catalogue";
import {
  FUNERAL_THEME_IDS,
  getInvitationTheme,
} from "@/lib/invitation-theme/theme-registry";
import { getMotionProfile } from "@/lib/motion/motion-profiles";
import { getLayoutEnabledTabs, getLayoutSignatureFeatures } from "@/lib/invitation/layout-template-signatures";
import { hubTabsForEventType } from "@/lib/invitation/wedding-experience-filters";

describe("funeral invitation template upgrades", () => {
  const funerals = CATALOG_TEMPLATES.filter((t) => t.category === "Funeral");

  it("registers every funeral catalogue themeId", () => {
    for (const t of funerals) {
      if (!t.themeId) continue;
      assert.ok(
        getInvitationTheme(t.themeId),
        `missing invitation theme registry entry for ${t.slug} themeId=${t.themeId}`
      );
      assert.ok(
        FUNERAL_THEME_IDS.includes(t.themeId),
        `${t.themeId} should be listed in FUNERAL_THEME_IDS`
      );
    }
  });

  it("uses solemn motion on every funeral SKU", () => {
    for (const t of funerals) {
      assert.equal(
        t.motionProfileId,
        "solemn",
        `${t.slug} should use solemn motion (got ${t.motionProfileId})`
      );
    }
  });

  it("exposes required memorial features on every funeral SKU", () => {
    const required = ["Attendance", "Calendar", "Maps", "Music", "RSVP"];
    for (const t of funerals) {
      for (const feature of required) {
        const has =
          t.features.includes(feature) ||
          (feature === "Attendance" && t.features.includes("RSVP"));
        assert.ok(has, `${t.slug} missing feature ${feature} (has: ${t.features.join(", ")})`);
      }
      assert.ok(
        t.features.includes("Tribute") ||
          t.features.includes("Thanksgiving") ||
          t.features.includes("Notice"),
        `${t.slug} should include Tribute, Thanksgiving, or Notice`
      );
    }
  });

  it("wires memorial envelope opening on candlelight flagship SKU", () => {
    const flagship = funerals.find((x) => x.slug === "memorial-candle-tribute");
    assert.ok(flagship);
    assert.equal(flagship!.experienceOverrides?.openingExperience, "wax-seal-black");
    assert.equal(flagship!.experienceOverrides?.outroExperience, "candle-legacy");

    const farewell = funerals.find((x) => x.slug === "candlelight-farewell");
    assert.ok(farewell);
    assert.equal(farewell!.experienceOverrides?.openingExperience, "curtain-award");
    assert.equal(farewell!.motionProfileId, "solemn");

    const elegy = funerals.find((x) => x.slug === "candlelight-elegy-pages");
    assert.ok(elegy);
    assert.equal(elegy!.experienceOverrides?.openingExperience, "light-beam");
    assert.equal(elegy!.experienceOverrides?.outroExperience, "candle-legacy");
  });

  it("solemn motion profile provides soft memorial parallax (not wedding drift)", () => {
    const solemn = getMotionProfile("solemn");
    assert.equal(solemn.drift, null);
    assert.ok(solemn.parallax);
    assert.ok((solemn.parallax?.background ?? 0) < 0.2);
  });

  it("memorial layout tabs align with funeral hub tabs", () => {
    const layoutTabs = getLayoutEnabledTabs("memorial-candle-tribute") ?? [];
    const funeralTabs = hubTabsForEventType("FUNERAL");
    for (const tab of ["invitation", "story", "venue", "timeline", "gallery", "memory", "rsvp"] as const) {
      assert.ok(layoutTabs.includes(tab), `layout missing ${tab}`);
      assert.ok(funeralTabs.includes(tab), `funeral hub missing ${tab}`);
    }
    const features = getLayoutSignatureFeatures("memorial-candle-tribute") ?? [];
    assert.ok(features.some((f) => /candle/i.test(f)));
    assert.ok(features.some((f) => /solemn/i.test(f)));
  });
});
