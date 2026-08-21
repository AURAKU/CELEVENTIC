import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  FUNERAL_EXPERIENCE_THEMES,
  resolveFuneralTheme,
  funeralThemeCssVars,
} from "@/lib/funeral-experience/themes";
import {
  mapRevealStyleToIntro,
  resolveIntroForTheme,
  suggestThemeFromSku,
  resolveMotionLevel,
} from "@/lib/funeral-experience/experience-resolver";
import {
  computeAgeYears,
  formatLifeDates,
  ADINKRA_SYMBOLS,
  CULTURAL_RELIGIOUS_PRESETS,
} from "@/lib/funeral-experience/terminology";
import { getInviteBlueprint, categoryForBlueprint } from "@/lib/invite-blueprints/blueprint-registry";

describe("funeral experience themes", () => {
  it("ships at least 10 flagship themes", () => {
    assert.ok(FUNERAL_EXPERIENCE_THEMES.length >= 10);
    assert.equal(resolveFuneralTheme("eternal-rose").id, "eternal-rose");
    assert.equal(resolveFuneralTheme("missing").id, "eternal-rose");
    const vars = funeralThemeCssVars(resolveFuneralTheme("ghana-heritage"));
    assert.equal(vars["--funeral-gold"], "#D4AF37");
  });
});

describe("funeral intro resolver", () => {
  it("maps reveal styles to intros", () => {
    assert.equal(mapRevealStyleToIntro("CANDLELIGHT"), "candle-remembrance");
    assert.equal(mapRevealStyleToIntro("DOVE_RELEASE"), "heavenly-reveal");
    assert.equal(mapRevealStyleToIntro("FLORAL"), "floral-reveal");
    assert.equal(resolveIntroForTheme("heavenly-peace"), "heavenly-reveal");
  });

  it("respects reduced motion and low bandwidth", () => {
    assert.equal(resolveMotionLevel("cinematic", true, false), "none");
    assert.equal(resolveMotionLevel("cinematic", false, true), "minimal");
  });

  it("suggests themes from catalogue SKUs", () => {
    assert.equal(suggestThemeFromSku("kente-border-farewell"), "ghana-heritage");
    assert.equal(suggestThemeFromSku("white-lily-rest"), "heavenly-peace");
  });
});

describe("funeral terminology helpers", () => {
  it("formats sunrise/sunset and age", () => {
    const label = formatLifeDates({
      dateOfBirth: "1952-01-15",
      dateOfPassing: "2026-02-09",
      format: "sunrise-sunset",
    });
    assert.match(label, /Sunrise 1952/);
    assert.match(label, /Sunset 2026/);
    assert.equal(computeAgeYears("1952-01-15", "2026-02-09"), 74);
  });

  it("exposes Adinkra with meanings and cultural presets", () => {
    assert.ok(ADINKRA_SYMBOLS.every((s) => s.meaning && s.usage));
    assert.ok(CULTURAL_RELIGIOUS_PRESETS.some((p) => p.id === "muslim" && p.allowCrescent));
    assert.ok(!CULTURAL_RELIGIOUS_PRESETS.find((p) => p.id === "muslim")?.allowCross);
  });
});

describe("ghanaian funeral blueprints", () => {
  it("registers catalogue blueprint ids", () => {
    for (const id of [
      "funeral-akan-cloth-v1",
      "funeral-homegoing-v1",
      "funeral-kente-banner-v1",
      "funeral-vigil-notice-v1",
    ]) {
      assert.equal(categoryForBlueprint(id), "funeral");
      assert.equal(getInviteBlueprint(id).category, "funeral");
    }
  });
});
