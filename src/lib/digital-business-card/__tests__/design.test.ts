import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  applyCeleCardDesign,
  celeCardPaperStyle,
  compactCeleCardDesign,
  paperToneFromBrightness,
} from "@/lib/digital-business-card/design";
import { resolveDigitalCardTheme } from "@/lib/digital-business-card/themes";
import { normalizeSocials } from "@/lib/digital-business-card/socials";

describe("CeleYou design desk", () => {
  it("keeps template tools the owner actually picked", () => {
    const design = compactCeleCardDesign({
      composition: "portrait-led",
      atmosphere: "spotlight",
      ornament: "marquee",
      paperUrl: "/uploads/celecard-papers/x.webp",
      paperWeight: "rich",
      paperTone: "dark",
    });
    assert.equal(design?.composition, "portrait-led");
    assert.equal(design?.atmosphere, "spotlight");
    assert.equal(design?.ornament, "marquee");
    assert.equal(design?.paperUrl, "/uploads/celecard-papers/x.webp");
    assert.equal(design?.paperWeight, "rich");
    assert.equal(design?.paperTone, "dark");
  });

  it("rejects unsafe paper urls and unknown tokens", () => {
    assert.equal(compactCeleCardDesign({ paperUrl: "javascript:alert(1)" }), undefined);
    assert.equal(compactCeleCardDesign({ composition: "unknown" }), undefined);
    assert.equal(compactCeleCardDesign({ paperUrl: "blob:http://localhost/1" }), undefined);
  });

  it("keeps house paper textures used by the templates", () => {
    const design = compactCeleCardDesign({ paperUrl: "/smartcard/textures/ukiyo.jpg", paperTone: "dark" });
    assert.equal(design?.paperUrl, "/smartcard/textures/ukiyo.jpg");
    assert.equal(design?.paperTone, "dark");
  });

  it("applies owner layout on top of a house template", () => {
    const gold = resolveDigitalCardTheme("gold-folio");
    const next = applyCeleCardDesign(gold, { composition: "portrait-led", atmosphere: "rain-city", ornament: "neon" });
    assert.equal(gold.composition, "classic");
    assert.equal(next.composition, "portrait-led");
    assert.equal(next.atmosphere, "rain-city");
    assert.equal(next.ornament, "neon");
    assert.equal(next.accent, gold.accent);
  });

  it("blends custom paper so type stays readable", () => {
    const frost = resolveDigitalCardTheme("elegant-frost");
    const paper = celeCardPaperStyle(frost, {
      paperUrl: "/uploads/celecard-papers/linen.webp",
      paperWeight: "balanced",
      paperTone: "light",
    });
    assert.equal(paper?.mixBlendMode, "multiply");
    assert.equal((paper?.opacity ?? 0) > 0.1, true);
    assert.match(paper?.veil ?? "", /linear-gradient/);
    assert.equal(paperToneFromBrightness(0.2), "dark");
    assert.equal(paperToneFromBrightness(0.8), "light");
  });

  it("keeps hue when a dark paper sits on a light plate", () => {
    const frost = resolveDigitalCardTheme("elegant-frost");
    const paper = celeCardPaperStyle(frost, {
      paperUrl: "/smartcard/textures/cyber.jpg",
      paperWeight: "balanced",
      paperTone: "dark",
    });
    assert.equal(paper?.mixBlendMode, "overlay");
  });

  it("round-trips design through socials JSON", () => {
    const socials = normalizeSocials({
      instagram: "ama",
      design: {
        composition: "grid",
        paperUrl: "/digital-cards/demo/ama-serwaa.jpg",
        paperWeight: "subtle",
      },
    });
    assert.equal(socials.design?.composition, "grid");
    assert.equal(socials.design?.paperUrl, "/digital-cards/demo/ama-serwaa.jpg");
    assert.equal(socials.instagram, "ama");
  });
});
