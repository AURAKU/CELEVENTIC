import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveDigitalCardTheme, DIGITAL_CARD_THEMES, celecardMotionMood } from "@/lib/digital-business-card/themes";
import { celecardDisplayNameLines, celecardDockFinish, celecardNameFitCqw, celecardNameShouldStack, celecardTypeVoice } from "@/lib/digital-business-card/type-voice";
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
import { buildVCard } from "@/lib/digital-business-card/vcard";
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
import { digitalCardQrImageSrc } from "@/lib/digital-business-card/types";

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
    assert.match(css, /\.celecard-wordmark \{[\s\S]*padding: 1\.1cqw 6cqw 3\.6cqw;/);
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
    assert.doesNotMatch(originPlate[0], /border-radius:\s*999px/);
    const originImg = css.match(/\.celecard-origin-plate img \{[^}]+\}/);
    assert.ok(originImg);
    assert.match(originImg[0], /object-fit: contain/);
    assert.doesNotMatch(originImg[0], /transform:\s*scale/);
    assert.match(mark, /overflow-visible/);
    assert.doesNotMatch(mark, /overflow-hidden/);
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
    assert.deepEqual(celecardDisplayNameLines("Ama Serwaa Boateng", true), ["Ama Serwaa", "Boateng"]);
    assert.deepEqual(celecardDisplayNameLines("Ama Serwaa", false), ["Ama Serwaa"]);
    assert.deepEqual(celecardDisplayNameLines("Madonna", true), ["Madonna"]);
    assert.equal(celecardNameFitCqw("Madonna", true) > celecardNameFitCqw("Alexandrina Worthington", true), true);
    assert.equal(celecardNameShouldStack("Nhyira Addo", true), false);
    assert.equal(celecardNameShouldStack("Alexandrina Worthington-Mensah", true), true);
    assert.equal(celecardNameFitCqw("Alexandria Boateng Mensah", false) < celecardNameFitCqw("Ama Serwaa", false), true);
    const voices = new Set(["letterhead", "credit", "stamp", "neon", "masthead", "carved"]);
    for (const theme of DIGITAL_CARD_THEMES) {
      assert.equal(voices.has(celecardTypeVoice(theme).originStyle), true, theme.id);
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
    const stamp = celecardDockFinish(resolveDigitalCardTheme("charcoal-minimal"), { darkStage: false });
    assert.equal(stamp.originStyle, "stamp");
    assert.equal(stamp.labelTransform, "none");
  });

  it("maps every template to a guest motion mood", () => {
    const moods = new Set(["atelier", "cinema", "pulse", "earth", "linen"]);
    for (const theme of DIGITAL_CARD_THEMES) {
      assert.equal(moods.has(celecardMotionMood(theme)), true, theme.id);
    }
    assert.equal(celecardMotionMood(resolveDigitalCardTheme("gold-folio")), "atelier");
    assert.equal(celecardMotionMood(resolveDigitalCardTheme("velvet-credits")), "cinema");
    assert.equal(celecardMotionMood(resolveDigitalCardTheme("creator-pulse")), "pulse");
    assert.equal(celecardMotionMood(resolveDigitalCardTheme("sahara-dune")), "earth");
  });
});

describe("subscription countdown", () => {
  it("counts down to renewal, studio end, and an ended window", async () => {
    const { DEMO_CARD_PAID_THROUGH } = await import("@/lib/digital-business-card/demo-card");
    const {
      countdownFlowDelayMs,
      countdownParts,
      countdownTickMs,
      formatPaidThrough,
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
  });
});

describe("smartcard plans", () => {
  it("prices monthly through yearly with savings", () => {
    assert.equal(SMARTCARD_PLANS.length, 4);
    assert.equal(getSmartCardPlan("monthly")?.priceGhs, 49);
    assert.equal(getSmartCardPlan("quarter")?.months, 3);
    assert.equal(getSmartCardPlan("half")?.priceGhs, 239);
    assert.equal(getSmartCardPlan("yearly")?.priceGhs, 449);
    assert.equal(getSmartCardPlan("yearly")?.pricePesewas, 44900);
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
    assert.match(result.guidance, /Android|Chrome|NFC/i);
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
      phone: "+233000",
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
    assert.match(vcf, /FN:Ama Mensah/);
    assert.match(vcf, /N:Mensah;Ama;;;/);
    assert.match(vcf, /ORG:Celeventic/);
    assert.match(vcf, /TITLE:Founder/);
    assert.match(vcf, /TEL;TYPE=CELL,VOICE:\+233000/);
    assert.match(vcf, /EMAIL;TYPE=INTERNET:ama@example.com/);
    assert.match(vcf, /URL;TYPE=WORK:https:\/\/celeventic.com/);
    assert.match(vcf, /X-ABLabel:LinkedIn/);
    assert.match(vcf, /NOTE:Hello/);
    assert.match(vcf, /END:VCARD/);
  });
});

describe("celecard social catalog", () => {
  it("turns handles and numbers into tap URLs", async () => {
    const { digitalCardSocialHref, DIGITAL_CARD_SOCIAL_NETWORKS } = await import(
      "@/lib/digital-business-card/socials"
    );
    assert.equal(digitalCardSocialHref("whatsapp", "233240000000"), "https://wa.me/233240000000");
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
    const { DIGITAL_CARD_BRAND_PATHS } = await import("@/lib/digital-business-card/brand-paths");
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
});

describe("celecard dummy portrait", () => {
  it("publishes Ama's photo instead of initials", async () => {
    const { DEMO_CARD, DEMO_CARD_AVATAR_PATH } = await import("@/lib/digital-business-card/demo-card");
    assert.equal(DEMO_CARD.avatarUrl, DEMO_CARD_AVATAR_PATH);
    assert.match(DEMO_CARD_AVATAR_PATH, /^\/digital-cards\/demo\/ama-serwaa\.jpg$/);
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
    assert.equal(items.find((item) => item.brand === "momo")?.href, "tel:0240000000");
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
    assert.match(vcf, /EMAIL;TYPE=INTERNET,WORK:ama@foliomaison\.demo/);
    assert.match(vcf, /EMAIL;TYPE=INTERNET,HOME:studio@foliomaison\.demo/);
    assert.match(vcf, /TEL;TYPE=CELL,VOICE:\+233 24 000 0000/);
    assert.match(vcf, /TEL;TYPE=WORK,VOICE:\+233 30 211 4400/);
    assert.match(vcf, /X-ABLabel:WhatsApp/);
    assert.match(vcf, /X-ABLabel:Instagram/);
    assert.match(vcf, /X-ABLabel:LinkedIn/);
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
    const linkedin = nativeOpenFor("linkedin", "ama-serwaa", "https://www.linkedin.com/in/ama-serwaa");
    assert.match(linkedin.appHref ?? "", /linkedin:\/\/in\/ama-serwaa/);
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
    assert.match(catalog, /placeholder="Search a network"/);
    assert.match(catalog, /Tap a network to add/);
    assert.match(catalog, /fit-scroller/);
    assert.match(catalog, /min-w-0 overflow-hidden/);
    assert.match(shell, /p-3 sm:p-6 lg:p-8/);
    assert.doesNotMatch(studioPage, /px-4 py-8/);
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
    assert.match(source, /These counts are not the recipient’s identity/);
    assert.match(source, /label: "Arrive"/);
    assert.match(source, /label: "Save contact"/);
    assert.match(source, /label: "Reach"/);
    assert.match(source, /label: "Pass on"/);
    assert.match(source, /useReducedMotion/);
    assert.match(css, /@keyframes flow-ring/);
    assert.match(css, /prefers-reduced-motion: reduce/);
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
    assert.match(billing, /Renewal opens after this term ends|same subscription/);
    assert.match(service, /if \(celeYouPaidTermIsRunning/);
    assert.match(service, /throw new CeleYouPaidTermLockedError/);
    assert.match(deleteRoute, /CeleYouPaidTermLockedError/);
    assert.match(permissions, /ADMIN: \[[\s\S]*Permission\.CELECARD_GRANT_COMPLIMENTARY/);
    assert.match(billing, /cannot be cancelled/);
    assert.match(renewal, /subscriptionStatus: "EXPIRED"/);
    assert.doesNotMatch(billing, /Cancel subscription|End subscription|Terminate/);
  });
});
