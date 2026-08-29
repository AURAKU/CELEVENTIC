import test from "node:test";
import assert from "node:assert/strict";
import {
  FASHION_GESTURE_ARM_MS,
  FASHION_MOTION,
  FASHION_SILK_DRAG_PX,
  FASHION_WHISPER_MS,
  FEMMORA_HOUSE_DEFAULTS,
  FEMMORA_INVITATION_FLYER,
  FEMMORA_LOGO_MARK,
  FEMMORA_MAPS_URL,
  FEMMORA_STORE_FILM,
  FEMMORA_STORE_POSTER,
  LUXURY_FASHION_HOUSE_DEFAULTS,
  MAISON_VALE_COLORS,
  MAISON_VALE_HOUSE,
  assertHouseIsNotFemmora,
  displayFashionSocialHandle,
  fashionTokenStyleFromColors,
  mergeFashionHouse,
  resolveFashionChapters,
  resolveFashionExperienceFlyer,
  resolveFashionFilm,
  resolveFashionHouse,
  resolveFashionLookbook,
  resolveFashionOpeningStyle,
  resolveFashionSocialLinks,
  resolveFashionStoreStills,
  resolveFashionTeaser,
  socialLinkHasDestination,
} from "@/lib/experience/luxury-fashion";
import { isPointerArmSafe } from "@/lib/experience/luxury-fashion/gesture-arming";
import { previewTapLabelForOpening } from "@/lib/experience/opening-experiences";
import { getCatalogTemplate, getBrowseCatalogTemplates, filterCatalogTemplates } from "@/lib/invitation-mvp/catalogue";
import { getDefaultDesignConfig } from "@/lib/invitation-templates";
import { enrichDesignWithExperienceDNA } from "@/lib/experience/experience-engine-v2";
import { buildDirectionsUrl } from "@/lib/invitation/maps-utils";
import { buildInviteShareChannelHref, buildInviteSharePayload } from "@/lib/invitation/invite-share";
import { buildGoogleCalendarUrl, toMapsEmbedUrl } from "@/lib/invitation/calendar-utils";
import { getLayoutMusicProfile } from "@/lib/invitation/layout-music-identity";
import { getCatalogMusicProfile } from "@/lib/invitation/catalog-music-identity";
import { resolveInvitationMusic } from "@/lib/music/resolve-invitation-music";
import { buildLivePreviewProps } from "@/lib/invitation-mvp/demo-preview-data";

test("Femmora house DNA keeps Westlands copy and a live maps search URL", () => {
  assert.equal(FEMMORA_HOUSE_DEFAULTS.houseName, "FEMMORA");
  assert.equal(FEMMORA_HOUSE_DEFAULTS.locationName, "FEMMORA GH");
  assert.equal(FEMMORA_HOUSE_DEFAULTS.address, "Westlands");
  assert.equal(FEMMORA_HOUSE_DEFAULTS.hoursLabel, "9 AM TO 8 PM EACH DAY");
  assert.equal(FEMMORA_HOUSE_DEFAULTS.datesLabel, "29TH & 30TH AUGUST");
  assert.equal(FEMMORA_HOUSE_DEFAULTS.whisperScript, "Soft Opening");
  assert.equal(FEMMORA_HOUSE_DEFAULTS.experienceFlyerUrl, FEMMORA_INVITATION_FLYER);
  assert.equal(resolveFashionExperienceFlyer(FEMMORA_HOUSE_DEFAULTS), FEMMORA_INVITATION_FLYER);
  assert.equal(FEMMORA_HOUSE_DEFAULTS.unveilingLabel, "TAP TO OPEN");
  assert.equal(FEMMORA_HOUSE_DEFAULTS.openingStyle, "card-envelope");
  assert.equal(FEMMORA_HOUSE_DEFAULTS.envelopeFaceLine, "PRIVATE INVITATION");
  assert.equal(FEMMORA_HOUSE_DEFAULTS.cardCtaLabel, "OPEN");
  assert.equal(FEMMORA_HOUSE_DEFAULTS.logoUrl, FEMMORA_LOGO_MARK);
  assert.equal(FEMMORA_HOUSE_DEFAULTS.silkBedUrl, null);
  assert.equal(FEMMORA_HOUSE_DEFAULTS.teaserPlaceLine, "WESTLANDS");
  assert.equal(FEMMORA_HOUSE_DEFAULTS.rsvpHeading, "Will we see you at Femmora?");
  assert.equal(FEMMORA_HOUSE_DEFAULTS.navLabels[0]?.label, "Enter Experience");
  assert.match(FEMMORA_MAPS_URL, /^https:\/\/www\.google\.com\/maps\/search\//);
  assert.ok(buildDirectionsUrl({ mapsLink: FEMMORA_MAPS_URL }));
  const embed = toMapsEmbedUrl(FEMMORA_MAPS_URL, "FEMMORA GH, Westlands");
  assert.match(embed ?? "", /maps\.google\.com\/maps\?q=/);
  assert.match(embed ?? "", /Femmora|FEMMORA|Westlands/i);
  assert.match(embed ?? "", /output=embed/);
  assert.equal(toMapsEmbedUrl("", ""), null);
});

test("fashion house merge prefers organizer overrides without dropping nav labels", () => {
  const next = mergeFashionHouse(FEMMORA_HOUSE_DEFAULTS, { houseName: "Maison Test", navLabels: [] });
  assert.equal(next.houseName, "Maison Test");
  assert.equal(next.navLabels.length, FEMMORA_HOUSE_DEFAULTS.navLabels.length);
});

test("store film resolves from bundled Femmora media, then Studio hero video, never a local filepath", () => {
  const house = resolveFashionHouse({
    layout: "luxury-fashion-flagship",
    colors: { primary: "#000", secondary: "#000", accent: "#000", background: "#fff", text: "#000" },
    experience: { fashionHouse: FEMMORA_HOUSE_DEFAULTS },
  });
  const bundled = resolveFashionFilm({ house, media: [] });
  assert.equal(bundled.src, FEMMORA_STORE_FILM);
  assert.equal(bundled.poster, FEMMORA_STORE_POSTER);
  assert.ok(!bundled.src?.startsWith("/Users/"));
  const film = resolveFashionFilm({
    house,
    media: [
      {
        url: "https://cdn.example.com/femmora-store.mp4",
        type: "video",
        role: "hero",
        posterUrl: "https://cdn.example.com/poster.jpg",
      },
    ],
  });
  assert.equal(film.src, "https://cdn.example.com/femmora-store.mp4");
  assert.ok(!film.src?.startsWith("/Users/"));
});

test("lookbook prefers organizer items then gallery, with bundled atelier stills as fallback", () => {
  const house = FEMMORA_HOUSE_DEFAULTS;
  assert.equal(resolveFashionLookbook({ house, galleryUrls: [], media: [] }).length, 3);
  assert.match(resolveFashionLookbook({ house, galleryUrls: [], media: [] })[0]?.url ?? "", /^\/templates\/femmora\//);
  const fromGallery = resolveFashionLookbook({
    house: { ...house, lookbookItems: [] },
    galleryUrls: ["https://images.example.com/a.jpg", "https://images.example.com/b.jpg"],
  });
  assert.equal(fromGallery.length, 2);
  assert.equal(fromGallery[0]?.caption, "Look 01");
});

test("gesture arming rejects input until armed", () => {
  assert.equal(isPointerArmSafe(false), false);
  assert.equal(isPointerArmSafe(true), true);
  assert.ok(FASHION_GESTURE_ARM_MS >= 400);
});

test("catalogue SKU and opening copy are registered", () => {
  const template = getCatalogTemplate("femmora-flagship-soft-opening");
  assert.ok(template);
  assert.equal(template?.layoutSlug, "luxury-fashion-flagship");
  assert.equal(template?.category, "Lunch");
  assert.equal(template?.experienceOverrides?.openingExperience, "luxury-fashion-flagship");
  const copy = previewTapLabelForOpening("luxury-fashion-flagship");
  assert.equal(copy.label, "Tap to open");
  assert.deepEqual(copy.steps, ["Envelope opens", "Invitation opens"]);
  const lunch = getCatalogTemplate("femmora-flagship-soft-opening");
  assert.equal(lunch?.category, "Lunch");
  assert.ok((lunch?.tags ?? []).includes("lunch"));
});

test("lunch catalogue browse lists the Femmora flagship invitation", () => {
  const lunch = filterCatalogTemplates({ category: "Lunch" });
  assert.ok(lunch.some((item) => item.slug === "femmora-flagship-soft-opening"));
  const browse = getBrowseCatalogTemplates();
  assert.ok(browse.some((item) => item.slug === "femmora-flagship-soft-opening" && item.category === "Lunch"));
});

test("default design carries Femmora fashionHouse DNA", () => {
  const design = getDefaultDesignConfig("femmora-flagship-soft-opening");
  assert.equal(design.layout, "luxury-fashion-flagship");
  assert.equal(design.experience?.openingExperience, "luxury-fashion-flagship");
  assert.equal(design.experience?.fashionHouse?.houseName, "FEMMORA");
  assert.equal(design.experience?.viralFooterEnabled, false);
  assert.equal(design.themeId, "femmora-champagne");
});

test("share, maps and calendar CTAs produce real destinations", () => {
  const event = {
    title: "Soft Opening",
    hostName: "FEMMORA",
    description: "Flagship unveiling",
    startDate: "29 August 2026",
    startDateRaw: FEMMORA_HOUSE_DEFAULTS.startAtIso,
    venueName: "FEMMORA GH",
    landmark: "Westlands",
    mapsLink: FEMMORA_MAPS_URL,
    contactPhone: null,
    dressCode: null,
  };
  const payload = buildInviteSharePayload({
    category: "wedding",
    event,
    uniqueLink: "preview-femmora-flagship",
    origin: "https://www.celeventic.com",
  });
  assert.equal(payload.url, "https://www.celeventic.com/invite/preview-femmora-flagship");
  const wa = buildInviteShareChannelHref("whatsapp", payload);
  assert.match(wa, /^https:\/\/wa\.me\/\?text=/);
  const cal = buildGoogleCalendarUrl({
    title: "FEMMORA Soft Opening",
    startDateRaw: FEMMORA_HOUSE_DEFAULTS.startAtIso,
    endDateRaw: FEMMORA_HOUSE_DEFAULTS.endAtIso,
    venue: "FEMMORA GH, Westlands",
  });
  assert.match(cal, /^https:\/\/calendar\.google\.com\//);
});

test("motion tokens stay editorial and silk drag requires a new gesture", () => {
  assert.equal(FASHION_MOTION.editorial, FASHION_GESTURE_ARM_MS);
  assert.ok(FASHION_WHISPER_MS >= 1200);
  assert.ok(FASHION_SILK_DRAG_PX >= 40);
  assert.ok(FASHION_MOTION.ceremonial > FASHION_MOTION.cinematic);
});

test("store stills are a browseable subset of the lookbook, not a second media system", () => {
  const stills = resolveFashionStoreStills({
    house: FEMMORA_HOUSE_DEFAULTS,
    galleryUrls: [],
  });
  assert.equal(stills.length, 3);
  assert.match(stills[0]?.id ?? "", /^atelier-/);
  const merged = mergeFashionHouse(FEMMORA_HOUSE_DEFAULTS, { houseName: "Atelier" });
  assert.equal(merged.whisperLine, FEMMORA_HOUSE_DEFAULTS.whisperLine);
  assert.equal(merged.hubLede, FEMMORA_HOUSE_DEFAULTS.hubLede);
  assert.equal(merged.filmUrl, FEMMORA_STORE_FILM);
});

test("layout engine defaults are generic, not Femmora", () => {
  const design = getDefaultDesignConfig("luxury-fashion-flagship");
  assert.equal(design.layout, "luxury-fashion-flagship");
  assert.equal(design.experience?.openingExperience, "luxury-fashion-flagship");
  assert.equal(design.experience?.fashionHouse?.houseName, "THE HOUSE");
  assert.equal(design.experience?.fashionHouse?.filmUrl, null);
  assert.equal(design.experience?.fashionHouse?.lookbookItems?.length, 0);
  assert.equal(design.themeId, undefined);
  const blob = JSON.stringify(design.experience?.fashionHouse).toLowerCase();
  assert.equal(blob.includes("femmora"), false);
  assert.equal(blob.includes("westlands"), false);
  assert.equal(blob.includes("/templates/femmora"), false);
});

test("Maison Vale fixture uses the same engine with zero Femmora DNA", () => {
  assert.deepEqual(assertHouseIsNotFemmora(MAISON_VALE_HOUSE), []);
  assert.equal(MAISON_VALE_HOUSE.whisperScript, "In darker gold");
  assert.equal(MAISON_VALE_HOUSE.experienceFlyerUrl ?? null, null);
  assert.equal(resolveFashionExperienceFlyer(MAISON_VALE_HOUSE), null);
  assert.equal(MAISON_VALE_HOUSE.address, "Kilimani");
  assert.equal(MAISON_VALE_HOUSE.silkStyle, "espresso-gold");
  assert.equal(MAISON_VALE_HOUSE.filmUrl, null);
  const house = resolveFashionHouse({
    layout: "luxury-fashion-flagship",
    colors: MAISON_VALE_COLORS,
    experience: { fashionHouse: MAISON_VALE_HOUSE },
  });
  const film = resolveFashionFilm({ house, media: [] });
  const looks = resolveFashionLookbook({ house, galleryUrls: [], media: [] });
  const chapters = resolveFashionChapters({
    house,
    filmSrc: film.src,
    looksCount: looks.length,
    enabledTabs: ["invitation", "gallery", "countdown", "venue", "rsvp"],
  });
  assert.equal(film.src, null);
  assert.equal(chapters["store-preview"], false);
  assert.equal(chapters.collection, true);
  assert.equal(looks.every((item) => !item.url.includes("/templates/femmora")), true);
  assert.deepEqual(assertHouseIsNotFemmora(house), []);
});

test("optional chapters hide when media or RSVP is absent", () => {
  const empty = mergeFashionHouse(LUXURY_FASHION_HOUSE_DEFAULTS, {
    lookbookItems: [],
    filmUrl: null,
    mapsUrl: "",
    chapters: { film: true, collection: true, rsvp: true, maps: true },
  });
  const looks = resolveFashionLookbook({ house: empty, galleryUrls: [], media: [] });
  const film = resolveFashionFilm({ house: empty, media: [] });
  const off = resolveFashionChapters({
    house: empty,
    filmSrc: film.src,
    looksCount: looks.length,
    enabledTabs: ["invitation", "gallery", "countdown", "venue"],
  });
  assert.equal(looks.length, 0);
  assert.equal(film.src, null);
  assert.equal(off["store-preview"], false);
  assert.equal(off.collection, false);
  assert.equal(off.rsvp, false);
  assert.equal(off.mapsCta, false);
  assert.equal(off.location, true);
});

test("experience DNA enrich keeps fashion house preset DNA", () => {
  const design = getDefaultDesignConfig("femmora-flagship-soft-opening");
  const enriched = enrichDesignWithExperienceDNA(design);
  assert.equal(enriched.experience?.fashionHouse?.houseName, "FEMMORA");
  assert.equal(enriched.experience?.fashionHouse?.filmUrl, FEMMORA_STORE_FILM);
  assert.equal(enriched.experience?.viralFooterEnabled, false);
  assert.match(enriched.colors.background, /^#F[0-9A-Fa-f]{5}$/);
  assert.equal(enriched.experience?.fashionHouse?.instagramHandle, "@femmora_gh");
  assert.equal(
    fashionTokenStyleFromColors({
      background: "linear-gradient(135deg, #1e293b, #0f172a)",
    })["--ff-ivory"],
    "#F7F1E8"
  );
});

test("Femmora social defaults to Instagram only and stays Studio-replaceable", () => {
  assert.equal(FEMMORA_HOUSE_DEFAULTS.showSocialSection, true);
  assert.equal(FEMMORA_HOUSE_DEFAULTS.instagramHandle, "@femmora_gh");
  assert.equal(FEMMORA_HOUSE_DEFAULTS.instagramUrl, "https://www.instagram.com/femmora_gh/");
  assert.equal(FEMMORA_HOUSE_DEFAULTS.socialLinks?.[0]?.platform, "instagram");
  assert.equal(FEMMORA_HOUSE_DEFAULTS.socialLinks?.[0]?.enabled, true);
  assert.match(FEMMORA_HOUSE_DEFAULTS.socialIntroText ?? "", /discover new arrivals/i);
  assert.equal(FEMMORA_HOUSE_DEFAULTS.socialTitle, "Follow Femmora");
  assert.equal(FEMMORA_HOUSE_DEFAULTS.showSocialIconsInFinale, true);
  const links = resolveFashionSocialLinks(FEMMORA_HOUSE_DEFAULTS);
  assert.equal(links.length, 1);
  assert.equal(links[0]?.platform, "instagram");
  assert.equal(links[0]?.url, "https://www.instagram.com/femmora_gh/");
  assert.equal(displayFashionSocialHandle(links[0]?.handle), "@femmora_gh");
  assert.equal(socialLinkHasDestination(links[0]!), true);
  const chapters = resolveFashionChapters({
    house: FEMMORA_HOUSE_DEFAULTS,
    filmSrc: FEMMORA_STORE_FILM,
    looksCount: 3,
    enabledTabs: ["invitation", "gallery", "countdown", "venue", "rsvp"],
  });
  assert.equal(chapters.social, true);
  const hidden = resolveFashionChapters({
    house: { ...FEMMORA_HOUSE_DEFAULTS, showSocialSection: false },
    filmSrc: FEMMORA_STORE_FILM,
    looksCount: 3,
  });
  assert.equal(hidden.social, false);
  const handleOnly = resolveFashionSocialLinks({
    ...FEMMORA_HOUSE_DEFAULTS,
    socialLinks: [{ platform: "instagram", handle: "@atelier_x", enabled: true }],
  });
  assert.equal(handleOnly[0]?.displayHandle, "@atelier_x");
  assert.equal(socialLinkHasDestination(handleOnly[0]!), false);
  const withTikTok = resolveFashionSocialLinks({
    ...FEMMORA_HOUSE_DEFAULTS,
    socialLinks: [
      ...(FEMMORA_HOUSE_DEFAULTS.socialLinks ?? []),
      { platform: "tiktok", url: "https://www.tiktok.com/@atelier", enabled: true },
    ],
  });
  assert.equal(withTikTok.map((link) => link.platform).join(","), "instagram,tiktok");
});

test("generic and Vale houses do not inherit Femmora Instagram", () => {
  assert.equal(LUXURY_FASHION_HOUSE_DEFAULTS.showSocialSection, false);
  assert.equal(resolveFashionSocialLinks(LUXURY_FASHION_HOUSE_DEFAULTS).length, 0);
  const valeChapters = resolveFashionChapters({
    house: MAISON_VALE_HOUSE,
    filmSrc: null,
    looksCount: 2,
    enabledTabs: ["invitation", "gallery", "countdown", "venue", "rsvp"],
  });
  assert.equal(valeChapters.social, false);
  assert.equal(resolveFashionSocialLinks(MAISON_VALE_HOUSE).length, 0);
});

test("Femmora uses card-envelope while Vale stays silk-only without envelope teaser video", () => {
  assert.equal(resolveFashionOpeningStyle(FEMMORA_HOUSE_DEFAULTS), "card-envelope");
  assert.equal(resolveFashionOpeningStyle(MAISON_VALE_HOUSE), "silk-only");
  assert.equal(resolveFashionOpeningStyle(LUXURY_FASHION_HOUSE_DEFAULTS), "card-envelope");
  assert.equal(resolveFashionOpeningStyle({ ...FEMMORA_HOUSE_DEFAULTS, openingStyle: "folio-silk" }), "card-envelope");
  const teaser = resolveFashionTeaser();
  assert.equal(teaser.src, null);
  assert.equal(teaser.poster, null);
  assert.ok(FEMMORA_HOUSE_DEFAULTS.flyerCardUrl);
  assert.equal(MAISON_VALE_HOUSE.flyerCardUrl ?? null, null);
});

test("Maison Vale can replace Instagram through house DNA without code changes", () => {
  const valeSocial = mergeFashionHouse(MAISON_VALE_HOUSE, {
    showSocialSection: true,
    showSocialIconsInFinale: true,
    socialTitle: "Follow Maison Vale",
    socialLinks: [
      {
        platform: "instagram",
        handle: "@maisonvale",
        url: "https://www.instagram.com/maisonvale/",
        enabled: true,
      },
    ],
  });
  const leaks = assertHouseIsNotFemmora(valeSocial);
  assert.equal(leaks.length, 0);
  const links = resolveFashionSocialLinks(valeSocial);
  assert.equal(links.length, 1);
  assert.equal(links[0]?.displayHandle, "@maisonvale");
  assert.equal(links[0]?.url, "https://www.instagram.com/maisonvale/");
  assert.notEqual(links[0]?.url, FEMMORA_HOUSE_DEFAULTS.instagramUrl);
  const chapters = resolveFashionChapters({
    house: valeSocial,
    filmSrc: null,
    looksCount: 2,
  });
  assert.equal(chapters.social, true);
});

test("Femmora flagship default music is licensed cinematic ambient, not Atelier Quiet", () => {
  const layout = getLayoutMusicProfile("luxury-fashion-flagship");
  assert.equal(layout.bundledFile, "ambient-cinematic");
  assert.equal(layout.title, "Flagship Cinematic");
  assert.notEqual(layout.title, "Atelier Quiet");
  const catalog = getCatalogMusicProfile("femmora-flagship-soft-opening");
  assert.ok(catalog);
  assert.equal(catalog?.bundledFile, "ambient-cinematic");
  assert.equal(catalog?.title, "Femmora Flagship Score");
  assert.notEqual(catalog?.title, "Femmora Atelier Quiet");
  const design = getDefaultDesignConfig("femmora-flagship-soft-opening");
  const resolved = resolveInvitationMusic({
    design,
    catalogSlug: "femmora-flagship-soft-opening",
  });
  assert.equal(resolved.hasMusic, true);
  assert.equal(resolved.musicSelection?.title, "Femmora Flagship Score");
  assert.match(resolved.musicSelection?.url ?? "", /ambient-cinematic/);
  assert.equal(resolved.musicSelection?.autoPlay, true);
  const preview = buildLivePreviewProps("luxury-fashion-flagship", "Lunch", {
    catalogSlug: "femmora-flagship-soft-opening",
    features: ["Music"],
    musicEnabled: true,
  });
  assert.equal(preview.musicSelection?.title, "Femmora Flagship Score");
  assert.match(preview.musicSelection?.url ?? "", /ambient-cinematic/);
  const lunchJazz = buildLivePreviewProps("classic-gold", "Lunch", { musicEnabled: true });
  assert.notEqual(lunchJazz.musicSelection?.title, "Femmora Flagship Score");
});
