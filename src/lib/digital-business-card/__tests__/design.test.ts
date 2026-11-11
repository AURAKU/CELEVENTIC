import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  applyCeleCardDesign,
  celeCardPaperStyle,
  compactCeleCardDesign,
  CELECARD_HOUSE_PAPERS,
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
      nameScale: "statement",
      faceLead: "code",
      lettering: "credit",
      ink: "dark",
      accent: "gold",
      qrFinish: "foil",
      grain: "linen",
      motion: "cinema",
    });
    assert.equal(design?.composition, "portrait-led");
    assert.equal(design?.atmosphere, "spotlight");
    assert.equal(design?.ornament, "marquee");
    assert.equal(design?.paperUrl, "/uploads/celecard-papers/x.webp");
    assert.equal(design?.paperWeight, "rich");
    assert.equal(design?.paperTone, "dark");
    assert.equal(design?.nameScale, "statement");
    assert.equal(design?.faceLead, "code");
    assert.equal(design?.lettering, "credit");
    assert.equal(design?.ink, "dark");
    assert.equal(design?.accent, "gold");
    assert.equal(design?.qrFinish, "foil");
    assert.equal(design?.grain, "linen");
    assert.equal(design?.motion, "cinema");
  });

  it("rejects unsafe paper urls and unknown tokens", () => {
    assert.equal(compactCeleCardDesign({ paperUrl: "javascript:alert(1)" }), undefined);
    assert.equal(compactCeleCardDesign({ composition: "unknown" }), undefined);
    assert.equal(compactCeleCardDesign({ paperUrl: "blob:http://localhost/1" }), undefined);
    assert.equal(compactCeleCardDesign({ lettering: "comic-sans", accent: "hotpink" }), undefined);
  });

  it("keeps house paper textures used by the templates", () => {
    const design = compactCeleCardDesign({ paperUrl: "/smartcard/textures/ukiyo.jpg", paperTone: "dark" });
    assert.equal(design?.paperUrl, "/smartcard/textures/ukiyo.jpg");
    assert.equal(design?.paperTone, "dark");
    assert.equal(CELECARD_HOUSE_PAPERS.length, 24);
    for (const paper of CELECARD_HOUSE_PAPERS) {
      assert.match(paper.url, /^\/smartcard\/textures\/[a-z0-9._-]+\.jpg$/);
      assert.equal(existsSync(join(process.cwd(), "public", paper.url.replace(/^\//, ""))), true, paper.id);
      assert.equal(compactCeleCardDesign({ paperUrl: paper.url })?.paperUrl, paper.url);
    }
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
    assert.equal(paper?.custom, true);
    assert.match(paper?.veil ?? "", /linear-gradient/);
    assert.match(paper?.mask ?? "", /linear-gradient/);
    assert.match(paper?.copyVeil ?? "", /linear-gradient/);
    assert.match(paper?.edge ?? "", /radial-gradient/);
    assert.equal(paperToneFromBrightness(0.2), "dark");
    assert.equal(paperToneFromBrightness(0.8), "light");
  });

  it("applies house ink and accent tokens without inventing CSS", () => {
    const frost = resolveDigitalCardTheme("elegant-frost");
    const next = applyCeleCardDesign(frost, { ink: "dark", accent: "gold", lettering: "neon" });
    assert.equal(next.accent, "#d4a63a");
    assert.equal(next.text, "#faf6ef");
    assert.match(next.cardBackground, /rgba\(8,10,16/);
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
        lettering: "letterhead",
        faceLead: "name",
        motion: "atelier",
      },
    });
    assert.equal(socials.design?.composition, "grid");
    assert.equal(socials.design?.paperUrl, "/digital-cards/demo/ama-serwaa.jpg");
    assert.equal(socials.design?.lettering, "letterhead");
    assert.equal(socials.design?.faceLead, "name");
    assert.equal(socials.design?.motion, "atelier");
    assert.equal(socials.instagram, "ama");
  });
});
