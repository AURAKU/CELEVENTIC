import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  FASHION_GESTURE_ARM_MS,
  FASHION_MOTION,
  FASHION_SILK_DRAG_PX,
  FASHION_WHISPER_MS,
  FEMMORA_HOUSE_DEFAULTS,
  FEMMORA_INVITE_MUSIC,
  FEMMORA_INVITE_MUSIC_DURATION_SEC,
  FEMMORA_LOGO_MARK,
  FEMMORA_MAPS_URL,
  FEMMORA_STORE_FILM,
  FEMMORA_STORE_POSTER,
  LUXURY_FASHION_HOUSE_DEFAULTS,
  MAISON_VALE_COLORS,
  MAISON_VALE_HOUSE,
  assertHouseIsNotFemmora,
  displayFashionSocialHandle,
  fashionHouseLogoSrc,
  fashionHouseNameplate,
  fashionTokenStyleFromColors,
  mergeFashionHouse,
  resolveFashionChapters,
  resolveFashionFilm,
  resolveFashionFlyerCard,
  resolveFashionHouse,
  resolveFashionLede,
  resolveFashionLookbook,
  resolveFashionOpeningStyle,
  resolveFashionSocialLinks,
  resolveFashionStoreStills,
  resolveFashionTeaser,
  resolveFashionVisionStore,
  socialLinkHasDestination,
} from "@/lib/experience/luxury-fashion";
import { isPointerArmSafe } from "@/lib/experience/luxury-fashion/gesture-arming";
import { previewTapLabelForOpening } from "@/lib/experience/opening-experiences";
import { getCatalogTemplate, getBrowseCatalogTemplates, filterCatalogTemplates } from "@/lib/invitation-mvp/catalogue";
import { getDefaultDesignConfig } from "@/lib/invitation-templates";
import { getCatalogMusicProfile } from "@/lib/invitation/catalog-music-identity";
import { getLayoutMusicProfile } from "@/lib/invitation/layout-music-identity";
import { resolveInvitationMusic } from "@/lib/music/resolve-invitation-music";
import { enrichDesignWithExperienceDNA } from "@/lib/experience/experience-engine-v2";
import { buildDirectionsUrl, normalizeExternalHref } from "@/lib/invitation/maps-utils";
import { buildInviteShareChannelHref, buildInviteSharePayload } from "@/lib/invitation/invite-share";
import { buildGoogleCalendarUrl, toMapsEmbedUrl } from "@/lib/invitation/calendar-utils";

test("Femmora house DNA keeps Westlands copy and a live maps search URL", () => {
  assert.equal(FEMMORA_HOUSE_DEFAULTS.houseName, "FEMMORA");
  assert.equal(FEMMORA_HOUSE_DEFAULTS.locationName, "FEMMORA GH");
  assert.equal(FEMMORA_HOUSE_DEFAULTS.address, "Westlands");
  assert.equal(FEMMORA_HOUSE_DEFAULTS.hoursLabel, "9 AM TO 8 PM EACH DAY");
  assert.equal(FEMMORA_HOUSE_DEFAULTS.datesLabel, "29TH & 30TH AUGUST");
  assert.equal(FEMMORA_HOUSE_DEFAULTS.whisperLine, "A private first look");
  assert.equal(FEMMORA_HOUSE_DEFAULTS.whisperEyebrow, "FEMMORA");
  assert.equal(FEMMORA_HOUSE_DEFAULTS.whisperScript, "Soft Opening");
  assert.equal(FEMMORA_HOUSE_DEFAULTS.hubLede, "");
  assert.equal(resolveFashionLede(FEMMORA_HOUSE_DEFAULTS), "");
  assert.equal(resolveFashionLede(LUXURY_FASHION_HOUSE_DEFAULTS), "");
  assert.equal(resolveFashionLede(MAISON_VALE_HOUSE), "An invitation to the Vale collection launch.");
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

test("guest-wishes nameplate and crest stay house-owned, never a shared Femmora fallback", () => {
  assert.equal(fashionHouseNameplate("Femmora"), "FEMMORA");
  assert.equal(fashionHouseNameplate("Maison Vale"), "MAISON VALE");
  assert.equal(fashionHouseNameplate(null), "THE HOUSE");
  assert.equal(fashionHouseLogoSrc(FEMMORA_HOUSE_DEFAULTS), FEMMORA_LOGO_MARK);
  assert.equal(fashionHouseLogoSrc(FEMMORA_LOGO_MARK, "FEMMORA"), FEMMORA_LOGO_MARK);
  assert.equal(fashionHouseLogoSrc(MAISON_VALE_HOUSE), null);
  assert.equal(fashionHouseLogoSrc(FEMMORA_LOGO_MARK, "MAISON VALE"), null);
  assert.equal(fashionHouseLogoSrc({ logoUrl: FEMMORA_LOGO_MARK, houseName: "Maison Vale" }), null);
  assert.equal(fashionHouseLogoSrc({ logoUrl: "", houseName: "FEMMORA" }), null);

  const wishesSrc = readFileSync("src/components/guest-portal/guest-wishes-card.tsx", "utf8");
  assert.match(wishesSrc, /fashionHouse\?\.wishesEmpty/);
  assert.match(wishesSrc, /The atelier is still quiet — leave the first compliment/);
  assert.match(wishesSrc, /kicker: fashionHouseNameplate\(resolvedHouseName\)/);
  assert.match(wishesSrc, /fashionHouse\?\.wishesTitle/);
  assert.match(wishesSrc, /Your note is now visible to every guest/);
  assert.match(wishesSrc, /setInterval\(refresh, 8000\)/);
  assert.match(wishesSrc, /link: inviteLink \|\| undefined/);
  assert.doesNotMatch(wishesSrc, /Compliments to the House/);
  assert.doesNotMatch(wishesSrc, /Leave a note for this opening/);
  assert.doesNotMatch(wishesSrc, /Notes the house approves/);
  assert.doesNotMatch(wishesSrc, /The house is waiting/);
  assert.doesNotMatch(wishesSrc, /THE SALON/);
  assert.doesNotMatch(wishesSrc, /The salon is waiting/);
  assert.equal(
    FEMMORA_HOUSE_DEFAULTS.wishesTitle,
    "Compliments and guest wishes to the host of Femmora"
  );
  assert.equal(
    FEMMORA_HOUSE_DEFAULTS.wishesEmpty,
    "A quiet boutique — be the first to compliment this opening."
  );
  assert.equal(LUXURY_FASHION_HOUSE_DEFAULTS.wishesEmpty.includes("Femmora"), false);
  assert.equal(MAISON_VALE_HOUSE.wishesEmpty?.toLowerCase().includes("femmora"), false);
  assert.equal(LUXURY_FASHION_HOUSE_DEFAULTS.wishesTitle.includes("Femmora"), false);
  assert.equal(MAISON_VALE_HOUSE.wishesTitle?.toLowerCase().includes("femmora"), false);
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
  const fromStudioUpload = resolveFashionFilm({
    house,
    media: [
      {
        url: "http://localhost:3000/api/uploads/invitations/u1/store.mp4",
        type: "video",
        role: "hero",
        posterUrl: "http://127.0.0.1:3000/api/uploads/invitations/u1/poster.jpg",
      },
    ],
  });
  assert.equal(fromStudioUpload.src, "/uploads/invitations/u1/store.mp4");
  assert.equal(fromStudioUpload.poster, "/uploads/invitations/u1/poster.jpg");
});

test("lookbook prefers organizer items then gallery, with bundled atelier stills as fallback", () => {
  const house = FEMMORA_HOUSE_DEFAULTS;
  const bundled = resolveFashionLookbook({ house, galleryUrls: [], media: [] });
  assert.equal(bundled.length, 3);
  assert.deepEqual(
    bundled.map((item) => item.url),
    [
      "/templates/femmora/look-crystal-knit.jpg",
      "/templates/femmora/look-floral-mini.jpg",
      "/templates/femmora/look-pearl-gown.jpg",
    ]
  );
  assert.equal(new Set(bundled.map((item) => item.url)).size, 3);
  assert.equal(house.lookbookKicker, "First looks");
  assert.equal(house.lookbookTitle, "The Collection");
  const fromGallery = resolveFashionLookbook({
    house: { ...house, lookbookItems: [] },
    galleryUrls: ["https://images.example.com/a.jpg", "https://images.example.com/b.jpg"],
  });
  assert.equal(fromGallery.length, 2);
  assert.equal(fromGallery[0]?.caption, "Look 01");
  const organizerGalleryWins = resolveFashionLookbook({
    house,
    galleryUrls: ["https://cdn.example.com/look-new.jpg"],
  });
  assert.equal(organizerGalleryWins.length, 1);
  assert.equal(organizerGalleryWins[0]?.url, "https://cdn.example.com/look-new.jpg");
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

test("Femmora invitation bed is The Beauty and Vale does not inherit it", () => {
  const profile = getCatalogMusicProfile("femmora-flagship-soft-opening");
  assert.equal(profile?.title, "The Beauty");
  assert.equal(profile?.url, FEMMORA_INVITE_MUSIC);
  assert.equal(profile?.endSec, FEMMORA_INVITE_MUSIC_DURATION_SEC);
  const design = getDefaultDesignConfig("femmora-flagship-soft-opening");
  const resolved = resolveInvitationMusic({
    design,
    catalogSlug: "femmora-flagship-soft-opening",
  });
  assert.equal(resolved.musicSelection?.url, FEMMORA_INVITE_MUSIC);
  assert.equal(resolved.musicSelection?.title, "The Beauty");
  assert.match(resolved.musicSelection?.url ?? "", /\/templates\/femmora\/the-beauty\.mp3$/);
  const valeLayout = getLayoutMusicProfile("luxury-fashion-flagship");
  assert.notEqual(valeLayout.url ?? `/music/${valeLayout.bundledFile}.mp3`, FEMMORA_INVITE_MUSIC);
  assert.notEqual(valeLayout.title, "The Beauty");
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
  assert.equal(
    normalizeExternalHref("www.google.com/maps/search/?api=1&query=Westlands"),
    "https://www.google.com/maps/search/?api=1&query=Westlands"
  );
  assert.equal(
    normalizeExternalHref("//www.google.com/maps/search/?api=1&query=Westlands"),
    "https://www.google.com/maps/search/?api=1&query=Westlands"
  );
  const mapsPreview = readFileSync(
    "src/components/invitation/templates/luxury-fashion/fashion-maps-preview.tsx",
    "utf8"
  );
  assert.match(mapsPreview, /mapsPreviewHit/);
  assert.match(mapsPreview, /rel="noopener noreferrer"/);
  assert.equal(/<a[\s\S]*<iframe/.test(mapsPreview), false);
  const shareScene = readFileSync(
    "src/components/invitation/templates/luxury-fashion/fashion-share-scene.tsx",
    "utf8"
  );
  assert.match(shareScene, />Share</);
  assert.equal(/WhatsApp/.test(shareScene), false);
  assert.equal(FEMMORA_HOUSE_DEFAULTS.visionStoreLine.includes("digital store"), true);
  assert.equal(FEMMORA_HOUSE_DEFAULTS.visionStoreLine.includes("salon"), false);
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
  assert.equal(design.experience?.fashionHouse?.whisperScript, "Flagship Opening");
  assert.notEqual(design.experience?.fashionHouse?.whisperScript, "Soft Opening");
  assert.equal(design.experience?.fashionHouse?.filmUrl, null);
  assert.equal(design.experience?.fashionHouse?.lookbookItems?.length, 0);
  assert.equal(design.themeId, undefined);
  const blob = JSON.stringify(design.experience?.fashionHouse).toLowerCase();
  assert.equal(blob.includes("femmora"), false);
  assert.equal(blob.includes("westlands"), false);
  assert.equal(blob.includes("soft opening"), false);
  assert.equal(blob.includes("/templates/femmora"), false);
});

test("Maison Vale fixture uses the same engine with zero Femmora DNA", () => {
  assert.deepEqual(assertHouseIsNotFemmora(MAISON_VALE_HOUSE), []);
  assert.equal(MAISON_VALE_HOUSE.houseName, "MAISON VALE");
  assert.equal(MAISON_VALE_HOUSE.whisperEyebrow, "THE NIGHT OPENS");
  assert.equal(MAISON_VALE_HOUSE.whisperScript, "In darker gold");
  assert.notEqual(MAISON_VALE_HOUSE.whisperScript, "Soft Opening");
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
  assert.equal(enriched.experience?.fashionHouse?.tiktokHandle, "@femmora.woman");
  assert.equal(
    fashionTokenStyleFromColors({
      background: "linear-gradient(135deg, #1e293b, #0f172a)",
    })["--ff-ivory"],
    "#F7F1E8"
  );
});

test("Femmora social defaults to Instagram and TikTok and stays Studio-replaceable", () => {
  assert.equal(FEMMORA_HOUSE_DEFAULTS.showSocialSection, true);
  assert.equal(FEMMORA_HOUSE_DEFAULTS.instagramHandle, "@femmora_gh");
  assert.equal(FEMMORA_HOUSE_DEFAULTS.instagramUrl, "https://www.instagram.com/femmora_gh/");
  assert.equal(FEMMORA_HOUSE_DEFAULTS.tiktokHandle, "@femmora.woman");
  assert.equal(FEMMORA_HOUSE_DEFAULTS.tiktokUrl, "https://www.tiktok.com/@femmora.woman");
  assert.equal(FEMMORA_HOUSE_DEFAULTS.socialLinks?.[0]?.platform, "instagram");
  assert.equal(FEMMORA_HOUSE_DEFAULTS.socialLinks?.[0]?.enabled, true);
  assert.equal(FEMMORA_HOUSE_DEFAULTS.socialLinks?.[1]?.platform, "tiktok");
  assert.equal(FEMMORA_HOUSE_DEFAULTS.socialLinks?.[1]?.enabled, true);
  assert.match(FEMMORA_HOUSE_DEFAULTS.socialIntroText ?? "", /discover new arrivals/i);
  assert.equal(FEMMORA_HOUSE_DEFAULTS.socialTitle, "Follow Femmora");
  assert.equal(FEMMORA_HOUSE_DEFAULTS.showSocialIconsInFinale, true);
  const links = resolveFashionSocialLinks(FEMMORA_HOUSE_DEFAULTS);
  assert.equal(links.length, 2);
  assert.equal(links[0]?.platform, "instagram");
  assert.equal(links[0]?.url, "https://www.instagram.com/femmora_gh/");
  assert.equal(displayFashionSocialHandle(links[0]?.handle), "@femmora_gh");
  assert.equal(socialLinkHasDestination(links[0]!), true);
  assert.equal(links[1]?.platform, "tiktok");
  assert.equal(links[1]?.url, "https://www.tiktok.com/@femmora.woman");
  assert.equal(displayFashionSocialHandle(links[1]?.handle), "@femmora.woman");
  assert.equal(socialLinkHasDestination(links[1]!), true);
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
  const studioOverride = resolveFashionSocialLinks({
    ...FEMMORA_HOUSE_DEFAULTS,
    socialLinks: [
      {
        platform: "instagram",
        handle: "@atelier_x",
        url: "https://www.instagram.com/atelier_x/",
        enabled: true,
      },
      {
        platform: "tiktok",
        handle: "@atelier.x",
        url: "https://www.tiktok.com/@atelier.x",
        enabled: true,
      },
    ],
  });
  assert.equal(studioOverride.map((link) => link.platform).join(","), "instagram,tiktok");
  assert.equal(studioOverride[1]?.displayHandle, "@atelier.x");
  assert.notEqual(studioOverride[1]?.url, FEMMORA_HOUSE_DEFAULTS.tiktokUrl);
  const withYouTube = resolveFashionSocialLinks({
    ...FEMMORA_HOUSE_DEFAULTS,
    socialLinks: [
      ...(FEMMORA_HOUSE_DEFAULTS.socialLinks ?? []),
      { platform: "youtube", url: "https://www.youtube.com/@atelier", enabled: true },
    ],
  });
  assert.equal(withYouTube.map((link) => link.platform).join(","), "instagram,tiktok,youtube");
});

test("generic and Vale houses do not inherit Femmora Instagram or TikTok", () => {
  assert.equal(LUXURY_FASHION_HOUSE_DEFAULTS.showSocialSection, false);
  assert.equal(resolveFashionSocialLinks(LUXURY_FASHION_HOUSE_DEFAULTS).length, 0);
  assert.equal(LUXURY_FASHION_HOUSE_DEFAULTS.tiktokHandle, "");
  assert.equal(LUXURY_FASHION_HOUSE_DEFAULTS.tiktokUrl, "");
  const valeChapters = resolveFashionChapters({
    house: MAISON_VALE_HOUSE,
    filmSrc: null,
    looksCount: 2,
    enabledTabs: ["invitation", "gallery", "countdown", "venue", "rsvp"],
  });
  assert.equal(valeChapters.social, false);
  assert.equal(resolveFashionSocialLinks(MAISON_VALE_HOUSE).length, 0);
  assert.equal(MAISON_VALE_HOUSE.instagramHandle, "");
  assert.equal(MAISON_VALE_HOUSE.tiktokHandle, "");
  const valeBlob = JSON.stringify(MAISON_VALE_HOUSE);
  assert.equal(valeBlob.includes("femmora_gh"), false);
  assert.equal(valeBlob.includes("femmora.woman"), false);
  const fromScalars = resolveFashionSocialLinks({
    ...LUXURY_FASHION_HOUSE_DEFAULTS,
    socialLinks: [],
    instagramHandle: "@atelier",
    instagramUrl: "https://www.instagram.com/atelier/",
    tiktokHandle: "@atelier.tt",
    tiktokUrl: "https://www.tiktok.com/@atelier.tt",
  });
  assert.equal(fromScalars.map((link) => link.platform).join(","), "instagram,tiktok");
  assert.equal(fromScalars[1]?.url, "https://www.tiktok.com/@atelier.tt");
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

test("fashion RSVP keeps name only — optional email and phone stay off the card", () => {
  const rsvp = readFileSync(
    "src/components/invitation/templates/luxury-fashion/fashion-rsvp-scene.tsx",
    "utf8"
  );
  assert.match(rsvp, /showEmail=\{false\}/);
  assert.match(rsvp, /showPhone=\{false\}/);
});

test("fashion cover masthead is centered for every viewport", () => {
  const css = readFileSync(
    "src/components/invitation/templates/luxury-fashion/luxury-fashion-flagship.module.css",
    "utf8"
  );
  assert.match(css, /\.masthead[\s\S]*?justify-items:\s*center/);
  assert.match(css, /\.masthead[\s\S]*?text-align:\s*center/);
  assert.match(css, /\.campaignGrid[\s\S]*?margin:\s*0 auto/);
  assert.match(css, /\.campaignHouse[\s\S]*?white-space:\s*nowrap/);
  assert.match(css, /\.boutiqueGrid[\s\S]*?flex-wrap:\s*nowrap/);
  assert.match(css, /\.mapsPreviewCompact[\s\S]*?max-width:\s*min\(100%, 40rem\)/);
});

test("presented card can receive OPEN — flap and overlay do not trap the guest", () => {
  const css = readFileSync(
    "src/components/experience/luxury-fashion/luxury-fashion-opening.module.css",
    "utf8"
  );
  assert.match(css, /\.envelopeFlap[\s\S]*?pointer-events:\s*none/);
  assert.match(css, /\.cardHit[\s\S]*?z-index:\s*12/);
  const opening = readFileSync(
    "src/components/experience/luxury-fashion/luxury-fashion-opening-experience.tsx",
    "utf8"
  );
  assert.match(opening, /fashion-card-stage/);
  assert.match(opening, /forceUnlockRevealScroll/);
});

test("ENTER EXPERIENCE shows the invitation card and a motion iPhone vision store for Femmora only", () => {
  assert.equal(FEMMORA_HOUSE_DEFAULTS.visionStoreEnabled, true);
  assert.equal(LUXURY_FASHION_HOUSE_DEFAULTS.visionStoreEnabled, false);
  assert.equal(MAISON_VALE_HOUSE.visionStoreEnabled, false);
  assert.equal(resolveFashionVisionStore(FEMMORA_HOUSE_DEFAULTS), true);
  assert.equal(resolveFashionVisionStore(MAISON_VALE_HOUSE), false);
  assert.equal(resolveFashionFlyerCard(FEMMORA_HOUSE_DEFAULTS), FEMMORA_HOUSE_DEFAULTS.flyerCardUrl);
  assert.equal(resolveFashionFlyerCard(MAISON_VALE_HOUSE), null);
  assert.equal(
    resolveFashionFlyerCard({
      ...MAISON_VALE_HOUSE,
      flyerCardUrl: FEMMORA_HOUSE_DEFAULTS.flyerCardUrl,
    }),
    null
  );
  assert.equal(assertHouseIsNotFemmora(MAISON_VALE_HOUSE).length, 0);
  const boutique = readFileSync(
    "src/components/invitation/templates/luxury-fashion/fashion-boutique-experience.tsx",
    "utf8"
  );
  assert.match(boutique, /fashion-boutique-invitation/);
  assert.match(boutique, /FashionVisionStore/);
  assert.equal(/Femmora|@femmora/i.test(boutique), false);
  const phone = readFileSync(
    "src/components/invitation/templates/luxury-fashion/fashion-vision-store.tsx",
    "utf8"
  );
  assert.match(phone, /fashion-vision-store/);
  assert.match(phone, /isFashionStill/);
  assert.equal(/Femmora|@femmora/i.test(phone), false);
  const motion = readFileSync(
    "src/components/invitation/templates/luxury-fashion/fashion-vision-store.module.css",
    "utf8"
  );
  assert.match(motion, /@keyframes phoneFloat/);
  assert.match(motion, /@keyframes marquee/);
  assert.match(motion, /@keyframes islandAnnounce/);
  assert.match(motion, /Nationwide delivery|deliveryCopy/);
});

test("store preview plays from the first frame to ended and never auto-pauses offscreen", () => {
  const film = readFileSync(
    "src/components/invitation/templates/luxury-fashion/fashion-film-scene.tsx",
    "utf8"
  );
  assert.match(film, /fromStart:\s*true/);
  assert.match(film, /el\.currentTime = 0/);
  assert.match(film, /addEventListener\("ended"/);
  assert.equal(film.includes("IntersectionObserver"), false);
  assert.equal(/\sloop[\s=]/.test(film), false);
  const flagship = readFileSync(
    "src/components/invitation/templates/luxury-fashion-flagship.tsx",
    "utf8"
  );
  assert.equal(flagship.includes("filmRef.current?.play("), false);
});

test("Studio lets organizers upload store film, looks, and first-look copy for the live invitation", () => {
  const panel = readFileSync(
    "src/components/invitation-studio/fashion-house-studio-panel.tsx",
    "utf8"
  );
  assert.match(panel, /filmChapterTitle/);
  assert.match(panel, /wishesTitle/);
  assert.match(panel, /wishesEmpty/);
  assert.match(panel, /Upload store preview video/);
  assert.match(panel, /Upload invitation card/);
  assert.match(panel, /Collection looks/);
  assert.match(panel, /VideoUploader/);
  assert.match(panel, /ImageUploadCropper/);
  const hub = readFileSync("src/components/invitation-studio/invitation-studio-hub.tsx", "utf8");
  assert.match(hub, /orderId=\{orderId\}/);
  assert.match(hub, /onStoreFilm/);
  const media = readFileSync("src/lib/invitation/studio-media-utils.ts", "utf8");
  assert.match(media, /posterUrl: extras\?\.posterUrl/);
});
