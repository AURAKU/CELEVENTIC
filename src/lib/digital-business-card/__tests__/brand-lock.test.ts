import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  CELEYOU_FORBIDDEN_MARK_INKS,
  CELEYOU_LOCKUP_PATH,
  CELEYOU_MARK_PATH,
  CELEYOU_ORIGINAL_ACCENT,
  CELEYOU_ORIGINAL_ATMOSPHERE,
  CELEYOU_ORIGINAL_BORDER,
  CELEYOU_ORIGINAL_COMPOSITION,
  CELEYOU_ORIGINAL_LAYOUT,
  CELEYOU_ORIGINAL_QR_INK,
  CELEYOU_ORIGINAL_THEME_ID,
  CELEYOU_WORDMARK_PATH,
  celeCardDesignOmitsIdentity,
  stripIdentityFromDesign,
} from "@/lib/digital-business-card/brand-lock";
import { compactCeleCardDesign, designAfterThemeChange } from "@/lib/digital-business-card/design";
import { DIGITAL_CARD_THEMES, resolveDigitalCardTheme } from "@/lib/digital-business-card/themes";
import {
  CELEYOU_BRAND_TEAL,
  CELEYOU_LOCKUP_SRC,
  CELEYOU_MARK_SRC,
  CELEYOU_WORDMARK_SRC,
  celeYouBrandStroke,
} from "@/components/digital-business-card/celeyou-brand-mark";
import { SMARTCARD_BRAND_TAGLINE, SMARTCARD_PRODUCT_SHORT_NAME } from "@/lib/digital-business-card/product";

function source(relative: string) {
  return readFileSync(join(process.cwd(), relative), "utf8");
}

describe("CeleYou brand and original plate lock", () => {
  it("keeps Elegant Frost as the original landscape plate", () => {
    const original = DIGITAL_CARD_THEMES[0];
    assert.equal(original.id, CELEYOU_ORIGINAL_THEME_ID);
    assert.equal(original.id, "elegant-frost");
    assert.equal(original.composition, CELEYOU_ORIGINAL_COMPOSITION);
    assert.equal(original.composition, "classic");
    assert.equal(original.atmosphere, CELEYOU_ORIGINAL_ATMOSPHERE);
    assert.equal(original.accent, CELEYOU_ORIGINAL_ACCENT);
    assert.equal(original.accent, CELEYOU_BRAND_TEAL);
    assert.equal(original.border, CELEYOU_ORIGINAL_BORDER);
    assert.equal(original.qrInk, CELEYOU_ORIGINAL_QR_INK);
    assert.equal(original.cardBackground.includes("#f4f9fc"), true);
    assert.equal(resolveDigitalCardTheme(undefined).id, CELEYOU_ORIGINAL_THEME_ID);
    assert.equal(resolveDigitalCardTheme("missing-look").id, CELEYOU_ORIGINAL_THEME_ID);
    assert.equal(CELEYOU_ORIGINAL_LAYOUT, "id-1");
  });

  it("ships the official teal orb, never a purple mockup mark", () => {
    assert.equal(SMARTCARD_PRODUCT_SHORT_NAME, "CeleYou");
    assert.equal(SMARTCARD_BRAND_TAGLINE, "One Identity. Infinite Connections.");
    assert.equal(CELEYOU_MARK_SRC, CELEYOU_MARK_PATH);
    assert.equal(CELEYOU_WORDMARK_SRC, CELEYOU_WORDMARK_PATH);
    assert.equal(CELEYOU_LOCKUP_SRC, CELEYOU_LOCKUP_PATH);
    assert.equal(CELEYOU_MARK_PATH, "/digital-cards/brands/celeyou-mark.png");
    assert.equal(celeYouBrandStroke(true), CELEYOU_BRAND_TEAL);
    const mark = source("src/components/digital-business-card/celeyou-brand-mark.tsx");
    const house = source("src/components/digital-business-card/digital-card-house-avatar.tsx");
    assert.match(mark, /object-contain/);
    assert.doesNotMatch(mark, /object-cover/);
    assert.match(house, /preserveAspectRatio="xMidYMid meet"/);
    for (const ink of CELEYOU_FORBIDDEN_MARK_INKS) {
      assert.doesNotMatch(mark, new RegExp(`CELEYOU_MARK_SRC = ["']${ink}`));
      assert.doesNotMatch(house, new RegExp(`href=\\{["']${ink}`));
    }
    assert.doesNotMatch(mark, /purple-logo|mockup-mark|celeyou-mark-purple/);
    const pulse = resolveDigitalCardTheme("creator-pulse");
    assert.equal(pulse.stageBackground.includes("#7c3aed33"), true);
    assert.notEqual(pulse.id, CELEYOU_ORIGINAL_THEME_ID);
  });

  it("does not let an optional look rewrite a card that only implied the original layout", () => {
    const original = resolveDigitalCardTheme(CELEYOU_ORIGINAL_THEME_ID);
    const pulse = resolveDigitalCardTheme("creator-pulse");
    const kept = designAfterThemeChange({}, pulse, true, original);
    assert.equal(kept.composition, "classic");
    assert.equal(kept.atmosphere, "salon");
    assert.notEqual(kept.composition, pulse.composition);
    const service = source("src/services/digital-business-card/digital-business-card.service.ts");
    const studio = source("src/components/digital-business-card/digital-card-studio-client.tsx");
    assert.match(service, /input\.themeId \?\? CELEYOU_ORIGINAL_THEME_ID/);
    assert.match(studio, /CELEYOU_ORIGINAL_THEME_ID as DigitalCardThemeId/);
    assert.match(studio, /designAfterThemeChange\(f\.design, next, keepFinish, current\)/);
  });

  it("never stores identity on the design object", () => {
    const packed = compactCeleCardDesign({
      composition: "classic",
      displayName: "Kojo Mensah",
      title: "Director",
      company: "Northline",
      avatarUrl: "/uploads/x.webp",
      slug: "kojo-mensah",
    });
    assert.equal(packed?.composition, "classic");
    assert.equal(celeCardDesignOmitsIdentity(packed), true);
    const stripped = stripIdentityFromDesign({
      composition: "classic" as const,
      displayName: "Kojo",
      publicToken: "token",
    });
    assert.equal(stripped.composition, "classic");
    assert.equal("displayName" in stripped, false);
    assert.equal("publicToken" in stripped, false);
  });
});
