import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveDigitalCardTheme, DIGITAL_CARD_THEMES, celecardMotionMood } from "@/lib/digital-business-card/themes";
import { CELECARD_PAPER_INK, CELECARD_PAPER_MUTED, CELECARD_REACH_INK, celecardAccentOnStage, celecardCompanyDisplayLines, celecardCompanyFitCqw, celecardCtaOnPaper, celecardDisplayNameLines, celecardDockFinish, celecardInkLuminance, celecardKickerInk, celecardNameFitCqw, celecardNameShouldStack, celecardPaperAccent, celecardPaperTone, celecardPlateDisplayName, celecardReachPlate, celecardTitleDisplayLines, celecardTitleFitCqw, celecardTypeVoice } from "@/lib/digital-business-card/type-voice";
import {
  CELECARD_HOUSE_AVATAR_IDS,
  CELECARD_PORTRAIT_MAX_EDGE,
  CELECARD_PORTRAIT_WEBP_QUALITY,
  celeCardHouseAvatarId,
  celeCardHouseAvatarMeta,
  celeCardHouseAvatarValue,
  celeCardHouseAvatarsByGroup,
  celeCardHouseAvatarsByKind,
  isCeleCardIllustratedAvatar,
  isCeleCardPhotoUrl,
} from "@/lib/digital-business-card/portraits";
import { buildVCard, vcardContentDisposition, vcardDelivery } from "@/lib/digital-business-card/vcard";
import { isDigitalCardLive } from "@/services/digital-business-card/digital-business-card.service";
import { SMARTCARD_PLANS, getSmartCardPlan } from "@/lib/digital-business-card/plans";
import { SMARTCARD_BRAND_TAGLINE, SMARTCARD_PRODUCT_SHORT_NAME } from "@/lib/digital-business-card/product";
import {
  CELEYOU_BRAND_TEAL,
  CELEYOU_MARK_SRC,
  celeYouBrandStroke,
} from "@/components/digital-business-card/celeyou-brand-mark";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SMARTCARD_THEME_DEMOS } from "@/lib/digital-business-card/demos";
import { CELECARD_BIO_MAX_CHARS, clipCeleCardBio, digitalCardQrImageSrc } from "@/lib/digital-business-card/types";
import { DEMO_CARD } from "@/lib/digital-business-card/demo-card";
import {
  celecardEventIsPlateBackground,
  celecardHoldAxis,
  celecardHoldCoverSize,
  celecardHoldFitSize,
  celecardHoldIntentAfterAutoChange,
  celecardHoldIsActive,
  celecardHoldPresent,
  celecardHoldScanSize,
  celecardShouldHoldViewport,
  celecardToggleHoldIntent,
} from "@/lib/digital-business-card/hold-viewport";

describe("digital business card themes", () => {
  it("resolves known and fallback themes", () => {
    assert.equal(DIGITAL_CARD_THEMES.length >= 30, true);
    assert.equal(resolveDigitalCardTheme("teal-pulse").id, "teal-pulse");
    assert.equal(resolveDigitalCardTheme("founder").id, "founder");
    assert.equal(resolveDigitalCardTheme("deco-gilded").id, "deco-gilded");
    assert.equal(resolveDigitalCardTheme("missing").id, "elegant-frost");
    assert.equal(DIGITAL_CARD_THEMES.some((t) => t.category === "iconic"), true);
    assert.equal(DIGITAL_CARD_THEMES.some((t) => t.category === "cinematic"), true);
    assert.equal(DIGITAL_CARD_THEMES.some((t) => t.category === "landmark"), true);
    assert.equal(DIGITAL_CARD_THEMES.some((t) => t.category === "atelier"), true);
    const ids = DIGITAL_CARD_THEMES.map((t) => t.id);
    assert.equal(ids.length, new Set(ids).size);
    assert.equal(
      DIGITAL_CARD_THEMES.every((t) => Boolean(t.atmosphere && t.atmosphere !== "none")),
      true
    );
    assert.equal(
      DIGITAL_CARD_THEMES.every((t) => {
        const ornament = resolveDigitalCardTheme(t.id).ornament;
        return Boolean(ornament && ornament !== "none");
      }),
      true
    );
  });

  it("gives every theme a unique dummy persona", () => {
    const names = DIGITAL_CARD_THEMES.map((t) => SMARTCARD_THEME_DEMOS[t.id].displayName);
    assert.equal(names.length, new Set(names).size);
  });

  it("puts dummy people and company marks on template previews", async () => {
    const { existsSync } = await import("node:fs");
    const { SMARTCARD_HERO_FAN, demoForTheme } = await import("@/lib/digital-business-card/demos");
    const { isCeleCardIllustratedAvatar, isCeleCardPhotoUrl } = await import("@/lib/digital-business-card/portraits");
    assert.deepEqual(SMARTCARD_HERO_FAN, ["velvet-credits", "afro-future", "anime-cel"]);
    const photo = demoForTheme("velvet-credits");
    const avatar = demoForTheme("afro-future");
    const bitmoji = demoForTheme("anime-cel");
    assert.equal(isCeleCardPhotoUrl(photo.avatarUrl), true);
    assert.equal(existsSync(join(process.cwd(), "public", photo.avatarUrl!.replace(/^\//, ""))), true);
    assert.equal(isCeleCardIllustratedAvatar(avatar.avatarUrl), true);
    assert.equal(isCeleCardIllustratedAvatar(bitmoji.avatarUrl), true);
    assert.equal(avatar.avatarUrl, "house:afro");
    assert.equal(bitmoji.avatarUrl, "house:puff");
    assert.equal(isCeleCardPhotoUrl(demoForTheme("elegant-frost").avatarUrl), true);
    assert.equal(isCeleCardPhotoUrl(demoForTheme("gold-folio").avatarUrl), true);
    for (const theme of DIGITAL_CARD_THEMES) {
      const demo = SMARTCARD_THEME_DEMOS[theme.id];
      assert.equal(Boolean(demo.avatarUrl), true);
      assert.equal(demo.companyLogo, true);
    }
  });

  it("puts the official CeleYou lockup on the landing feature plate", () => {
    const source = readFileSync(join(process.cwd(), "src/components/landing/celeyou-feature-tile.tsx"), "utf8");
    const css = readFileSync(join(process.cwd(), "src/components/landing/celeyou-feature-tile.module.css"), "utf8");
    assert.match(source, /CELEYOU_LOCKUP_SRC/);
    assert.match(source, /CeleYouFeatureTile/);
    assert.match(css, /object-fit: contain/);
    assert.doesNotMatch(css, /object-fit:\s*cover/);
  });

  it("ships the official CeleYou mark and lockup line", () => {
    assert.equal(SMARTCARD_PRODUCT_SHORT_NAME, "CeleYou");
    assert.equal(SMARTCARD_BRAND_TAGLINE, "One Identity. Infinite Connections.");
    const mark = readFileSync(join(process.cwd(), "public/digital-cards/brands/celeyou-mark.png"));
    const wordmark = readFileSync(join(process.cwd(), "public/digital-cards/brands/celeyou-wordmark.png"));
    const lockup = readFileSync(join(process.cwd(), "public/digital-cards/brands/celeyou-lockup.png"));
    const pngMagic = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    assert.equal(mark.subarray(0, 4).equals(pngMagic), true);
    assert.equal(wordmark.subarray(0, 4).equals(pngMagic), true);
    assert.equal(lockup.subarray(0, 4).equals(pngMagic), true);
    assert.equal(mark.length > 20_000, true);
    assert.equal(wordmark.length > 80_000, true);
    assert.equal(lockup.length > 80_000, true);
  });

  it("keeps frame strokes from crossing the CeleYou lockup on every plate", () => {
    const source = readFileSync(join(process.cwd(), "src/components/digital-business-card/digital-card-face.tsx"), "utf8");
    assert.match(source, /function copySafeMask/);
    assert.match(source, /ellipse \$\{lockup\} at 50% 100%/);
    assert.doesNotMatch(
      source,
      /inset 0 -3px 8px rgba\(0,0,0,0\.14\), inset 0 0 0 1px \$\{theme\.border\}/
    );
    const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
    const wordmark = css.match(/\.celecard-wordmark \{[^}]+\}/);
    assert.ok(wordmark);
    assert.match(wordmark[0], /padding: 1\.2cqw 5cqw 3\.4cqw;/);
    assert.match(wordmark[0], /background:\s*transparent/);
    assert.match(wordmark[0], /box-shadow:\s*none/);
    assert.match(wordmark[0], /mix-blend-mode:\s*multiply/);
    assert.doesNotMatch(wordmark[0], /border-radius:\s*999px/);
    assert.match(css, /\.celecard-wordmark\[data-paper="dark"\] \{[\s\S]*mix-blend-mode:\s*screen/);
    assert.match(css, /\.celecard-wordmark-slogan \{/);
    assert.match(css, /\.celecard-wordmark-rule \{/);
    assert.match(source, /SMARTCARD_BRAND_TAGLINE/);
    assert.match(source, /celecard-wordmark-rule/);
  });

  it("shows the official CeleYou logo in full, never cropped to fill a square", () => {
    const house = readFileSync(
      join(process.cwd(), "src/components/digital-business-card/digital-card-house-avatar.tsx"),
      "utf8"
    );
    const mark = readFileSync(
      join(process.cwd(), "src/components/digital-business-card/celeyou-brand-mark.tsx"),
      "utf8"
    );
    const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
    assert.match(house, /CeleYouThemedMark/);
    assert.match(house, /preserveAspectRatio="xMidYMid meet"/);
    assert.match(house, /background: house \? theme\.cardBackground/);
    assert.doesNotMatch(house, /CELEYOU_BRAND_WELL/);
    assert.doesNotMatch(mark, /background: CELEYOU_BRAND_WELL/);
    assert.doesNotMatch(house, /scale-\[1\.28\]/);
    assert.doesNotMatch(house, /fillSquare/);
    assert.doesNotMatch(house, /fit="cover"/);
    assert.doesNotMatch(house, /#000000/);
    assert.match(mark, /object-contain object-center/);
    assert.doesNotMatch(mark, /object-cover/);
    const originPlate = css.match(/\.celecard-origin-plate \{[^}]+\}/);
    assert.ok(originPlate);
    assert.match(originPlate[0], /overflow:\s*visible/);
    assert.match(originPlate[0], /background:\s*transparent/);
    assert.match(originPlate[0], /isolation:\s*isolate/);
    assert.match(originPlate[0], /mix-blend-mode:\s*normal/);
    assert.match(originPlate[0], /height:\s*11cqw/);
    assert.match(css, /\.celecard-face\[data-compact="true"\] \.celecard-origin-plate \{[^}]*height:\s*9\.6cqw/);
    const companyMark = css.match(/\.celecard-company-mark \{[^}]+\}/);
    assert.ok(companyMark);
    assert.match(companyMark[0], /width:\s*10\.2cqw/);
    assert.match(css, /\.celecard-company-mark-by-portrait/);
    assert.match(css, /margin-left:\s*-5\.9cqw/);
    assert.match(css, /\.celecard-company-mark-by-portrait \{[^}]*width:\s*10\.2cqw/);
    assert.match(css, /\.celecard-face\[data-composition="media-first"\] \.celecard-company-mark\.celecard-company-mark-by-portrait \{[^}]*width:\s*11\.4cqw/);
    assert.match(css, /\.celecard-face\[data-composition="type-first"\] \.celecard-company-mark\.celecard-company-mark-by-portrait \{[^}]*width:\s*9\.2cqw/);
    assert.match(css, /\.celecard-face\[data-compact="true"\] \.celecard-company-mark\.celecard-company-mark-by-portrait \{[^}]*width:\s*8\.6cqw/);
    assert.doesNotMatch(css, /celecard-company-mark-on-photo/);
    assert.match(css, /\.celecard-face-row:not\(\.is-portrait\) \.celecard-face-title,\n\.celecard-face-row:not\(\.is-portrait\) \.celecard-face-company \{[^}]*margin-left:\s*-2\.4cqw/);
    assert.doesNotMatch(originPlate[0], /isolation:\s*auto/);
    assert.doesNotMatch(originPlate[0], /mix-blend-mode:\s*multiply/);
    assert.doesNotMatch(originPlate[0], /border-radius:\s*999px/);
    const originDark = css.match(/\.celecard-origin-plate\[data-paper="dark"\] \{[^}]+\}/);
    assert.ok(originDark);
    assert.match(originDark[0], /mix-blend-mode:\s*normal/);
    assert.doesNotMatch(originDark[0], /mix-blend-mode:\s*screen/);
    const originWell = css.match(/\.celecard-origin-well \{[^}]+\}/);
    assert.ok(originWell);
    assert.match(originWell[0], /border-radius:\s*50%/);
    assert.match(originWell[0], /background:\s*#ffffff/);
    assert.doesNotMatch(css, /celecard-origin-knockout/);
    assert.doesNotMatch(css, /celecard-origin-foil/);
    assert.doesNotMatch(css, /color-mix\(in srgb, var\(--celecard-accent\) 72%, #0b8a83\)/);
    assert.match(mark, /CeleYouMarkIcon/);
    assert.match(mark, /mixBlendMode: "normal"/);
    const originImg = css.match(/\.celecard-origin-plate img \{[^}]+\}/);
    assert.ok(originImg);
    assert.match(originImg[0], /object-fit: contain/);
    assert.match(originImg[0], /mix-blend-mode:\s*normal/);
    assert.doesNotMatch(originImg[0], /transform:\s*scale/);
    assert.match(mark, /overflow-visible/);
    const face = readFileSync(
      join(process.cwd(), "src/components/digital-business-card/digital-card-face.tsx"),
      "utf8"
    );
    assert.match(face, /CeleYouMarkIcon/);
    assert.match(face, /celecard-origin-well/);
    assert.match(face, /celecard-company-mark-by-portrait/);
    assert.match(face, /FaceFitCompany[\s\S]*FaceCompanyBadge company=\{company\}/);
    assert.doesNotMatch(face, /function FacePhoto\([\s\S]*FaceCompanyBadge/);
    assert.doesNotMatch(face, /celecard-company-mark-on-photo/);
  });

  it("keeps the official CeleYou mark's own teal on every template", () => {
    assert.equal(CELEYOU_MARK_SRC, "/digital-cards/brands/celeyou-mark.png");
    assert.equal(celeYouBrandStroke(true), CELEYOU_BRAND_TEAL);
    assert.equal(celeYouBrandStroke(false), CELEYOU_BRAND_TEAL);
    for (const theme of DIGITAL_CARD_THEMES) {
      const stroke = celeYouBrandStroke(
        (parseInt(theme.text.slice(1, 3), 16) * 299 +
          parseInt(theme.text.slice(3, 5), 16) * 587 +
          parseInt(theme.text.slice(5, 7), 16) * 114) /
          1000 <
          148
      );
      assert.equal(stroke, CELEYOU_BRAND_TEAL, theme.id);
    }
  });

  it("treats missing portraits as the CeleYou mark and photos as photos", () => {
    assert.equal(isCeleCardPhotoUrl(null), false);
    assert.equal(isCeleCardPhotoUrl("house:foil"), false);
    assert.equal(isCeleCardPhotoUrl("/digital-cards/demo/ama-serwaa.jpg"), true);
    assert.equal(celeCardHouseAvatarId(null), "celecard");
    assert.equal(celeCardHouseAvatarId(celeCardHouseAvatarValue("earth")), "earth");
    assert.equal(celeCardHouseAvatarsByKind("mark").length, 24);
    assert.equal(celeCardHouseAvatarsByKind("avatar").length, 68);
    assert.equal(CELECARD_HOUSE_AVATAR_IDS.length, 92);
    assert.equal(celeCardHouseAvatarsByGroup("people").length, 38);
    const faces = readFileSync(
      join(process.cwd(), "src/components/digital-business-card/digital-card-avatar-faces.tsx"),
      "utf8"
    );
    for (const person of celeCardHouseAvatarsByGroup("people")) {
      assert.match(faces, new RegExp(`case "${person.id}":`));
    }
    for (const shape of ["round", "oval", "square", "heart", "long", "wide", "diamond"]) {
      assert.match(faces, new RegExp(`shape="${shape}"`));
    }
    for (const eyes of ["round", "almond", "hooded", "lid", "wide", "deep"]) {
      assert.match(faces, new RegExp(`eyes="${eyes}"`));
    }
    assert.match(faces, /fullness="full"/);
    assert.match(faces, /aged/);
    const house = readFileSync(
      join(process.cwd(), "src/components/digital-business-card/digital-card-house-avatar.tsx"),
      "utf8"
    );
    for (const mark of celeCardHouseAvatarsByGroup("mark")) {
      if (mark.id === "celecard") continue;
      assert.match(house, new RegExp(`case "${mark.id}":`));
    }
    assert.equal(celeCardHouseAvatarsByGroup("creature").length, 20);
    const studioSource = readFileSync(
      join(process.cwd(), "src/components/digital-business-card/digital-card-avatar-studio.tsx"),
      "utf8"
    );
    for (const creature of celeCardHouseAvatarsByGroup("creature")) {
      assert.match(studioSource, new RegExp(`case "${creature.id}":`));
    }
    assert.equal(celeCardHouseAvatarsByGroup("studio").length, 10);
    assert.equal(celeCardHouseAvatarMeta("braids").kind, "avatar");
    assert.equal(celeCardHouseAvatarMeta("fox").group, "creature");
    assert.equal(celeCardHouseAvatarMeta("prism").group, "studio");
    assert.equal(celeCardHouseAvatarMeta("foil").kind, "mark");
    assert.equal(isCeleCardIllustratedAvatar("house:afro"), true);
    assert.equal(isCeleCardIllustratedAvatar("house:fox"), true);
    assert.equal(isCeleCardIllustratedAvatar("house:crystal"), true);
    assert.equal(isCeleCardIllustratedAvatar("house:celecard"), false);
    assert.equal(celeCardHouseAvatarId("house:missing"), "celecard");
    for (const id of CELECARD_HOUSE_AVATAR_IDS) {
      assert.equal(celeCardHouseAvatarId(celeCardHouseAvatarValue(id)), id);
      assert.equal(isCeleCardPhotoUrl(celeCardHouseAvatarValue(id)), false);
    }
  });

  it("confirms identity button presses with a live studio notice", () => {
    const portrait = readFileSync(
      join(process.cwd(), "src/components/digital-business-card/digital-card-portrait-field.tsx"),
      "utf8"
    );
    const studio = readFileSync(
      join(process.cwd(), "src/components/digital-business-card/digital-card-studio-client.tsx"),
      "utf8"
    );
    const notice = readFileSync(
      join(process.cwd(), "src/components/digital-business-card/digital-card-studio-notice.tsx"),
      "utf8"
    );
    assert.match(portrait, /frame selected/);
    assert.match(portrait, /DigitalCardStudioNotice/);
    assert.match(portrait, /aria-haspopup="listbox"/);
    assert.match(portrait, /studio-portrait-frame-menu/);
    assert.match(portrait, /Previous frame/);
    assert.match(portrait, /Next frame/);
    assert.match(portrait, /Portrait frame, /);
    assert.match(portrait, /studio-portrait-\$\{id\}-menu/);
    assert.match(portrait, /Previous \$\{label\} page/);
    assert.match(portrait, /Next \$\{label\} page/);
    assert.match(portrait, /id="marks"/);
    assert.match(portrait, /id="people"/);
    assert.match(portrait, /id="creatures"/);
    assert.match(portrait, /id="studio"/);
    assert.match(portrait, /Choose a mark/);
    assert.match(portrait, /Choose a person/);
    assert.match(portrait, /Choose a creature/);
    assert.match(portrait, /Choose a studio mark/);
    assert.match(portrait, /celecardPaperTone/);
    assert.doesNotMatch(portrait, /flex flex-wrap gap-1.5/);
    assert.match(notice, /aria-live="polite"/);
    assert.match(studio, /DigitalCardStudioNotice/);
    assert.match(studio, /New card ready/);
  });

  it("keeps portrait masters large enough for retina present and portrait-led plates", () => {
    assert.equal(CELECARD_PORTRAIT_MAX_EDGE >= 2048, true);
    assert.equal(CELECARD_PORTRAIT_WEBP_QUALITY >= 92, true);
  });

  it("gives each template family a matching type voice", () => {
    assert.equal(celecardTypeVoice(resolveDigitalCardTheme("gold-folio")).originStyle, "letterhead");
    assert.equal(celecardTypeVoice(resolveDigitalCardTheme("velvet-credits")).originStyle, "credit");
    assert.equal(celecardTypeVoice(resolveDigitalCardTheme("sahara-dune")).originStyle, "carved");
    assert.equal(celecardTypeVoice(resolveDigitalCardTheme("creator-pulse")).originStyle, "masthead");
    assert.equal(celecardTypeVoice(resolveDigitalCardTheme("charcoal-minimal")).originStyle, "stamp");
    assert.equal(celecardTypeVoice(resolveDigitalCardTheme("cyber-neon")).originStyle, "neon");
    assert.equal(celecardTypeVoice(resolveDigitalCardTheme("gold-folio")).titleItalic, true);
    assert.equal(celecardTypeVoice(resolveDigitalCardTheme("gold-folio")).stacksDisplayName, true);
    assert.equal(celecardTypeVoice(resolveDigitalCardTheme("creator-pulse")).titleItalic, false);
    assert.equal(celecardTypeVoice(resolveDigitalCardTheme("creator-pulse")).stacksDisplayName, false);
    assert.deepEqual(celecardDisplayNameLines("Ama Serwaa", true), ["Ama", "Serwaa"]);
    assert.deepEqual(celecardDisplayNameLines("Ama Serwaa Boateng", true), ["Ama S.", "Boateng"]);
    assert.deepEqual(celecardDisplayNameLines("Ama Serwaa", false), ["Ama Serwaa"]);
    assert.deepEqual(celecardDisplayNameLines("Madonna", true), ["Madonna"]);
    assert.equal(celecardPlateDisplayName("Jeffery Owuraku Afari"), "Jeffery O. Afari");
    assert.equal(celecardPlateDisplayName("Kwame Yaw Kofi Mensah"), "Kwame Y. K. Mensah");
    assert.equal(celecardPlateDisplayName("Jeffery O. Afari"), "Jeffery O. Afari");
    assert.equal(celecardPlateDisplayName("Kojo Mensah"), "Kojo Mensah");
    assert.equal(celecardPlateDisplayName("Ludwig van Beethoven"), "Ludwig van Beethoven");
    assert.equal(celecardPlateDisplayName("Jeffery Owuraku Afari Jr"), "Jeffery O. Afari Jr");
    assert.equal(celecardNameFitCqw("Madonna", true) > celecardNameFitCqw("Alexandrina Worthington", true), true);
    assert.equal(celecardNameShouldStack("Nhyira Addo", true), false);
    assert.equal(celecardNameShouldStack("Jeffery Owuraku Afari", true), false);
    assert.equal(celecardNameShouldStack("Alexandrina Worthington-Mensah", true), true);
    assert.equal(celecardNameFitCqw("Alexandria Boateng Mensah", false) < celecardNameFitCqw("Ama Serwaa", false), true);
    assert.equal(celecardNameFitCqw("Jeffery Owuraku Afari", false) > celecardNameFitCqw("Alexandrina Worthington-Mensah", false), true);
    assert.deepEqual(celecardCompanyDisplayLines("Aura Group"), ["Aura Group"]);
    assert.deepEqual(celecardCompanyDisplayLines("Spark & Drive"), ["Spark &", "Drive"]);
    assert.deepEqual(celecardCompanyDisplayLines("Spark & Drive", { uppercase: true }), ["Spark &", "Drive"]);
    assert.deepEqual(celecardCompanyDisplayLines("Aura Group Innovative Holdings Limited"), [
      "Aura Group Innovative",
      "Holdings Limited",
    ]);
    assert.equal(celecardCompanyDisplayLines("Ministry of Food and Agriculture").length, 2);
    assert.equal(celecardCompanyDisplayLines("Aura Group Innovative Holdings Limited").join(" "), "Aura Group Innovative Holdings Limited");
    assert.equal(
      celecardCompanyFitCqw("Aura Group") > celecardCompanyFitCqw("Aura Group Innovative Holdings Limited"),
      true
    );
    const face = readFileSync(join(process.cwd(), "src/components/digital-business-card/digital-card-face.tsx"), "utf8");
    assert.match(face, /FaceFitCompany/);
    assert.doesNotMatch(face, /compact \? "line-clamp-1" : null, voice\.companyTransform/);
    assert.deepEqual(celecardTitleDisplayLines("Product Lead"), ["Product Lead"]);
    assert.deepEqual(celecardTitleDisplayLines("CEO"), ["CEO"]);
    assert.deepEqual(celecardTitleDisplayLines("Founder & Creative Director"), ["Founder & Creative Director"]);
    assert.equal(celecardTitleDisplayLines("Founder & Creative Director").join(" "), "Founder & Creative Director");
    assert.equal(
      celecardTitleFitCqw("CEO") > celecardTitleFitCqw("Founder & Creative Director"),
      true
    );
    assert.match(face, /FaceFitTitle/);
    const voices = new Set(["letterhead", "credit", "stamp", "neon", "masthead", "carved", "script", "mono"]);
    for (const theme of DIGITAL_CARD_THEMES) {
      assert.equal(voices.has(celecardTypeVoice(theme).originStyle), true, theme.id);
    }
    assert.equal(celecardTypeVoice(resolveDigitalCardTheme("gold-folio"), "script").originStyle, "script");
    assert.equal(celecardTypeVoice(resolveDigitalCardTheme("gold-folio"), "mono").originStyle, "mono");
    assert.equal(celecardTypeVoice(resolveDigitalCardTheme("gold-folio"), "script").titleItalic, true);
    assert.equal(celecardKickerInk("#0B8A83", false).toLowerCase(), "#0b8a83");
    assert.notEqual(celecardKickerInk("#848686", false).toLowerCase(), "#848686");
    assert.equal(celecardInkLuminance(celecardKickerInk("#d4a63a", false)) <= 142, true);
    for (const theme of DIGITAL_CARD_THEMES) {
      const ink = celecardKickerInk(theme.accent, false);
      assert.match(ink, /^#([0-9a-fA-F]{6})$/, theme.id);
    }
  });

  it("paints the guest dock with each template's house finish", () => {
    const gold = celecardDockFinish(resolveDigitalCardTheme("gold-folio"), { darkStage: true, stageHex: "1a1410" });
    assert.equal(gold.originStyle, "letterhead");
    assert.equal(gold.saveBg, "#b45309");
    assert.equal(gold.foil, true);
    assert.equal(gold.labelTransform, "uppercase");
    const neon = celecardDockFinish(resolveDigitalCardTheme("cyber-neon"), { darkStage: true, stageHex: "020617" });
    assert.equal(neon.originStyle, "neon");
    assert.equal(neon.saveBg, "#22d3ee");
    assert.equal(neon.foil, false);
    const coral = celecardDockFinish(resolveDigitalCardTheme("coral-studio"), { darkStage: false, stageHex: "fff1f2" });
    assert.equal(coral.originStyle, "masthead");
    assert.match(coral.trayBg, /255/);
    assert.equal(coral.ghostFg, CELECARD_REACH_INK);
    assert.match(coral.ghostBorder, /28,25,23/);
    const stamp = celecardDockFinish(resolveDigitalCardTheme("charcoal-minimal"), { darkStage: false });
    assert.equal(stamp.originStyle, "stamp");
    assert.equal(stamp.labelTransform, "none");
    const pulse = celecardDockFinish(resolveDigitalCardTheme("teal-pulse"), { darkStage: false, stageHex: "ecfdf8" });
    assert.equal(pulse.ghostFg, CELECARD_REACH_INK);
    assert.equal(pulse.saveFg, "#16120e");
  });

  it("keeps reach-row type dark on every template, including cream-on-plate houses", () => {
    for (const theme of DIGITAL_CARD_THEMES) {
      const light = celecardReachPlate(theme, false);
      const dark = celecardReachPlate(theme, true);
      assert.equal(light.color, CELECARD_REACH_INK, theme.id);
      assert.equal(dark.color, CELECARD_REACH_INK, theme.id);
    }
    const pulse = resolveDigitalCardTheme("teal-pulse");
    assert.equal(pulse.text, "#f8fafc");
    const paperGold = celecardPaperAccent(pulse.accent);
    assert.notEqual(paperGold.toLowerCase(), pulse.accent.toLowerCase());
    assert.equal(celecardInkLuminance(paperGold) <= 142, true);
    assert.equal(celecardAccentOnStage(pulse.accent, false), paperGold);
    assert.equal(celecardAccentOnStage("#0B8A83", false), "#0B8A83");
    const paleOnTeal = celecardCtaOnPaper("#f8fafc", "#0B8A83");
    assert.equal(paleOnTeal.color, "#16120e");
    assert.equal(paleOnTeal.background.toLowerCase(), "#f8fafc");
    const tealOnTeal = celecardCtaOnPaper("#0B8A83", "#0B8A83");
    assert.equal(tealOnTeal.background, "#fffef8");
    assert.equal(tealOnTeal.color, "#16120e");
    assert.equal(celecardAccentOnStage("#0a3d3a", true), "#f4e6c8");
    const desk = celecardPaperTone(pulse);
    assert.equal(desk.text, CELECARD_PAPER_INK);
    assert.equal(desk.muted, CELECARD_PAPER_MUTED);
    assert.equal(celecardInkLuminance(desk.text) < 60, true);
    assert.equal(celecardInkLuminance(desk.muted) < 90, true);
  });

  it("maps every template to a guest motion mood", () => {
    const moods = new Set(["atelier", "cinema", "pulse", "earth", "linen", "still", "spotlight"]);
    for (const theme of DIGITAL_CARD_THEMES) {
      assert.equal(moods.has(celecardMotionMood(theme)), true, theme.id);
    }
    assert.equal(celecardMotionMood(resolveDigitalCardTheme("gold-folio"), "still"), "still");
    assert.equal(celecardMotionMood(resolveDigitalCardTheme("gold-folio"), "spotlight"), "spotlight");
    assert.equal(celecardMotionMood(resolveDigitalCardTheme("gold-folio")), "atelier");
    assert.equal(celecardMotionMood(resolveDigitalCardTheme("velvet-credits")), "cinema");
    assert.equal(celecardMotionMood(resolveDigitalCardTheme("creator-pulse")), "pulse");
    assert.equal(celecardMotionMood(resolveDigitalCardTheme("sahara-dune")), "earth");
  });
});

describe("subscription countdown", () => {
  it("counts down to renewal, studio end, and an ended window", async () => {
    const { DEMO_CARD_ACTIVATED_AT, DEMO_CARD_PAID_THROUGH } = await import(
      "@/lib/digital-business-card/demo-card"
    );
    const {
      countdownFlowDelayMs,
      countdownParts,
      countdownTickMs,
      formatPaidThrough,
      formatTermDatesCopy,
      subscriptionCountdown,
    } = await import("@/lib/digital-business-card/subscription-countdown");
    const now = new Date("2026-11-09T16:20:00.000Z");
    const renew = subscriptionCountdown(DEMO_CARD_PAID_THROUGH, "ACTIVE", now);
    assert.equal(renew?.kind, "renewal");
    assert.equal(renew?.paidThrough, formatPaidThrough(DEMO_CARD_PAID_THROUGH));
    assert.match(renew?.label ?? "", /^Renews in 365 days/);
    assert.equal(renew?.parts.days, 365);
    assert.equal(renew?.parts.hours, 7);
    assert.equal(renew?.parts.minutes, 39);
    assert.equal(renew?.parts.seconds, 59);
    assert.equal((renew?.remainingRatio ?? 0) > 0.9, true);
    assert.equal(countdownTickMs(renew?.remainingMs ?? 1), 1000);
    assert.equal(countdownFlowDelayMs(1_700_000_500), 500);
    const split = countdownParts(2 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000 + 4 * 60 * 1000 + 5 * 1000);
    assert.deepEqual(split, { days: 2, hours: 3, minutes: 4, seconds: 5 });
    const trialEnd = new Date(now.getTime() + 5 * 60 * 60 * 1000 + 12 * 60 * 1000);
    const trial = subscriptionCountdown(trialEnd, "TRIAL", now);
    assert.equal(trial?.kind, "expiry");
    assert.match(trial?.label ?? "", /^Studio ends in 5 hours 12 minutes/);
    assert.equal(trial?.parts.hours, 5);
    assert.equal(trial?.parts.minutes, 12);
    const ended = subscriptionCountdown(new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), "ACTIVE", now);
    assert.equal(ended?.kind, "ended");
    assert.match(ended?.label ?? "", /^Ended 2 days/);
    assert.equal(countdownTickMs(ended?.remainingMs ?? -1), 60_000);
    const named = subscriptionCountdown(DEMO_CARD_PAID_THROUGH, "ACTIVE", now, DEMO_CARD_ACTIVATED_AT);
    assert.equal(named?.activatedOn, formatPaidThrough(DEMO_CARD_ACTIVATED_AT));
    assert.equal(
      named?.termCopy,
      `Activated ${formatPaidThrough(DEMO_CARD_ACTIVATED_AT)}. Expires ${formatPaidThrough(DEMO_CARD_PAID_THROUGH)}.`
    );
    assert.equal(
      formatTermDatesCopy(DEMO_CARD_PAID_THROUGH, DEMO_CARD_ACTIVATED_AT, "renewal"),
      named?.termCopy
    );
    const trialNamed = subscriptionCountdown(trialEnd, "TRIAL", now, now);
    assert.equal(trialNamed?.termCopy, `Activated ${formatPaidThrough(now)}. Expires ${formatPaidThrough(trialEnd)}.`);
    const endedAt = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    const endedStart = new Date(now.getTime() - 16 * 24 * 60 * 60 * 1000);
    const endedNamed = subscriptionCountdown(endedAt, "ACTIVE", now, endedStart);
    assert.equal(
      endedNamed?.termCopy,
      `Activated ${formatPaidThrough(endedStart)}. Expired ${formatPaidThrough(endedAt)}.`
    );
    assert.equal(
      formatTermDatesCopy(DEMO_CARD_PAID_THROUGH, null, "expiry"),
      `Expires ${formatPaidThrough(DEMO_CARD_PAID_THROUGH)}.`
    );
  });

  it("keeps the live term plate free of a listed price", () => {
    const ribbon = readFileSync(
      join(process.cwd(), "src/components/digital-business-card/digital-card-subscription-countdown.tsx"),
      "utf8"
    );
    const demo = readFileSync(
      join(process.cwd(), "src/components/digital-business-card/digital-card-live-demo-studio.tsx"),
      "utf8"
    );
    const studio = readFileSync(
      join(process.cwd(), "src/components/digital-business-card/digital-card-studio-client.tsx"),
      "utf8"
    );
    assert.doesNotMatch(ribbon, /priceGhs/);
    assert.doesNotMatch(ribbon, /₵\{/);
    assert.match(ribbon, /celecard-term-flow/);
    assert.match(ribbon, /profile views/);
    assert.match(ribbon, /celecard-term-chip-icon/);
    assert.match(ribbon, /QrCode/);
    assert.match(ribbon, /studio-activity/);
    assert.match(ribbon, /cardId/);
    assert.match(ribbon, /cache: "no-store"/);
    assert.match(ribbon, /\/analytics/);
    assert.match(ribbon, /snap\.termCopy/);
    assert.doesNotMatch(ribbon, /Open through/);
    assert.doesNotMatch(ribbon, /Paid through/);
    assert.match(studio, /cardId=\{active\.id\}/);
    assert.match(studio, /guestShareable \|\| active\.isLive/);
    assert.match(studio, /lastActivatedAt \|\| active\.createdAt/);
    assert.match(demo, /planLabel="Yearly"/);
    assert.match(demo, /DEMO_CARD_ACTIVATED_AT/);
    assert.doesNotMatch(demo, /yearly\?\.priceGhs/);
    assert.match(demo, /<FolioField label="Company"/);
    assert.doesNotMatch(demo, /<FolioField label="House"/);
  });
});

describe("smartcard plans", () => {
  it("prices monthly through yearly with savings", () => {
    assert.equal(SMARTCARD_PLANS.length, 4);
    assert.equal(getSmartCardPlan("monthly")?.priceGhs, 49);
    assert.equal(getSmartCardPlan("quarter")?.months, 3);
    assert.equal(getSmartCardPlan("half")?.priceGhs, 239);
    assert.equal(getSmartCardPlan("yearly")?.priceGhs, 399);
    assert.equal(getSmartCardPlan("yearly")?.pricePesewas, 39900);
    assert.equal(getSmartCardPlan("yearly")?.savePercent, 32);
    assert.equal((getSmartCardPlan("yearly")?.saveGhs ?? 0) > 0, true);
  });
});

describe("nfc capability detection", () => {
  it("never claims write support without Web NFC", async () => {
    const { detectNfcWriteSupport } = await import("@/lib/digital-business-card/nfc-capability");
    const result = detectNfcWriteSupport({
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X)",
      platform: "MacIntel",
      maxTouchPoints: 0,
    } as Navigator);
    assert.equal(result.canWrite, false);
    assert.match(result.guidance, /NFC|QR/);
    assert.doesNotMatch(result.guidance, /Chrome on Android only|Phone to phone/i);
  });
});

describe("digital business card live gate", () => {
  it("requires publish + paid ACTIVE + unexpired or grace", () => {
    const future = new Date(Date.now() + 86400000);
    const past = new Date(Date.now() - 86400000);
    const afterGrace = new Date(Date.now() - 5 * 86400000);
    assert.equal(
      isDigitalCardLive({
        isPublished: true,
        subscriptionStatus: "TRIAL",
        subscriptionExpiresAt: future,
      }),
      false
    );
    assert.equal(
      isDigitalCardLive({
        isPublished: true,
        subscriptionStatus: "ACTIVE",
        subscriptionExpiresAt: future,
      }),
      true
    );
    assert.equal(
      isDigitalCardLive({
        isPublished: true,
        subscriptionStatus: "ACTIVE",
        subscriptionExpiresAt: past,
        lastActivatedAt: new Date(Date.now() - 40 * 86400000),
      }),
      true
    );
    assert.equal(
      isDigitalCardLive({
        isPublished: true,
        subscriptionStatus: "EXPIRED",
        subscriptionExpiresAt: afterGrace,
        lastActivatedAt: new Date(Date.now() - 40 * 86400000),
      }),
      false
    );
    assert.equal(
      isDigitalCardLive({
        isPublished: false,
        subscriptionStatus: "ACTIVE",
        subscriptionExpiresAt: future,
      }),
      false
    );
  });
});

describe("vcard export", () => {
  it("builds a parseable vcard", () => {
    const vcf = buildVCard({
      id: "card_1",
      slug: "ama",
      publicToken: "tok_ama",
      displayName: "Ama Mensah",
      title: "Founder",
      company: "Celeventic",
      bio: "Hello",
      email: "ama@example.com",
      phone: "+2330000000",
      website: "https://celeventic.com",
      socials: { linkedin: "ama" },
      themeId: "elegant-frost",
      avatarUrl: null,
      pronouns: null,
      nfcEnabled: true,
      connectBackEnabled: true,
      defaultMode: "professional",
      isLive: true,
    });
    assert.match(vcf, /BEGIN:VCARD/);
    assert.match(vcf, /VERSION:3.0/);
    assert.match(vcf, /FN;CHARSET=UTF-8:Ama Mensah/);
    assert.match(vcf, /N;CHARSET=UTF-8:Mensah;Ama;;;/);
    assert.match(vcf, /ORG;CHARSET=UTF-8:Celeventic/);
    assert.match(vcf, /TITLE;CHARSET=UTF-8:Founder/);
    assert.match(vcf, /TEL;TYPE=CELL;TYPE=VOICE;TYPE=PREF:\+2330000000/);
    assert.match(vcf, /EMAIL;TYPE=INTERNET:ama@example.com/);
    assert.match(vcf, /URL;TYPE=WORK:https:\/\/celeventic.com/);
    assert.match(vcf, /X-ABLabel:LinkedIn/);
    assert.match(vcf, /X-SOCIALPROFILE;TYPE=linkedin;x-user=ama:/);
    assert.match(vcf, /CATEGORIES:CeleYou/);
    assert.match(vcf, /NOTE;CHARSET=UTF-8:Hello/);
    assert.match(vcf, /URL;TYPE=PREF:https:\/\/www\.celeventic\.com\/card\/ama/);
    assert.match(vcf, /END:VCARD/);
  });

  it("puts the live profile URL and pronouns in the contact file", () => {
    const vcf = buildVCard(
      {
        id: "card_1",
        slug: "ama",
        publicToken: "tok_ama",
        displayName: "Ama Mensah",
        title: "Founder",
        company: "Celeventic",
        bio: "Hello",
        email: "ama@example.com",
        phone: "+2330000000",
        website: "https://celeventic.com",
        socials: { linkedin: "ama" },
        themeId: "elegant-frost",
        avatarUrl: null,
        pronouns: "she/her",
        nfcEnabled: true,
        connectBackEnabled: true,
        defaultMode: "professional",
        isLive: true,
      },
      { cardUrl: "https://www.celeventic.com/u/ama" }
    );
    assert.match(vcf, /URL;TYPE=PREF:https:\/\/www\.celeventic\.com\/card\/ama/);
    assert.match(vcf, /X-ABLabel:CeleYou/);
    assert.match(vcf, /X-PRONOUNS;CHARSET=UTF-8:she\/her/);
    assert.match(vcf, /NOTE;CHARSET=UTF-8:Pronouns: she\/her\\nHello/);
  });

  it("hands the vcf to each OS the way Contacts expects", () => {
    const ios = vcardDelivery("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)");
    assert.equal(ios.disposition, "inline");
    assert.match(ios.contentType, /text\/vcard/);
    const android = vcardDelivery("Mozilla/5.0 (Linux; Android 14)");
    assert.equal(android.disposition, "attachment");
    assert.match(android.contentType, /text\/x-vcard/);
    const mac = vcardDelivery("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)");
    assert.equal(mac.disposition, "attachment");
    const windows = vcardDelivery("Mozilla/5.0 (Windows NT 10.0; Win64; x64)");
    assert.equal(windows.disposition, "attachment");
    assert.match(
      vcardContentDisposition("attachment", "ama-mensah.vcf"),
      /filename="ama-mensah\.vcf"/
    );
  });
});

describe("celecard social catalog", () => {
  it("turns handles and numbers into tap URLs", async () => {
    const { digitalCardSocialHref, DIGITAL_CARD_SOCIAL_NETWORKS } = await import(
      "@/lib/digital-business-card/socials"
    );
    assert.equal(digitalCardSocialHref("whatsapp", "233240000000"), "https://wa.me/233240000000");
    assert.equal(digitalCardSocialHref("whatsappbusiness", "233240000000"), "https://wa.me/233240000000");
    assert.equal(
      digitalCardSocialHref("whatsappbusiness", "https://wa.me/message/ABC123XYZ"),
      "https://wa.me/message/ABC123XYZ"
    );
    assert.ok(DIGITAL_CARD_SOCIAL_NETWORKS.some((n) => n.key === "whatsappbusiness" && n.label === "WhatsApp Business"));
    assert.equal(digitalCardSocialHref("telegram", "amaserwaa"), "https://t.me/amaserwaa");
    assert.equal(digitalCardSocialHref("threads", "@amaserwaa"), "https://www.threads.net/@amaserwaa");
    assert.equal(digitalCardSocialHref("x", "amaserwaa"), "https://x.com/amaserwaa");
    assert.equal(digitalCardSocialHref("tiktok", "amaserwaa"), "https://www.tiktok.com/@amaserwaa");
    assert.equal(digitalCardSocialHref("instagram", "amaserwaa"), "https://www.instagram.com/amaserwaa");
    assert.equal(digitalCardSocialHref("wechat", "https://u.wechat.com/ama"), "https://u.wechat.com/ama");
    assert.ok(DIGITAL_CARD_SOCIAL_NETWORKS.some((n) => n.key === "trendshub"));
    assert.ok(DIGITAL_CARD_SOCIAL_NETWORKS.some((n) => n.key === "location"));
    assert.ok(DIGITAL_CARD_SOCIAL_NETWORKS.length >= 20);
    const { hasOfficialBrandMark } = await import(
      "@/components/digital-business-card/digital-card-brand-mark"
    );
    const missing = DIGITAL_CARD_SOCIAL_NETWORKS.filter((n) => !hasOfficialBrandMark(n.key));
    assert.deepEqual(missing.map((n) => n.key), []);
    assert.equal(hasOfficialBrandMark("signal"), true);
    assert.equal(hasOfficialBrandMark("whatsappbusiness"), true);
    assert.equal(hasOfficialBrandMark("website"), true);
    const { DIGITAL_CARD_BRAND_PATHS } = await import("@/lib/digital-business-card/brand-paths");
    assert.equal(DIGITAL_CARD_BRAND_PATHS.whatsapp.color, "#25D366");
    assert.equal(DIGITAL_CARD_BRAND_PATHS.whatsappbusiness.color, "#128C7E");
    assert.match(DIGITAL_CARD_BRAND_PATHS.signal.paths[0], /^M12 2\.25a9\.75/);
    assert.match(DIGITAL_CARD_BRAND_PATHS.signal.paths[0], /M12 6\.72A5\.28/);
    assert.equal(DIGITAL_CARD_BRAND_PATHS.signal.evenodd, true);
    assert.equal(DIGITAL_CARD_BRAND_PATHS.signal.color, "#3B45FD");
    const { PAY_BRAND_IMAGES } = await import(
      "@/components/digital-business-card/digital-card-brand-mark"
    );
    const payMissing = DIGITAL_CARD_SOCIAL_NETWORKS.filter(
      (n) => n.group === "pay" && !hasOfficialBrandMark(n.key)
    );
    assert.deepEqual(payMissing.map((n) => n.key), []);
    const payWithoutImage = DIGITAL_CARD_SOCIAL_NETWORKS.filter(
      (n) => n.group === "pay" && !PAY_BRAND_IMAGES[n.key]
    );
    assert.deepEqual(payWithoutImage.map((n) => n.key), []);
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const brandMarkSource = readFileSync(
      join(process.cwd(), "src/components/digital-business-card/digital-card-brand-mark.tsx"),
      "utf8"
    );
    assert.match(brandMarkSource, /website: \{\s*color: "#007AFF"/);
    assert.match(brandMarkSource, /M16\.55 7\.2/);
    assert.doesNotMatch(brandMarkSource, /M12 21a9 9 0 1 0 0-18/);
    assert.match(brandMarkSource, /phone: \{\s*color: "#34C759"/);
    assert.match(brandMarkSource, /M2\.25 6\.75c0 8\.284/);
    assert.doesNotMatch(brandMarkSource, /M7\.2 2\.2h9\.6/);
    const reachGrid = readFileSync(
      join(process.cwd(), "src/components/digital-business-card/digital-card-reach-grid.tsx"),
      "utf8"
    );
    assert.doesNotMatch(reachGrid, /color=\{group\.brand === "phone" \? theme\.accent/);
    for (const network of DIGITAL_CARD_SOCIAL_NETWORKS.filter((n) => n.group === "pay")) {
      const svg = readFileSync(join(process.cwd(), "public", PAY_BRAND_IMAGES[network.key].replace(/^\//, "")), "utf8");
      assert.match(svg, /width="48"/, `${network.key} wallet mark must be a sized official tile`);
    }
    const momo = readFileSync(join(process.cwd(), "public", PAY_BRAND_IMAGES.momo.replace(/^\//, "")), "utf8");
    assert.match(momo, /<title>MTN<\/title>/);
    assert.match(momo, /#FFCB05/);
    assert.doesNotMatch(momo, /circle cx="23\.85"/);
    const paypal = readFileSync(join(process.cwd(), "public", PAY_BRAND_IMAGES.paypal.replace(/^\//, "")), "utf8");
    assert.match(paypal, /<title>PayPal<\/title>/);
    assert.match(paypal, /#003087/);
    assert.match(paypal, /#009CDE/);
    assert.doesNotMatch(paypal, /\brx="/);
  });

  it("keeps blank pay wallets off the guest page and off the studio desk until added", async () => {
    const {
      DIGITAL_CARD_PAY_KEYS,
      isPayWalletOpenOnDesk,
      isReachChannelOpenOnDesk,
      listDigitalCardReachItems,
      payWalletHasGuestEntry,
      toDigitalCardSocialForm,
    } = await import("@/lib/digital-business-card/socials");
    const { DEMO_CARD } = await import("@/lib/digital-business-card/demo-card");
    const form = toDigitalCardSocialForm(DEMO_CARD.socials);
    assert.deepEqual(form.momo, ["0240000000"]);
    assert.deepEqual(form.paypal, ["amaserwaa"]);
    assert.deepEqual(form.zelle, []);
    assert.deepEqual(form.cashapp, []);
    assert.equal(isPayWalletOpenOnDesk(form.momo, {}, "momo"), true);
    assert.equal(isPayWalletOpenOnDesk(form.zelle, {}, "zelle"), false);
    assert.deepEqual(form.whatsapp, [
      "233240000000",
      "https://chat.whatsapp.com/FolioMaisonHouse",
      "https://www.whatsapp.com/channel/0029AmaFolio",
    ]);
    assert.deepEqual(form.telegram, []);
    assert.equal(isReachChannelOpenOnDesk(form.whatsapp, {}, "whatsapp"), true);
    assert.equal(isReachChannelOpenOnDesk(form.telegram, {}, "telegram"), false);
    assert.equal(payWalletHasGuestEntry([""], {}, "momo"), false);
    assert.equal(payWalletHasGuestEntry(["0240000000"], {}, "momo"), true);
    assert.equal(payWalletHasGuestEntry([""], { "momo-0": "data:image/png;base64,qq" }, "momo"), true);
    const blank = listDigitalCardReachItems({
      socials: {
        momo: [""],
        zelle: ["", ""],
        cashapp: "",
        paypal: "amaserwaa",
      },
    });
    assert.equal(blank.some((item) => item.brand === "momo"), false);
    assert.equal(blank.some((item) => item.brand === "zelle"), false);
    assert.equal(blank.some((item) => item.brand === "cashapp"), false);
    assert.equal(blank.filter((item) => item.brand === "paypal").length, 1);
    const guestPay = listDigitalCardReachItems(DEMO_CARD).filter((item) =>
      DIGITAL_CARD_PAY_KEYS.includes(item.brand as (typeof DIGITAL_CARD_PAY_KEYS)[number])
    );
    assert.deepEqual([...new Set(guestPay.map((item) => item.brand))].sort(), ["momo", "paypal"]);
    assert.equal(DIGITAL_CARD_PAY_KEYS[0], "bank");
    assert.deepEqual(form.bank, []);
  });

  it("shows guests only uploaded payment channels grouped by family on Wallet card", async () => {
    const { groupDigitalCardPayItems, listDigitalCardPayItems } = await import(
      "@/lib/digital-business-card/socials"
    );
    const { DEMO_CARD } = await import("@/lib/digital-business-card/demo-card");
    const { serializeBankAccount } = await import("@/lib/digital-business-card/socials");
    const pay = listDigitalCardPayItems(DEMO_CARD);
    assert.deepEqual([...new Set(pay.map((item) => item.brand))].sort(), ["momo", "paypal"]);
    assert.equal(pay.some((item) => item.brand === "phone" || item.brand === "whatsapp"), false);
    const groups = groupDigitalCardPayItems(pay);
    assert.deepEqual(
      groups.map((group) => group.id),
      ["mobile-money", "send-a-link"]
    );
    assert.equal(groups.some((group) => group.id === "bank"), false);
    assert.equal(listDigitalCardPayItems({ socials: { momo: [""], zelle: ["", ""] } }).length, 0);
    const packed = serializeBankAccount({
      bankName: "GCB Bank",
      accountName: "Ama Serwaa",
      accountNumber: "1234567890",
      accountType: "current",
      notes: "",
    });
    const withBank = groupDigitalCardPayItems(
      listDigitalCardPayItems({
        socials: { momo: ["0240000000"], bank: [packed], instagram: "amaserwaa" },
      })
    );
    assert.deepEqual(
      withBank.map((group) => group.id),
      ["mobile-money", "bank"]
    );
    const locked = listDigitalCardPayItems({
      guestReach: [
        {
          id: "momo-0",
          brand: "momo",
          title: "MoMo",
          subtitle: "Needs a code",
          href: "",
          surface: "stack",
          locked: true,
        },
        {
          id: "phone-0",
          brand: "phone",
          title: "Call",
          subtitle: null,
          href: "tel:+233240000000",
          surface: "stack",
        },
      ],
    });
    assert.equal(locked.length, 1);
    assert.equal(locked[0]?.brand, "momo");
    assert.equal(locked[0]?.locked, true);
    const view = readFileSync(
      join(process.cwd(), "src/components/digital-business-card/digital-card-wallet-view.tsx"),
      "utf8"
    );
    assert.match(view, /listDigitalCardPayItems/);
    assert.match(view, /groupDigitalCardPayItems/);
    assert.match(view, /celeyou\.channels/);
    assert.match(view, /celeyou\.share_pay_page/);
    assert.match(view, /celecardCtaOnPaper/);
    assert.doesNotMatch(view, /background: theme.accent, color: "#fffef8"/);
    assert.match(view, /celeyou\.save_qr/);
    assert.match(view, /celeyou\.copy_number/);
    assert.match(view, /celeyou\.copy_all/);
    assert.match(view, /PayChannelCard/);
    assert.match(view, /digitalCardWalletPath/);
    assert.match(view, /receive QR/);
    assert.match(view, /"scan", "mobile-money"/);
    assert.doesNotMatch(view, /DigitalCardReachGrid/);
    assert.doesNotMatch(view, /walletPassGuidance/);
    assert.doesNotMatch(view, /Hold up this card/);
    assert.doesNotMatch(view, /Save card image/);
    assert.doesNotMatch(view, /DigitalCardFace/);
  });

  it("places MTN MoMo and PayPal in the same wallet families as the other pay brands", async () => {
    const { DIGITAL_CARD_PAY_FAMILIES, DIGITAL_CARD_PAY_KEYS, payFamilyIdForKey } = await import(
      "@/lib/digital-business-card/socials"
    );
    const assigned = DIGITAL_CARD_PAY_FAMILIES.flatMap((family) => [...family.keys]).sort();
    assert.deepEqual(assigned, [...DIGITAL_CARD_PAY_KEYS].sort());
    assert.equal(payFamilyIdForKey("momo"), "mobile-money");
    assert.equal(payFamilyIdForKey("telecelcash"), "mobile-money");
    assert.equal(payFamilyIdForKey("airteltigo"), "mobile-money");
    assert.equal(payFamilyIdForKey("paypal"), "send-a-link");
    assert.equal(payFamilyIdForKey("cashapp"), "send-a-link");
    assert.equal(payFamilyIdForKey("zelle"), "send-a-link");
    assert.equal(payFamilyIdForKey("bank"), "bank");
  });

  it("lets cardholders publish bank details for guests to copy", async () => {
    const {
      DIGITAL_CARD_PAY_KEYS,
      formatBankAccountCopy,
      isBankAccountComplete,
      isCompleteReachValue,
      isLiveReachItem,
      listDigitalCardReachItems,
      parseBankAccount,
      payWalletHasGuestEntry,
      reviewReachInput,
      serializeBankAccount,
    } = await import("@/lib/digital-business-card/socials");
    const packed = serializeBankAccount({
      bankName: "GCB Bank",
      accountName: "Ama Serwaa",
      accountNumber: "1234 5678 90",
      accountType: "current",
      notes: "Ridge branch",
    });
    assert.match(packed, /^bankv1:/);
    const parsed = parseBankAccount(packed);
    assert.equal(parsed.bankName, "GCB Bank");
    assert.equal(parsed.accountName, "Ama Serwaa");
    assert.equal(parsed.accountNumber, "1234 5678 90");
    assert.equal(parsed.accountType, "current");
    assert.equal(parsed.notes, "Ridge branch");
    assert.equal(isBankAccountComplete(parsed), true);
    assert.equal(isCompleteReachValue("bank", packed), true);
    assert.equal(payWalletHasGuestEntry([packed], {}, "bank"), true);
    assert.equal(
      payWalletHasGuestEntry(
        [
          serializeBankAccount({
            bankName: "GCB Bank",
            accountName: "",
            accountNumber: "",
            accountType: "",
            notes: "",
          }),
        ],
        {},
        "bank"
      ),
      false
    );
    assert.equal(reviewReachInput("bank", "").status, "empty");
    const unfinished = reviewReachInput(
      "bank",
      serializeBankAccount({
        bankName: "GCB Bank",
        accountName: "Ama Serwaa",
        accountNumber: "12",
        accountType: "",
        notes: "",
      })
    );
    assert.equal(unfinished.status, "review");
    assert.match(unfinished.message ?? "", /account number/i);
    assert.equal(reviewReachInput("bank", packed).status, "ok");
    const aliases = parseBankAccount(
      JSON.stringify({ bank: "Ecobank", name: "Folio Maison", number: "99887766", type: "business", other: "SWIFT ECOCGHAC" })
    );
    assert.equal(aliases.bankName, "Ecobank");
    assert.equal(aliases.accountName, "Folio Maison");
    assert.equal(aliases.accountNumber, "99887766");
    assert.equal(aliases.accountType, "business");
    assert.equal(aliases.notes, "SWIFT ECOCGHAC");
    const live = listDigitalCardReachItems({
      socials: {
        bank: [packed],
        momo: ["0240000000"],
      },
    });
    const bank = live.find((item) => item.brand === "bank");
    assert.equal(Boolean(bank), true);
    assert.equal(bank?.title, "GCB Bank");
    assert.match(bank?.subtitle ?? "", /Ama Serwaa/);
    assert.equal(bank?.href, "");
    assert.equal(bank?.copyValue, packed);
    assert.equal(isLiveReachItem(bank!), true);
    assert.equal(DIGITAL_CARD_PAY_KEYS.includes("bank" as (typeof DIGITAL_CARD_PAY_KEYS)[number]), true);
    assert.match(formatBankAccountCopy(parsed), /Account number 1234 5678 90/);
    const grid = readFileSync(
      join(process.cwd(), "src/components/digital-business-card/digital-card-reach-grid.tsx"),
      "utf8"
    );
    const wallet = readFileSync(
      join(process.cwd(), "src/components/digital-business-card/digital-card-wallet-view.tsx"),
      "utf8"
    );
    const copyCss = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
    assert.match(grid, /celecard-copy-row/);
    assert.match(grid, /celeyou\.copy_all/);
    assert.match(grid, /celeyou\.copy_named/);
    assert.match(grid, /writeClipboard/);
    assert.match(grid, /CELECARD_REACH_INK/);
    assert.match(grid, /celeyou\.copied_all/);
    assert.match(grid, /background: CELECARD_REACH_INK, color: "#fffef8"/);
    assert.match(wallet, /celecard-copy-row/);
    assert.match(wallet, /celeyou\.copy_all/);
    assert.match(wallet, /CopyFieldButton/);
    assert.match(copyCss, /\.celecard-copy-hit/);
    const hidden = listDigitalCardReachItems({
      socials: {
        bank: [
          serializeBankAccount({
            bankName: "GCB Bank",
            accountName: "Ama Serwaa",
            accountNumber: "12",
            accountType: "",
            notes: "",
          }),
        ],
      },
    });
    assert.equal(hidden.some((item) => item.brand === "bank"), false);
  });

  it("opens a pasted share link on the exact page, not only the username", async () => {
    const {
      detectChatLinkKind,
      digitalCardSocialHref,
      extractReachHandle,
      isCompleteReachValue,
      isExactPageShare,
      nativeOpenFor,
    } = await import("@/lib/digital-business-card/socials");
    assert.equal(
      digitalCardSocialHref("instagram", "instagram.com/amaserwaa"),
      "https://www.instagram.com/amaserwaa"
    );
    assert.equal(
      digitalCardSocialHref("instagram", "https://www.instagram.com/p/AbC123xyz/?igsh=tracking"),
      "https://www.instagram.com/p/AbC123xyz"
    );
    assert.equal(
      digitalCardSocialHref("instagram", "https://www.instagram.com/reel/ReelCode/?igshid=abc"),
      "https://www.instagram.com/reel/ReelCode"
    );
    assert.equal(
      digitalCardSocialHref("tiktok", "https://www.tiktok.com/@ama/video/1234567890?_r=1"),
      "https://www.tiktok.com/@ama/video/1234567890"
    );
    assert.equal(digitalCardSocialHref("youtube", "youtu.be/dQw4w9wgGcQ"), "https://www.youtube.com/watch?v=dQw4w9wgGcQ");
    assert.equal(digitalCardSocialHref("x", "https://twitter.com/ama/status/99"), "https://x.com/ama/status/99");
    assert.equal(digitalCardSocialHref("whatsapp", "wa.me/233240000000?text=Hello"), "https://wa.me/233240000000?text=Hello");
    assert.equal(isCompleteReachValue("instagram", "https://www.instagram.com/reel/ReelCode"), true);
    assert.equal(isCompleteReachValue("instagram", "instagram.com/amaserwaa"), true);
    assert.equal(isExactPageShare("instagram", "https://www.instagram.com/p/AbC123xyz"), true);
    const reel = "https://www.instagram.com/reel/ReelCode";
    const nativeReel = nativeOpenFor("instagram", reel, digitalCardSocialHref("instagram", reel));
    assert.equal(nativeReel.appHref, reel);
    assert.match(nativeReel.androidIntent ?? "", /instagram\.com\/reel\/ReelCode/);
    const nativeProfile = nativeOpenFor(
      "instagram",
      "amaserwaa",
      digitalCardSocialHref("instagram", "amaserwaa")
    );
    assert.match(nativeProfile.appHref ?? "", /instagram:\/\/user\?username=amaserwaa/);
    assert.equal(extractReachHandle("instagram", "instagram.com/amaserwaa"), "amaserwaa");
    assert.equal(extractReachHandle("instagram", "https://www.instagram.com/p/AbC123xyz"), "AbC123xyz");
    assert.equal(detectChatLinkKind("whatsapp", "233240000000"), "number");
    assert.equal(detectChatLinkKind("whatsapp", "https://chat.whatsapp.com/FolioMaisonHouse"), "group");
    assert.equal(detectChatLinkKind("whatsapp", "https://www.whatsapp.com/channel/0029AmaFolio"), "channel");
    assert.equal(detectChatLinkKind("whatsapp", "folio.house"), "username");
    assert.equal(digitalCardSocialHref("whatsapp", "chat.whatsapp.com/FolioMaisonHouse"), "https://chat.whatsapp.com/FolioMaisonHouse");
    assert.equal(isCompleteReachValue("whatsapp", "folio.house"), true);
    assert.equal(isCompleteReachValue("whatsapp", "https://chat.whatsapp.com/FolioMaisonHouse"), true);
    const nativeGroup = nativeOpenFor(
      "whatsapp",
      "https://chat.whatsapp.com/FolioMaisonHouse",
      digitalCardSocialHref("whatsapp", "https://chat.whatsapp.com/FolioMaisonHouse")
    );
    assert.equal(nativeGroup.appHref, "https://chat.whatsapp.com/FolioMaisonHouse");
  });

  it("asks the owner to check a wrong or unfinished social or payment detail", async () => {
    const { looksLikeShareUrl, reviewReachInput, websiteHref } = await import(
      "@/lib/digital-business-card/socials"
    );
    assert.equal(reviewReachInput("instagram", "").status, "empty");
    assert.equal(reviewReachInput("instagram", "@").status, "draft");
    assert.equal(reviewReachInput("instagram", "amaserwaa").status, "ok");
    assert.equal(reviewReachInput("instagram", "https://www.instagram.com/amaserwaa").status, "ok");
    const wrong = reviewReachInput("instagram", "https://www.tiktok.com/@amaserwaa");
    assert.equal(wrong.status, "review");
    assert.match(wrong.message ?? "", /Instagram/i);
    assert.equal((wrong.message ?? "").includes("tiktok.com"), false);
    assert.equal((wrong.message ?? "").includes("canonicalize"), false);
    const pay = reviewReachInput("paypal", "https://www.instagram.com/amaserwaa");
    assert.equal(pay.status, "review");
    assert.match(pay.message ?? "", /PayPal/i);
    const unfinished = reviewReachInput("instagram", "https://www.instagram.com");
    assert.equal(unfinished.status, "review");
    assert.match(unfinished.message ?? "", /Check/i);
    assert.equal(reviewReachInput("momo", "", { hasQr: true }).status, "ok");
    assert.equal(looksLikeShareUrl("www.celeventic.com"), true);
    assert.equal(looksLikeShareUrl("folio.house"), false);
    assert.equal(reviewReachInput("website", "www.celeventic.com").status, "ok");
    assert.equal(reviewReachInput("website", "http://folio.demo").status, "ok");
    assert.equal(reviewReachInput("website", "https://folio.demo").status, "ok");
    assert.equal(reviewReachInput("website", "www.").status, "draft");
    assert.equal(reviewReachInput("website", "http://").status, "draft");
    assert.equal(websiteHref("www.celeventic.com"), "https://www.celeventic.com/");
    assert.equal(websiteHref("http://folio.demo"), "http://folio.demo/");
    assert.match(websiteHref("https://folio.demo/work"), /^https:\/\/folio\.demo\/work$/);
  });
});

describe("celecard smart QR", () => {
  it("encodes the absolute share URL in camera-safe guide mode", () => {
    const share = "http://127.0.0.1:3000/c/demo-ama-serwaa";
    const src = digitalCardQrImageSrc(share);
    assert.match(src, /mode=guide/);
    assert.match(src, /data=http%3A%2F%2F127.0.0.1%3A3000%2Fc%2Fdemo-ama-serwaa/);
  });

  it("gives template previews a dummy Smart QR", async () => {
    const { demoCardPreviewExplorePath, demoCardPreviewQrSrc } = await import(
      "@/lib/digital-business-card/demo-card"
    );
    const src = demoCardPreviewQrSrc("gold-folio");
    assert.match(src, /mode=guide/);
    assert.match(src, /digital-cards/);
    assert.match(src, /smartcard-themes/);
    assert.match(src, /look%3Dgold-folio/);
    assert.equal(src.includes("demo-ama-serwaa"), false);
    assert.match(src, /\/api\/qr\/image\?/);
    assert.equal(demoCardPreviewExplorePath(), "/digital-cards#smartcard-themes");
    const { celeYouGuestLandingPath, CELEYOU_PUBLIC_LANDING_PATH } = await import(
      "@/lib/digital-business-card/product"
    );
    assert.equal(CELEYOU_PUBLIC_LANDING_PATH, "/digital-cards");
    assert.equal(celeYouGuestLandingPath(), "/digital-cards");
  });

  it("makes every theme tile clickable, same destination as Use this Card", () => {
    const source = readFileSync(
      join(process.cwd(), "src/components/digital-business-card/public-digital-cards-showcase.tsx"),
      "utf8"
    );
    assert.match(source, /href=\{themeHref\(theme\.id\)\}/);
    assert.match(source, /aria-label=\{`Use \$\{theme\.name\} card`\}/);
    assert.match(source, /Use this Card/);
    assert.match(source, /absolute inset-0 z-10/);
    assert.match(source, /pointer-events-none relative px-4 pb-5 pt-5/);
  });

  it("keeps name, title, company, and QR on portrait-led and iconic plates", () => {
    const source = readFileSync(join(process.cwd(), "src/components/digital-business-card/digital-card-face.tsx"), "utf8");
    assert.match(source, /\{portrait \? \(/);
    assert.match(source, /\{identity\}\s*\{qr\}/);
    assert.doesNotMatch(source, /portrait \? null : composition/);
    for (const theme of DIGITAL_CARD_THEMES) {
      assert.equal(
        ["classic", "portrait-led", "type-first", "media-first", "grid", "iconic"].includes(theme.composition),
        true,
        theme.id
      );
    }
  });

  it("applies studio, vault, share, and NFC copy to every template, not only Elegant Frost", () => {
    const studio = readFileSync(
      join(process.cwd(), "src/components/digital-business-card/digital-card-studio-client.tsx"),
      "utf8"
    );
    const desk = readFileSync(
      join(process.cwd(), "src/components/digital-business-card/digital-card-share-desk.tsx"),
      "utf8"
    );
    const vault = readFileSync(
      join(process.cwd(), "src/components/digital-business-card/digital-card-design-vault.tsx"),
      "utf8"
    );
    const publicView = readFileSync(
      join(process.cwd(), "src/components/digital-business-card/digital-card-public-view.tsx"),
      "utf8"
    );
    assert.match(studio, /DigitalCardAnalyticsPanel/);
    assert.match(studio, /id="studio-activation"/);
    assert.match(studio, /DigitalCardDesignVault/);
    assert.match(studio, /DigitalCardShareDesk/);
    assert.match(vault, /act\("archive"/);
    assert.match(desk, /A programmed NFC card opens this CeleYou/);
    assert.doesNotMatch(studio, /themeId === ["']elegant-frost["']/);
    assert.doesNotMatch(desk, /elegant-frost/);
    assert.doesNotMatch(vault, /elegant-frost/);
    assert.doesNotMatch(publicView, /themeId === ["']elegant-frost["']/);
    assert.equal(DIGITAL_CARD_THEMES.length > 1, true);
    for (const theme of DIGITAL_CARD_THEMES) {
      assert.equal(typeof theme.id, "string");
      assert.notEqual(theme.id, "");
    }
  });
});

describe("celecard dummy portrait", () => {
  it("publishes Ama's photo instead of initials", async () => {
    const { DEMO_CARD, DEMO_CARD_AVATAR_PATH } = await import("@/lib/digital-business-card/demo-card");
    assert.equal(DEMO_CARD.avatarUrl, DEMO_CARD_AVATAR_PATH);
    assert.match(DEMO_CARD_AVATAR_PATH, /^\/digital-cards\/demo\/ama-serwaa\.jpg$/);
  });

  it("never offers Connect Back on the dummy plate", async () => {
    const { DEMO_CARD } = await import("@/lib/digital-business-card/demo-card");
    assert.equal(DEMO_CARD.connectBackEnabled, false);
    assert.equal(DEMO_CARD.isDemo, true);
    const view = readFileSync(
      join(process.cwd(), "src/components/digital-business-card/digital-card-public-view.tsx"),
      "utf8"
    );
    assert.match(view, /connectBackEnabled && !card\.isDemo/);
    assert.doesNotMatch(view, /Demo tap/i);
    assert.doesNotMatch(view, /Same page a link, QR, or NFC opens/i);
  });
});

describe("dummy live privacy", () => {
  it("keeps non-admin CeleYou marketing HTML free of the dummy live tap CTA", () => {
    const page = readFileSync(join(process.cwd(), "src/app/digital-cards/page.tsx"), "utf8");
    const showcase = readFileSync(
      join(process.cwd(), "src/components/digital-business-card/public-digital-cards-showcase.tsx"),
      "utf8"
    );
    const templates = readFileSync(join(process.cwd(), "src/app/templates/page.tsx"), "utf8");
    const cta = readFileSync(
      join(process.cwd(), "src/components/digital-business-card/dummy-live-tap-cta.tsx"),
      "utf8"
    );
    assert.doesNotMatch(showcase, /See a live dummy tap/);
    assert.doesNotMatch(showcase, /\/digital-cards\/demo(?!\/)/);
    assert.doesNotMatch(showcase, /demoCardHubPath/);
    assert.doesNotMatch(page, /See a live dummy tap/);
    assert.doesNotMatch(page, /href=\/digital-cards\/demo/);
    assert.match(page, /DummyLiveTapCta/);
    assert.match(page, /dummyLiveCta/);
    assert.match(templates, /DummyLiveTapCta/);
    assert.match(cta, /See a live dummy tap/);
    assert.match(cta, /viewerMayOpenDummyLive/);
    assert.match(cta, /demoCardHubPath/);
  });

  it("server-redirects dummy live routes for anyone who is not a platform admin", () => {
    const files = [
      "src/app/digital-cards/demo/page.tsx",
      "src/app/digital-cards/demo/studio/page.tsx",
      "src/app/card/[slug]/page.tsx",
      "src/app/card/[slug]/present/page.tsx",
      "src/app/c/[token]/page.tsx",
      "src/app/n/[token]/page.tsx",
    ];
    for (const file of files) {
      const source = readFileSync(join(process.cwd(), file), "utf8");
      assert.match(source, /viewerMayOpenDummyLive/, file);
      assert.match(source, /CELECARD_DUMMY_LIVE_FALLBACK/, file);
    }
    const vcf = readFileSync(join(process.cwd(), "src/app/card/[slug]/contact.vcf/route.ts"), "utf8");
    assert.match(vcf, /viewerMayOpenDummyLive/);
    const json = readFileSync(
      join(process.cwd(), "src/app/api/digital-business-cards/public/[slug]/route.ts"),
      "utf8"
    );
    assert.match(json, /dummyLiveNotFoundJson/);
  });
});

describe("celecard company logo", () => {
  it("hides the company mark when no logo was uploaded", async () => {
    const { hasCeleCardCompanyLogo } = await import(
      "@/components/digital-business-card/demo-company-mark"
    );
    assert.equal(hasCeleCardCompanyLogo(null), false);
    assert.equal(hasCeleCardCompanyLogo(""), false);
    assert.equal(hasCeleCardCompanyLogo("   "), false);
    assert.equal(hasCeleCardCompanyLogo("/uploads/u/logo.webp"), true);
  });

  it("puts a company mark under the house name on every template", async () => {
    const { celeCardShowsCompanyMark } = await import(
      "@/components/digital-business-card/demo-company-mark"
    );
    assert.equal(celeCardShowsCompanyMark(null), false);
    assert.equal(celeCardShowsCompanyMark("Northline"), true);
    for (const theme of DIGITAL_CARD_THEMES) {
      const demo = SMARTCARD_THEME_DEMOS[theme.id];
      assert.equal(Boolean(demo.company.trim()), true);
      assert.equal(celeCardShowsCompanyMark(demo.company), true);
      assert.equal(demo.companyLogo, true);
    }
  });

  it("fills the house seal so initials read on every plate size", () => {
    const mark = readFileSync(
      join(process.cwd(), "src/components/digital-business-card/demo-company-mark.tsx"),
      "utf8"
    );
    assert.match(mark, /fontSize="16\.5"/);
    assert.match(mark, /r="13\.6"/);
    assert.match(mark, /data-house-seal="fit"/);
    const bitmap = readFileSync(
      join(process.cwd(), "src/lib/digital-business-card/plate-bitmap.tsx"),
      "utf8"
    );
    assert.match(bitmap, /Math\.round\(44 \* s\)/);
  });

  it("keeps a company mark url beside the house name and rejects unsafe urls", async () => {
    const { normalizeSocials, persistCompanyLogoUrl } = await import("@/lib/digital-business-card/socials");
    const socials = normalizeSocials({
      companyLogoUrl: "/uploads/u/logo.webp",
      portraitFrame: "circle",
    });
    assert.equal(socials.companyLogoUrl, "/uploads/u/logo.webp");
    assert.equal(socials.portraitFrame, "circle");
    assert.equal(persistCompanyLogoUrl("blob:http://localhost/x"), undefined);
    assert.equal(persistCompanyLogoUrl("javascript:alert(1)"), undefined);
    assert.equal(persistCompanyLogoUrl("/uploads/../secret"), undefined);
    assert.equal(persistCompanyLogoUrl("https://cdn.example.com/mark.png"), "https://cdn.example.com/mark.png");
  });
});

describe("celecard multiple reach", () => {
  it("keeps several mails, numbers, sites, and socials", async () => {
    const { DEMO_CARD } = await import("@/lib/digital-business-card/demo-card");
    const {
      collectCardEmails,
      collectCardPhones,
      collectCardWebsites,
      listDigitalCardReachItems,
      normalizeSocials,
    } = await import("@/lib/digital-business-card/socials");
    const socials = normalizeSocials({
      emails: ["one@house.demo", "two@house.demo"],
      phones: ["+233 24 000 0000", "+233 30 000 0000"],
      instagram: ["ama", "folio"],
      website: ["https://folio.demo", "https://ama.folio"],
    });
    assert.deepEqual(collectCardEmails({ email: "one@house.demo", socials }), [
      "one@house.demo",
      "two@house.demo",
    ]);
    assert.equal(collectCardPhones({ phone: null, socials }).length, 2);
    assert.equal(collectCardWebsites({ website: null, socials }).length, 2);
    const items = listDigitalCardReachItems(DEMO_CARD);
    assert.equal(items.filter((item) => item.brand === "email").length, 2);
    assert.equal(items.filter((item) => item.brand === "phone").length, 2);
    assert.equal(items.filter((item) => item.brand === "website").length, 2);
    assert.equal(items.filter((item) => item.brand === "instagram").length, 2);
    assert.equal(items.filter((item) => item.brand === "whatsapp").length, 3);
    assert.ok(items.some((item) => item.brand === "tiktok"));
    assert.equal(items.filter((item) => item.brand === "wechat").length, 0);
    assert.equal(items.every((item) => item.surface === "stack" || item.surface === "dock"), true);
    assert.ok(items.find((item) => item.brand === "email")?.surface === "stack");
    assert.ok(items.find((item) => item.brand === "instagram")?.surface === "dock");
    assert.equal(items.filter((item) => item.brand === "momo").length, 1);
    assert.equal(items.filter((item) => item.brand === "paypal").length, 1);
    assert.equal(items.find((item) => item.brand === "momo")?.href, "");
    assert.equal(items.find((item) => item.brand === "momo")?.copyValue, "0240000000");
    assert.equal(items.find((item) => item.brand === "paypal")?.href, "https://www.paypal.me/amaserwaa");
    assert.equal(items.some((item) => item.brand === "zelle"), false);
    const payBrands = [...new Set(items.filter((item) => ["momo", "telecelcash", "airteltigo", "mpesa", "paypal", "cashapp", "zelle", "venmo", "alipay", "wechatpay", "wise", "revolut", "paystack", "flutterwave", "gcash", "chipper"].includes(item.brand)).map((item) => item.brand))].sort();
    assert.deepEqual(payBrands, ["momo", "paypal"]);
    const { groupReachByBrand, reachGroupCopy } = await import("@/lib/digital-business-card/socials");
    const groups = groupReachByBrand(items);
    const mail = groups.find((group) => group.brand === "email");
    const instagram = groups.find((group) => group.brand === "instagram");
    const whatsapp = groups.find((group) => group.brand === "whatsapp");
    assert.equal(mail?.items.length, 2);
    assert.equal(instagram?.items.length, 2);
    assert.equal(whatsapp?.items.length, 3);
    assert.equal(reachGroupCopy(whatsapp!).subtitle, "1 chat, 1 group, 1 channel");
    assert.equal(
      items.find((item) => item.brand === "whatsapp" && item.linkKind === "group")?.href,
      "https://chat.whatsapp.com/FolioMaisonHouse"
    );
    assert.equal(
      items.find((item) => item.brand === "whatsapp" && item.linkKind === "channel")?.href,
      "https://www.whatsapp.com/channel/0029AmaFolio"
    );
    assert.equal(reachGroupCopy(mail!).title, "Mail");
    assert.equal(reachGroupCopy(mail!).subtitle, "2 addresses");
    assert.equal(reachGroupCopy(instagram!).title, "Instagram");
    assert.equal(groups.filter((group) => group.brand === "email").length, 1);
    const dockBrands = groups.filter((group) => group.surface === "dock").map((group) => group.brand);
    assert.equal(new Set(dockBrands).size, dockBrands.length);
    assert.equal(groups.filter((group) => group.brand === "instagram").length, 1);
    const { reachAccountPreview } = await import("@/lib/digital-business-card/socials");
    const firstIg = reachAccountPreview(instagram!.items[0]);
    const secondIg = reachAccountPreview(instagram!.items[1]);
    assert.equal(firstIg.title, "@amaserwaa");
    assert.equal(secondIg.title, "@foliomaison");
    assert.match(firstIg.hint ?? "", /instagram\.com\/amaserwaa/i);
    assert.match(secondIg.hint ?? "", /instagram\.com\/foliomaison/i);
    assert.notEqual(firstIg.monogram, secondIg.monogram);
  });

  it("keeps personal and business tags on mail and numbers", async () => {
    const { DEMO_CARD } = await import("@/lib/digital-business-card/demo-card");
    const { buildVCard } = await import("@/lib/digital-business-card/vcard");
    const {
      collectTaggedEmails,
      collectTaggedPhones,
      listDigitalCardReachItems,
      normalizeSocials,
    } = await import("@/lib/digital-business-card/socials");
    const tagged = normalizeSocials({
      emails: ["work@house.demo", "me@house.demo"],
      emailTags: ["business", "personal"],
      phones: ["+233 24 000 0000", "+233 30 000 0000"],
      phoneTags: ["personal", "business"],
    });
    assert.deepEqual(
      collectTaggedEmails({ email: "work@house.demo", socials: tagged }).map((item) => item.tag),
      ["business", "personal"]
    );
    assert.deepEqual(
      collectTaggedPhones({ phone: "+233 24 000 0000", socials: tagged }).map((item) => item.tag),
      ["personal", "business"]
    );
    const demoMail = listDigitalCardReachItems(DEMO_CARD).filter((item) => item.brand === "email");
    const demoCall = listDigitalCardReachItems(DEMO_CARD).filter((item) => item.brand === "phone");
    assert.equal(demoMail[0]?.subtitle, "Business");
    assert.equal(demoMail[1]?.subtitle, "Personal");
    assert.equal(demoCall[0]?.subtitle, "Personal");
    assert.equal(demoCall[1]?.subtitle, "Business");
    const { phoneBrandMarkId, phoneGroupBrandMarkId, reachBrandMarkId } = await import(
      "@/lib/digital-business-card/socials"
    );
    const { hasOfficialBrandMark } = await import(
      "@/components/digital-business-card/digital-card-brand-mark"
    );
    assert.equal(phoneBrandMarkId("personal"), "phone-personal");
    assert.equal(phoneBrandMarkId("business"), "phone-business");
    assert.equal(reachBrandMarkId(demoCall[0]!), "phone-personal");
    assert.equal(reachBrandMarkId(demoCall[1]!), "phone-business");
    assert.equal(phoneGroupBrandMarkId(demoCall), "phone");
    assert.equal(phoneGroupBrandMarkId([demoCall[0]!]), "phone-personal");
    assert.equal(hasOfficialBrandMark("phone-personal"), true);
    assert.equal(hasOfficialBrandMark("phone-business"), true);
    const vcf = buildVCard(DEMO_CARD);
    assert.match(vcf, /EMAIL;TYPE=INTERNET;TYPE=WORK:ama@foliomaison\.demo/);
    assert.match(vcf, /EMAIL;TYPE=INTERNET;TYPE=HOME:studio@foliomaison\.demo/);
    assert.match(vcf, /TEL;TYPE=CELL;TYPE=VOICE;TYPE=PREF:\+233240000000/);
    assert.match(vcf, /TEL;TYPE=WORK;TYPE=VOICE:\+233302114400/);
    assert.match(vcf, /IMPP;X-SERVICE-TYPE=WhatsApp:x-apple:233240000000/);
    assert.match(vcf, /X-ABLabel:WhatsApp/);
    assert.match(vcf, /X-SOCIALPROFILE;TYPE=instagram;x-user=amaserwaa:/);
    assert.match(vcf, /X-ABLabel:Instagram/);
    assert.match(vcf, /X-SOCIALPROFILE;TYPE=linkedin;x-user=ama-serwaa:/);
    assert.match(vcf, /X-ABLabel:LinkedIn/);
    assert.match(vcf, /NOTE;CHARSET=UTF-8:[\s\S]*MTN MoMo: 0240000000/);
  });

  it("drops empty or unfinished tap URLs", async () => {
    const { listDigitalCardReachItems, isLiveReachHref } = await import(
      "@/lib/digital-business-card/socials"
    );
    assert.equal(isLiveReachHref("mailto:"), false);
    assert.equal(isLiveReachHref("https://wa.me/"), false);
    assert.equal(isLiveReachHref("https://www.instagram.com/"), false);
    assert.equal(isLiveReachHref("https://www.tiktok.com/@"), false);
    const items = listDigitalCardReachItems({
      email: "live@folio.demo",
      phone: "12",
      website: "",
      socials: { instagram: ["", "@"], tiktok: "https://www.tiktok.com/", whatsapp: "233240000000" },
    });
    assert.equal(items.some((item) => item.brand === "instagram"), false);
    assert.equal(items.some((item) => item.brand === "tiktok"), false);
    assert.equal(items.some((item) => item.brand === "website"), false);
    assert.equal(items.some((item) => item.brand === "phone"), false);
    assert.equal(items.some((item) => item.brand === "whatsapp"), true);
    assert.equal(items.some((item) => item.brand === "email"), true);
  });

  it("opens installed apps from the filled profile, not a blank web page", async () => {
    const { listDigitalCardReachItems, nativeOpenFor } = await import(
      "@/lib/digital-business-card/socials"
    );
    const { DEMO_CARD } = await import("@/lib/digital-business-card/demo-card");
    const instagram = listDigitalCardReachItems(DEMO_CARD).find((item) => item.brand === "instagram");
    assert.equal(instagram?.href, "https://www.instagram.com/amaserwaa");
    assert.match(instagram?.appHref ?? "", /instagram:\/\/user\?username=amaserwaa/);
    assert.match(instagram?.androidIntent ?? "", /com\.instagram\.android/);
    assert.match(instagram?.androidIntent ?? "", /S\.browser_fallback_url=/);
    const whatsapp = listDigitalCardReachItems(DEMO_CARD).find((item) => item.brand === "whatsapp");
    assert.match(whatsapp?.androidIntent ?? "", /com\.whatsapp/);
    assert.doesNotMatch(whatsapp?.androidIntent ?? "", /com\.whatsapp\.w4b/);
    const business = nativeOpenFor("whatsappbusiness", "233240000000", "https://wa.me/233240000000");
    assert.equal(business.appHref, "whatsapp://send?phone=233240000000");
    assert.match(business.androidIntent ?? "", /com\.whatsapp\.w4b/);
    assert.match(business.androidIntent ?? "", /scheme=whatsapp/);
    const linkedin = nativeOpenFor("linkedin", "ama-serwaa", "https://www.linkedin.com/in/ama-serwaa");
    assert.match(linkedin.appHref ?? "", /linkedin:\/\/in\/ama-serwaa/);
    const tiktok = nativeOpenFor("tiktok", "amaserwaa", "https://www.tiktok.com/@amaserwaa");
    assert.match(tiktok.appHref ?? "", /tiktok:\/\/user\?unique_id=amaserwaa/);
    const snapchat = nativeOpenFor("snapchat", "amaserwaa", "https://www.snapchat.com/add/amaserwaa");
    assert.match(snapchat.appHref ?? "", /snapchat:\/\/add\/amaserwaa/);
  });

  it("sends a guest phone into the installed app, then the web page if it is missing", async () => {
    const { listDigitalCardReachItems, nativeOpenFor, reachLaunchPlan } = await import(
      "@/lib/digital-business-card/socials"
    );
    const { DEMO_CARD } = await import("@/lib/digital-business-card/demo-card");
    const items = listDigitalCardReachItems(DEMO_CARD);
    const instagram = items.find((item) => item.brand === "instagram");
    assert.ok(instagram);
    assert.equal(reachLaunchPlan(instagram!, { android: true, mobile: true }).mode, "intent");
    assert.match(reachLaunchPlan(instagram!, { android: true, mobile: true }).native ?? "", /com\.instagram\.android/);
    const ios = reachLaunchPlan(instagram!, { android: false, mobile: true });
    assert.equal(ios.mode, "native-then-web");
    assert.match(ios.native ?? "", /instagram:\/\/user\?username=amaserwaa/);
    assert.equal(ios.web, "https://www.instagram.com/amaserwaa");
    assert.equal(reachLaunchPlan(instagram!, { android: false, mobile: false }).mode, "web");
    const tiktok = items.find((item) => item.brand === "tiktok");
    assert.ok(tiktok);
    const iosTiktok = reachLaunchPlan(tiktok!, { android: false, mobile: true });
    assert.equal(iosTiktok.mode, "native-then-web");
    assert.match(iosTiktok.native ?? "", /^tiktok:\/\//);
    const snapchat = nativeOpenFor("snapchat", "amaserwaa", "https://www.snapchat.com/add/amaserwaa");
    assert.equal(
      reachLaunchPlan(
        { href: "https://www.snapchat.com/add/amaserwaa", appHref: snapchat.appHref, androidIntent: snapchat.androidIntent, brand: "snapchat" },
        { android: false, mobile: true }
      ).mode,
      "native-then-web"
    );
    const phone = items.find((item) => item.brand === "phone");
    if (phone) {
      assert.equal(reachLaunchPlan(phone, { android: true, mobile: true }).mode, "web");
    }
    const site = items.find((item) => item.brand === "website");
    if (site) {
      assert.equal(reachLaunchPlan(site, { android: true, mobile: true }).mode, "web");
    }
  });

  it("keeps a QR-only wallet on the guest page and hides blank pay fields", async () => {
    const { listDigitalCardReachItems, DIGITAL_CARD_PAY_KEYS } = await import(
      "@/lib/digital-business-card/socials"
    );
    assert.ok(DIGITAL_CARD_PAY_KEYS.includes("momo"));
    assert.ok(DIGITAL_CARD_PAY_KEYS.includes("wechatpay"));
    const items = listDigitalCardReachItems({
      email: null,
      phone: null,
      website: null,
      socials: {
        wechatpay: "",
        payQr: { "wechatpay-0": "/digital-cards/pay/demo-wechat.png" },
        alipay: "",
      },
    });
    const wechat = items.find((item) => item.brand === "wechatpay");
    assert.equal(wechat?.qrUrl, "/digital-cards/pay/demo-wechat.png");
    assert.equal(wechat?.subtitle, "Scan to pay");
    assert.equal(items.some((item) => item.brand === "alipay"), false);
  });

  it("lets QR-share apps keep an add-friend scan and open the installed app", async () => {
    const {
      compactDigitalCardSocials,
      isQrShareNetwork,
      listDigitalCardReachItems,
      nativeOpenFor,
      networkAcceptsQr,
    } = await import("@/lib/digital-business-card/socials");
    assert.equal(networkAcceptsQr("wechat"), true);
    assert.equal(isQrShareNetwork("wechat"), true);
    assert.equal(isQrShareNetwork("line"), true);
    assert.equal(isQrShareNetwork("wechatpay"), false);
    const native = nativeOpenFor("wechat", "foliohouse", "weixin://dl/chat?foliohouse");
    assert.match(native.appHref ?? "", /weixin:\/\/dl\/chat\?foliohouse/);
    assert.match(native.androidIntent ?? "", /com\.tencent\.mm/);
    assert.match(native.androidIntent ?? "", /scheme=weixin/);
    assert.equal(/S\.browser_fallback_url=/.test(native.androidIntent ?? ""), false);
    const fromScheme = nativeOpenFor("wechat", "weixin://dl/chat?foliohouse", "weixin://dl/chat?foliohouse");
    assert.match(fromScheme.appHref ?? "", /weixin:\/\/dl\/chat\?foliohouse/);
    const line = nativeOpenFor("line", "foliohouse", "https://line.me/ti/p/~foliohouse");
    assert.match(line.appHref ?? "", /line:\/\/ti\/p\/~foliohouse/);
    assert.match(line.androidIntent ?? "", /S\.browser_fallback_url=/);
    const packed = compactDigitalCardSocials(
      { wechat: [""] },
      { "wechat-0": "/digital-cards/pay/demo-wechat.png" }
    );
    assert.equal(packed.payQr?.["wechat-0"], "/digital-cards/pay/demo-wechat.png");
    const items = listDigitalCardReachItems({
      email: null,
      phone: null,
      website: null,
      socials: packed,
    });
    const wechat = items.find((item) => item.brand === "wechat");
    assert.equal(wechat?.qrUrl, "/digital-cards/pay/demo-wechat.png");
    assert.equal(wechat?.subtitle, "Scan to add");
    const withId = listDigitalCardReachItems({
      email: null,
      phone: null,
      website: null,
      socials: {
        wechat: "foliohouse",
        payQr: { "wechat-0": "/digital-cards/pay/demo-wechat.png" },
      },
    });
    const live = withId.find((item) => item.brand === "wechat");
    assert.match(live?.href ?? "", /weixin:\/\/dl\/chat\?foliohouse/);
    assert.match(live?.appHref ?? "", /weixin:\/\/dl\/chat\?foliohouse/);
    assert.equal(live?.qrUrl, "/digital-cards/pay/demo-wechat.png");
  });
});

describe("CeleYou device frame", () => {
  it("keeps reach pickers inside the phone frame", () => {
    const catalog = readFileSync(
      join(process.cwd(), "src/components/digital-business-card/digital-card-reach-catalog.tsx"),
      "utf8"
    );
    const shell = readFileSync(
      join(process.cwd(), "src/components/layout/dashboard-shell.tsx"),
      "utf8"
    );
    const studioPage = readFileSync(
      join(process.cwd(), "src/app/dashboard/business-card/page.tsx"),
      "utf8"
    );
    assert.match(catalog, /placeholder="Search a network or paste any link"/);
    assert.match(catalog, /Tap a network to add or edit/);
    assert.match(catalog, /Add a page that is not listed/);
    assert.match(catalog, /celecard-other-links/);
    const otherFields = readFileSync(
      join(process.cwd(), "src/components/digital-business-card/digital-card-other-fields.tsx"),
      "utf8"
    );
    assert.match(otherFields, /Other links/);
    assert.match(otherFields, /App or category not listed/);
    assert.match(catalog, /setActiveKey/);
    assert.match(catalog, /celecard-reach-picker/);
    assert.match(catalog, /celecard-reach-chips/);
    assert.match(catalog, /fit-scroller/);
    assert.match(catalog, /min-w-0 overflow-hidden/);
    assert.match(catalog, /celecard-reach-open/);
    assert.match(catalog, /celecard-reach-card/);
    assert.doesNotMatch(catalog, /sm:grid-cols-2/);
    assert.match(shell, /p-3 sm:p-6 lg:p-8/);
    assert.doesNotMatch(studioPage, /px-4 py-8/);
    const studio = readFileSync(
      join(process.cwd(), "src/components/digital-business-card/digital-card-studio-client.tsx"),
      "utf8"
    );
    const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
    assert.match(studio, /celecard-studio-desk/);
    assert.match(studio, /celecard-studio-jump/);
    assert.match(studio, /celecard-studio-toolbar/);
    assert.match(studio, /celecard-studio-live/);
    assert.match(studio, /#studio-inbox/);
    assert.match(studio, /href: "#studio-activity"/);
    assert.doesNotMatch(studio, /action-row/);
    const jumpAt = studio.indexOf("const STUDIO_JUMP");
    const activityJumpAt = studio.indexOf('href: "#studio-activity"');
    const activationJumpAt = studio.indexOf('href: "#studio-activation"');
    const identityJumpAt = studio.indexOf('href: "#studio-identity"');
    const activityAt = studio.indexOf("<DigitalCardAnalyticsPanel");
    const activationAt = studio.indexOf('id="studio-activation"');
    const deskAt = studio.indexOf("celecard-studio-desk");
    const lookAt = studio.indexOf('id="studio-look"');
    const vaultAt = studio.indexOf("<DigitalCardDesignVault");
    const arrangeAt = studio.indexOf("Guest page arrangement");
    const inboxAt = studio.indexOf("<DigitalCardConnectionInbox");
    assert.equal(
      jumpAt > 0 &&
        activityJumpAt > jumpAt &&
        activityJumpAt < activationJumpAt &&
        activationJumpAt < identityJumpAt &&
        activityAt > 0 &&
        activityAt < activationAt &&
        activationAt < deskAt &&
        lookAt > 0 &&
        vaultAt > lookAt &&
        arrangeAt > vaultAt &&
        inboxAt > arrangeAt,
      true
    );
    assert.doesNotMatch(studio, /lg:grid-cols-\[1fr_360px\]/);
    assert.match(css, /@media \(min-width: 1180px\)/);
    assert.match(css, /\.celecard-studio-toolbar/);
    assert.match(css, /\.celecard-studio-live/);
    assert.match(css, /\.celecard-reach-open/);
    assert.match(css, /\.celecard-reach-chips/);
  });
});

describe("CeleYou activity flow", () => {
  it("keeps privacy copy and stages the published counts", () => {
    const source = readFileSync(
      join(process.cwd(), "src/components/digital-business-card/digital-card-analytics-panel.tsx"),
      "utf8"
    );
    const css = readFileSync(
      join(process.cwd(), "src/components/digital-business-card/digital-card-analytics-panel.module.css"),
      "utf8"
    );
    assert.match(source, /Live counts from people who open this CeleYou/);
    assert.match(source, /cache: "no-store"/);
    assert.match(source, /setInterval/);
    assert.match(source, /label: "Arrive"/);
    assert.match(source, /label: "Save contact"/);
    assert.match(source, /label: "Reach"/);
    assert.match(source, /label: "Pass on"/);
    assert.match(source, /Recent activity/);
    assert.match(source, /Load more/);
    assert.match(source, /visibilityState === "hidden"/);
    assert.match(source, /useReducedMotion/);
    assert.match(css, /@keyframes flow-ring/);
    assert.match(css, /prefers-reduced-motion: reduce/);
  });

  it("filters Activity by calendar range and keeps All time as the default", async () => {
    const {
      activityRangeFromDays,
      activityRangeFromPreset,
      activityRangeQuery,
      formatActivityHeroCaption,
      formatActivityRangeLabel,
      monthGrid,
    } = await import("@/lib/digital-business-card/activity-range");
    const now = new Date(2026, 10, 12, 15, 4, 0);
    const all = activityRangeFromPreset("all", now);
    const today = activityRangeFromPreset("today", now);
    const week = activityRangeFromPreset("7d", now);
    const custom = activityRangeFromDays("2026-11-01", "2026-11-12");
    assert.equal(formatActivityRangeLabel(all, now), "All time");
    assert.equal(activityRangeQuery(all), "");
    assert.equal(today.from, "2026-11-12");
    assert.equal(today.to, "2026-11-12");
    assert.equal(week.from, "2026-11-06");
    assert.match(activityRangeQuery(week), /from=2026-11-06/);
    assert.match(activityRangeQuery(week), /to=2026-11-12/);
    assert.equal(custom?.preset, "custom");
    assert.equal(formatActivityRangeLabel(custom!, now), "1 to 12 Nov");
    assert.equal(formatActivityHeroCaption(all), "People opened this public profile.");
    assert.equal(formatActivityHeroCaption(today), "People who opened this public profile today.");
    const grid = monthGrid(now);
    assert.equal(grid.length, 42);
    assert.equal(grid[0].key, "2026-10-26");
    assert.equal(grid.find((day) => day.key === "2026-11-12")?.inMonth, true);

    const panel = readFileSync(
      join(process.cwd(), "src/components/digital-business-card/digital-card-analytics-panel.tsx"),
      "utf8"
    );
    const rangeUi = readFileSync(
      join(process.cwd(), "src/components/digital-business-card/digital-card-activity-range.tsx"),
      "utf8"
    );
    const route = readFileSync(
      join(process.cwd(), "src/app/api/digital-business-cards/[id]/analytics/route.ts"),
      "utf8"
    );
    const service = readFileSync(
      join(process.cwd(), "src/services/digital-business-card/digital-business-card.service.ts"),
      "utf8"
    );
    const css = readFileSync(
      join(process.cwd(), "src/components/digital-business-card/digital-card-analytics-panel.module.css"),
      "utf8"
    );
    assert.match(panel, /activityRangeQuery\(range\)/);
    assert.match(panel, /DigitalCardActivityRange/);
    assert.match(panel, /\[cardId, rangeQuery\]/);
    assert.match(rangeUi, /ACTIVITY_RANGE_PRESETS/);
    assert.match(rangeUi, /monthGrid/);
    assert.match(rangeUi, /Filter activity by date/);
    assert.match(rangeUi, /\[open\]/);
    assert.doesNotMatch(rangeUi, /value\.from, value\.to/);
    assert.match(route, /activityRangeBounds/);
    assert.match(route, /from: bounds\.from/);
    assert.match(service, /profile_open/);
    assert.match(service, /ranged \? byKind\.profile_open/);
    assert.match(css, /\.calendar/);
    assert.match(css, /overflow: visible/);
  });
});

describe("CeleYou paid activation lock", () => {
  it("lets only platform admins skip Paystack, and locks paid terms until expiry", () => {
    const subscribe = readFileSync(
      join(process.cwd(), "src/app/api/digital-business-cards/[id]/subscribe/route.ts"),
      "utf8"
    );
    const service = readFileSync(
      join(process.cwd(), "src/services/digital-business-card/digital-business-card.service.ts"),
      "utf8"
    );
    const deleteRoute = readFileSync(
      join(process.cwd(), "src/app/api/digital-business-cards/[id]/route.ts"),
      "utf8"
    );
    const permissions = readFileSync(join(process.cwd(), "src/lib/rbac/permissions.ts"), "utf8");
    const billing = readFileSync(
      join(process.cwd(), "src/components/digital-business-card/smartcard-billing-client.tsx"),
      "utf8"
    );
    const renewal = readFileSync(
      join(process.cwd(), "src/services/digital-business-card/smartcard-renewal.service.ts"),
      "utf8"
    );
    assert.match(subscribe, /isAdminCommerceBypass\(session\.user\.role\)/);
    assert.match(subscribe, /paymentService\.initializePayment/);
    assert.match(subscribe, /SMARTCARD_PAYMENT_KIND/);
    assert.match(subscribe, /CELEYOU_RENEWAL_WAIT_MESSAGE/);
    assert.match(subscribe, /pickAccountPaidEntitlement/);
    assert.match(service, /inheritedEntitlementFrom|findAccountPaidEntitlement/);
    assert.match(service, /propagateAccountEntitlement/);
    assert.match(billing, /CELEYOU_TERM_LOCKED_CTA|CELEYOU_TERM_LOCKED_HINT/);
    assert.match(service, /if \(celeYouPaidTermIsRunning/);
    assert.match(service, /throw new CeleYouPaidTermLockedError/);
    assert.match(deleteRoute, /CeleYouPaidTermLockedError/);
    assert.match(permissions, /ADMIN: \[[\s\S]*Permission\.CELECARD_GRANT_COMPLIMENTARY/);
    assert.match(billing, /CELEYOU_TERM_OPEN_HINT|cannot be cancelled/);
    assert.match(renewal, /subscriptionStatus: "EXPIRED"/);
    assert.doesNotMatch(billing, /Cancel subscription|End subscription|Terminate/);
  });
});

describe("CeleYou landscape hold", () => {
  it("fits the whole ID-1 plate on a rotated short landscape", () => {
    assert.equal(celecardShouldHoldViewport(932, 430, true), true);
    assert.equal(celecardShouldHoldViewport(1180, 651, false), true);
    assert.equal(celecardShouldHoldViewport(844, 390, false, 390, 844), true);
    assert.equal(celecardShouldHoldViewport(390, 844, true), false);
    assert.equal(celecardShouldHoldViewport(781, 731, false), false);
    assert.equal(celecardShouldHoldViewport(1440, 900, false), false);
    assert.equal(celecardShouldHoldViewport(1280, 720, false, 1280, 800), false);
    const coverPhone = celecardHoldCoverSize(844, 390);
    assert.ok(coverPhone.width <= 844);
    assert.ok(coverPhone.height <= 390);
    assert.ok(coverPhone.width < 844);
    assert.ok(Math.abs(coverPhone.height - (390 - 24)) < 0.5);
    assert.ok(Math.abs(coverPhone.width / coverPhone.height - 85.6 / 54) < 0.002);
    const coverTall = celecardHoldCoverSize(800, 600);
    assert.ok(coverTall.width <= 800);
    assert.ok(coverTall.height <= 600);
    assert.ok(coverTall.height < 600);
    assert.ok(Math.abs(coverTall.width - (800 - 24)) < 0.5);
    assert.ok(Math.abs(coverTall.width / coverTall.height - 85.6 / 54) < 0.002);

    const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
    const view = readFileSync(
      join(process.cwd(), "src/components/digital-business-card/digital-card-public-view.tsx"),
      "utf8"
    );
    assert.match(css, /data-celecard-hold="true"/);
    assert.match(css, /\(orientation: landscape\) and \(max-height: 740px\)/);
    assert.match(css, /85\.6 \/\s*54/);
    assert.match(css, /min\(calc\(100dvw - 24px\)/);
    assert.doesNotMatch(css, /max\(100dvw, calc\(100dvh \* 85\.6 \/ 54\)\)/);
    assert.match(css, /--celecard-hold-cover-w/);
    assert.match(css, /--celecard-hold-cover-h/);
    assert.match(css, /--celecard-hold-top/);
    assert.doesNotMatch(css, /0\.7rem\) \* 85\.6/);
    assert.doesNotMatch(
      css,
      /\.celecard-stage\[data-celecard-hold="true"\] \.celecard-guest-column \{[\s\S]*?padding: env\(safe-area-inset-top/
    );
    assert.match(css, /celecard-plate-flip-in/);
    assert.match(css, /--celecard-flip, 1\.65s/);
    assert.match(css, /rotateY\(-78deg\)/);
    assert.doesNotMatch(css, /celecard-plate-flip-in 0\.84s/);
    assert.match(css, /view-transition-name: celecard-plate/);
    assert.match(view, /useCelecardSilentHold/);
    assert.match(view, /onPlateActivate/);
    const holdHook = readFileSync(
      join(process.cwd(), "src/components/digital-business-card/use-celecard-silent-hold.ts"),
      "utf8"
    );
    assert.match(holdHook, /orientationchange/);
    assert.match(holdHook, /wakeLock/);
    assert.match(holdHook, /readCelecardHoldViewport/);
    assert.match(holdHook, /writeCelecardHoldViewportCss/);
    const tap = readFileSync(
      join(process.cwd(), "src/components/digital-business-card/celeyou-tap-connect.tsx"),
      "utf8"
    );
    assert.match(tap, /DigitalCardFace/);
    assert.match(tap, /useCelecardSilentHold/);
    assert.match(tap, /celecard-hold-frame/);
    assert.match(tap, /silentHost/);
    assert.match(tap, /void startHost\(\)/);
    assert.match(tap, /celecard-tap-scanner/);
    assert.match(tap, /celeyou-tap-scan-viewfinder/);
    assert.match(tap, /showScreenScanToggle=\{false\}/);
    assert.match(tap, /if \(scanning\) setHoldIntent\("closed"\)/);
    assert.doesNotMatch(tap, /ProximityOrbs|h-24 w-40/);
    assert.match(css, /hover: none/);
    assert.match(css, /celecard-tap-chrome/);
    assert.match(css, /max-width: none/);
    assert.match(css, /place-items: unsafe center/);
    assert.match(css, /background: #041c1a !important/);
    assert.doesNotMatch(
      css,
      /\.celecard-stage\[data-celecard-hold="true"\] \.celecard-face \{[^}]*border-radius:\s*0/
    );
    assert.doesNotMatch(view, /qrHref=\{hold \? undefined : digitalCardPublicUrl/);
    assert.doesNotMatch(view, /Tap this plate to share from this phone/);
    assert.match(view, /celeyou\.hold_qr/);
    assert.match(view, /celeyou\.show_page/);
    assert.match(view, /data-celecard-hold-present/);
    assert.match(view, /present=\{holdPresent === "scan" \? "scan" : "card"\}/);
    assert.equal(celecardHoldPresent(true, "portrait"), "plate");
    assert.equal(celecardHoldPresent(true, "landscape"), "plate");
    assert.equal(celecardHoldPresent(false, "portrait"), null);
    const scanPhone = celecardHoldScanSize(390, 844);
    assert.equal(scanPhone.width, scanPhone.height);
    assert.ok(Math.abs(scanPhone.width - (390 - 24)) < 0.5);
    const coverPortrait = celecardHoldCoverSize(390, 844);
    assert.ok(coverPortrait.width <= 390);
    assert.ok(coverPortrait.height <= 844);
    assert.ok(Math.abs(coverPortrait.width / coverPortrait.height - 85.6 / 54) < 0.002);
    assert.deepEqual(celecardHoldFitSize(390, 844, "portrait"), coverPortrait);
    assert.deepEqual(celecardHoldFitSize(844, 390, "landscape"), coverPhone);
    assert.match(css, /\[data-celecard-hold-present="scan"\]/);
    assert.match(css, /\.celecard-scan-qr/);
    const face = readFileSync(
      join(process.cwd(), "src/components/digital-business-card/digital-card-face.tsx"),
      "utf8"
    );
    assert.match(face, /data-present=\{present === "scan"/);
    assert.match(face, /function ScanPlate/);
    assert.match(holdHook, /celecardHoldIsActive\(holdIntentRef/);
    assert.equal(celecardHoldAxis(390, 844), "portrait");
    assert.equal(celecardHoldAxis(844, 390), "landscape");
    assert.equal(celecardHoldIsActive("auto", false), false);
    assert.equal(celecardHoldIsActive("open", false), true);
    assert.equal(celecardHoldIsActive("closed", true), false);
    assert.equal(celecardToggleHoldIntent(false), "open");
    assert.equal(celecardToggleHoldIntent(true), "closed");
    assert.equal(celecardHoldIntentAfterAutoChange("closed", false, true), "auto");
    assert.equal(celecardHoldIntentAfterAutoChange("closed", true, false), "auto");
    assert.equal(celecardHoldIntentAfterAutoChange("closed", true, true), "closed");
    assert.equal(celecardEventIsPlateBackground(null), true);
  });
});

describe("CeleYou guest public layout", () => {
  it("keeps the ID-1 plate card-sized and opens a two-column desk on large screens", () => {
    const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
    const view = readFileSync(
      join(process.cwd(), "src/components/digital-business-card/digital-card-public-view.tsx"),
      "utf8"
    );
    assert.match(css, /width: min\(100%, 22\.75rem\)/);
    assert.match(css, /@media \(min-width: 960px\)/);
    assert.match(css, /max-width: min\(72rem, 1120px\)/);
    assert.match(css, /grid-template-columns: minmax\(20rem, 26\.5rem\) minmax\(18rem, 1fr\)/);
    assert.match(view, /celecard-guest-intro/);
    assert.doesNotMatch(view, /You do not need an app or an account/);
    assert.match(view, /celecard-guest-section/);
    assert.match(view, /celecard-guest-kicker/);
    assert.doesNotMatch(view, /mb-2 text-center text-\[11px\] font-semibold uppercase tracking-\[0\.16em\]/);
    assert.match(css, /\.celecard-guest-kicker/);
    assert.match(css, /\.celecard-guest-kicker-rule/);
    assert.match(css, /font-family: var\(--font-cinzel\)/);
    assert.match(view, /celecardKickerInk/);
    assert.match(view, /celecard-guest-kicker-label/);
    assert.match(view, /data-section=\{section.id\}/);
    assert.match(view, /data-span=\{sectionTitle.length > 18 \? "wide" : "tight"\}/);
    const sections = readFileSync(join(process.cwd(), "src/lib/celeyou-share/profile-sections.ts"), "utf8");
    assert.match(sections, /asGuestWalletDock/);
    assert.match(sections, /id === "products" \? asGuestWalletDock\(items\) : items/);
    assert.match(css, /\[data-span="wide"\]/);
    assert.match(view, /data-voice=\{typeVoice.originStyle\}/);
    assert.match(view, /celecard-guest-copy/);
    assert.match(view, /celecard-guest-about/);
    assert.match(view, /formatGuestAbout/);
    assert.match(view, /celecardReachPlate/);
    assert.match(css, /\.celecard-guest-copy/);
    assert.match(css, /\.celecard-guest-about \{/);
    assert.match(css, /font-family: var\(--font-cormorant\)/);
    assert.match(css, /font-family: var\(--font-playfair\)/);
    assert.doesNotMatch(view, /text-center text-\[15px\] font-medium leading-relaxed/);
    assert.match(view, /celecard-action-label/);
    assert.match(view, /celeyou\.save_contact/);
    assert.match(view, /celeyou\.connect_back_aria/);
    assert.match(view, /celeyou\.connect_back/);
    assert.match(view, /celeyou\.connect_phone_placeholder/);
    assert.doesNotMatch(view, /placeholder="Phone \/ WhatsApp"/);
    assert.match(view, /celecard-share-layer/);
    assert.match(view, /celecard-share-plate/);
    assert.match(view, /celeyou\.share_card/);
    assert.match(view, /celeyou\.preparing_card/);
    assert.match(view, /celeCardShareCommentary/);
    assert.match(view, /celeyou\.share_this/);
    assert.match(view, /capturePlate: true/);
    assert.match(view, /copyCeleYouProfile/);
    assert.match(view, /copyCard/);
    assert.doesNotMatch(view, /Share plate/);
    assert.doesNotMatch(view, /clipboard\.writeText\(celeCardShareClipboard/);
    assert.match(view, /<Contact/);
    assert.doesNotMatch(view, /<Download/);
    assert.doesNotMatch(view, /contactActions/);
    assert.doesNotMatch(view, /Show QR/);
    assert.doesNotMatch(view, /Present card/);
    assert.match(view, /celecard-plate-motion/);
    assert.doesNotMatch(view, /Tap to Connect/);
    assert.match(view, /CeleCardStageField/);
    assert.match(view, /data-celecard-stage/);
    assert.match(view, /--celecard-stage-light/);
    assert.match(css, /\.celecard-stage-field \{/);
    assert.match(css, /\.celecard-stage-key \{/);
    assert.match(css, /\.celecard-stage-vignette \{/);
    assert.match(css, /\.celecard-stage-grain \{/);
    assert.match(css, /\.celecard-stage-meridian \{/);
    assert.match(css, /celecard-stage-field/);
    assert.match(view, /demoCardPreviewExplorePath/);
    assert.match(view, /celeyou.create_aria/);
    assert.match(view, /celecard-guest-footer/);
    assert.match(view, /celecard-guest-powered/);
    assert.match(view, /celecard-guest-powered-mark/);
    assert.match(view, /celecard-guest-powered-rule/);
    assert.doesNotMatch(view, /celecard-guest-powered-core/);
    assert.match(view, /COMPANY_NAME/);
    assert.match(view, /celeyou\.powered_by/);
    assert.match(view, /dock\.ghostBg/);
    assert.match(view, /headingInk/);
    assert.match(view, /--celecard-powered-accent/);
    assert.match(view, /href="\/"/);
    assert.doesNotMatch(view, /APP_TAGLINE/);
    assert.match(css, /\.celecard-studio \.text-slate-500/);
    assert.match(css, /\.celecard-guest-footer \{/);
    assert.match(css, /6\.75rem/);
    assert.match(css, /\.celecard-guest-powered-mark/);
    assert.match(css, /\.celecard-guest-powered-rule/);
    assert.doesNotMatch(css, /celecard-guest-powered-core/);
    assert.doesNotMatch(css, /celecard-guest-powered-by/);
    assert.match(css, /\.celecard-guest-footer,[\s\S]*\.celecard-dock-bar/);
    const footerAt = view.indexOf("celecard-guest-footer");
    const dockAt = view.indexOf("celecard-dock-bar");
    const columnClose = view.lastIndexOf("celecard-guest-column");
    assert.equal(footerAt > columnClose, true);
    assert.equal(dockAt > footerAt, true);
    assert.match(css, /@media \(max-width: 479px\)/);
    assert.match(css, /flex: 1 1 100%/);
    assert.match(css, /\.celecard-reach-row \{/);
    assert.match(css, /--reach-icon/);
    assert.match(css, /container-type:\s*inline-size/);
    assert.match(css, /minmax\(0,\s*1fr\)/);
    assert.match(css, /overflow-wrap:\s*anywhere/);
    assert.match(css, /@media \(max-width: 379px\)/);
    assert.match(view, /headingInk/);
    assert.match(view, /ghostBorder/);
    assert.doesNotMatch(view, /28,25,23,0\.62/);
    assert.match(view, /28,25,23,0\.82/);
    const grid = readFileSync(
      join(process.cwd(), "src/components/digital-business-card/digital-card-reach-grid.tsx"),
      "utf8"
    );
    assert.match(grid, /celecardReachPlate/);
    assert.match(grid, /celecard-reach-copy/);
    assert.match(grid, /celecard-reach-title/);
    assert.match(grid, /celecard-reach-hint/);
    assert.match(grid, /celecard-reach-go/);
    assert.match(grid, /ReachTitleText/);
    assert.match(grid, /<wbr/);
    assert.doesNotMatch(grid, /min-h-\[4\.35rem\]/);
    assert.doesNotMatch(grid, /color: darkStage \? "#1c1917" : theme\.text/);
    const meeting = readFileSync(
      join(process.cwd(), "src/components/digital-business-card/digital-card-meeting-drop.tsx"),
      "utf8"
    );
    assert.match(meeting, /CELECARD_REACH_INK/);
    assert.doesNotMatch(meeting, /color: theme\.text/);
  });
});

describe("CeleYou About length", () => {
  it("caps About at 300 characters in studio, APIs, and writes", () => {
    assert.equal(CELECARD_BIO_MAX_CHARS, 300);
    assert.equal(clipCeleCardBio("hello"), "hello");
    assert.equal(clipCeleCardBio("x".repeat(300)).length, 300);
    assert.equal(clipCeleCardBio("x".repeat(301)), "x".repeat(300));
    assert.equal(clipCeleCardBio(null), "");
    assert.equal(clipCeleCardBio(undefined), "");
    assert.equal((DEMO_CARD.bio ?? "").length <= CELECARD_BIO_MAX_CHARS, true);

    const ownerCreate = readFileSync(
      join(process.cwd(), "src/app/api/digital-business-cards/route.ts"),
      "utf8"
    );
    const ownerPatch = readFileSync(
      join(process.cwd(), "src/app/api/digital-business-cards/[id]/route.ts"),
      "utf8"
    );
    const adminCreate = readFileSync(
      join(process.cwd(), "src/app/api/admin/celecard/cards/route.ts"),
      "utf8"
    );
    const adminPatch = readFileSync(
      join(process.cwd(), "src/app/api/admin/celecard/cards/[id]/route.ts"),
      "utf8"
    );
    const service = readFileSync(
      join(process.cwd(), "src/services/digital-business-card/digital-business-card.service.ts"),
      "utf8"
    );
    const adminCommand = readFileSync(
      join(process.cwd(), "src/services/digital-business-card/admin-command.service.ts"),
      "utf8"
    );
    const studio = readFileSync(
      join(process.cwd(), "src/components/digital-business-card/digital-card-studio-client.tsx"),
      "utf8"
    );
    const demoStudio = readFileSync(
      join(process.cwd(), "src/components/digital-business-card/digital-card-live-demo-studio.tsx"),
      "utf8"
    );
    const adminDetail = readFileSync(
      join(process.cwd(), "src/components/digital-business-card/celecard-card-detail.tsx"),
      "utf8"
    );

    for (const source of [ownerCreate, ownerPatch, adminCreate, adminPatch]) {
      assert.match(source, /bio: z\.string\(\)\.max\(CELECARD_BIO_MAX_CHARS\)/);
      assert.doesNotMatch(source, /bio: z\.string\(\)\.max\(600\)/);
    }
    assert.match(service, /bio: clipCeleCardBio\(input\.bio\?\.trim\(\)\) \|\| null/);
    assert.match(adminCommand, /clipCeleCardBio\(input\.bio\?\.trim\(\)\) \|\| null/);
    assert.match(studio, /id="bio"/);
    assert.match(studio, /maxLength=\{CELECARD_BIO_MAX_CHARS\}/);
    assert.match(studio, /clipCeleCardBio\(e\.target\.value\)/);
    assert.match(studio, /\{form\.bio\.length\}\/\{CELECARD_BIO_MAX_CHARS\}/);
    assert.match(demoStudio, /maxLength=\{CELECARD_BIO_MAX_CHARS\}/);
    assert.match(demoStudio, /clipCeleCardBio\(partial\.bio\)/);
    assert.match(adminDetail, /maxLength=\{CELECARD_BIO_MAX_CHARS\}/);
    assert.match(adminDetail, /clipCeleCardBio\(e\.target\.value\)/);
  });
});
