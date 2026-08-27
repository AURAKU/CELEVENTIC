import test from "node:test";
import assert from "node:assert/strict";
import {
  FASHION_GESTURE_ARM_MS,
  FEMMORA_HOUSE_DEFAULTS,
  FEMMORA_MAPS_URL,
  mergeFashionHouse,
  resolveFashionFilm,
  resolveFashionHouse,
  resolveFashionLookbook,
} from "@/lib/experience/luxury-fashion";
import { isPointerArmSafe } from "@/lib/experience/luxury-fashion/gesture-arming";
import { previewTapLabelForOpening } from "@/lib/experience/opening-experiences";
import { getCatalogTemplate } from "@/lib/invitation-mvp/catalogue";
import { getDefaultDesignConfig } from "@/lib/invitation-templates";
import { buildDirectionsUrl } from "@/lib/invitation/maps-utils";
import { buildInviteShareChannelHref, buildInviteSharePayload } from "@/lib/invitation/invite-share";
import { buildGoogleCalendarUrl } from "@/lib/invitation/calendar-utils";

test("Femmora house DNA keeps Westlands copy and a live maps search URL", () => {
  assert.equal(FEMMORA_HOUSE_DEFAULTS.houseName, "FEMMORA");
  assert.equal(FEMMORA_HOUSE_DEFAULTS.locationName, "FEMMORA GH");
  assert.equal(FEMMORA_HOUSE_DEFAULTS.address, "Westlands");
  assert.equal(FEMMORA_HOUSE_DEFAULTS.hoursLabel, "9 AM TO 8 PM EACH DAY");
  assert.equal(FEMMORA_HOUSE_DEFAULTS.datesLabel, "29TH & 30TH AUGUST");
  assert.match(FEMMORA_MAPS_URL, /^https:\/\/www\.google\.com\/maps\/search\//);
  assert.ok(buildDirectionsUrl({ mapsLink: FEMMORA_MAPS_URL }));
});

test("fashion house merge prefers organizer overrides without dropping nav labels", () => {
  const next = mergeFashionHouse(FEMMORA_HOUSE_DEFAULTS, { houseName: "Maison Test", navLabels: [] });
  assert.equal(next.houseName, "Maison Test");
  assert.equal(next.navLabels.length, FEMMORA_HOUSE_DEFAULTS.navLabels.length);
});

test("store film resolves from hero video media, never a local filepath", () => {
  const house = resolveFashionHouse({
    layout: "luxury-fashion-flagship",
    colors: { primary: "#000", secondary: "#000", accent: "#000", background: "#fff", text: "#000" },
    experience: { fashionHouse: FEMMORA_HOUSE_DEFAULTS },
  });
  assert.equal(resolveFashionFilm({ house, media: [] }).src, null);
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

test("lookbook prefers organizer items then gallery, never a synchronous dump of empty media", () => {
  const house = FEMMORA_HOUSE_DEFAULTS;
  assert.deepEqual(resolveFashionLookbook({ house, galleryUrls: [], media: [] }), []);
  const fromGallery = resolveFashionLookbook({
    house,
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
  assert.equal(template?.category, "Corporate");
  assert.equal(template?.experienceOverrides?.openingExperience, "luxury-fashion-flagship");
  const copy = previewTapLabelForOpening("luxury-fashion-flagship");
  assert.equal(copy.label, "Tap to unveil the silk");
  assert.deepEqual(copy.steps, ["Silk parts", "House opens"]);
});

test("default design carries Femmora fashionHouse DNA", () => {
  const design = getDefaultDesignConfig("femmora-flagship-soft-opening");
  assert.equal(design.layout, "luxury-fashion-flagship");
  assert.equal(design.experience?.openingExperience, "luxury-fashion-flagship");
  assert.equal(design.experience?.fashionHouse?.houseName, "FEMMORA");
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
