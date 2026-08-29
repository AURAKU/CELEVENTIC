/**
 * Femmora catalogue preset — default template DNA for the first luxury-fashion SKU.
 * Organizers replace these values in Studio. Reusable components must not import this
 * as the engine fallback.
 */

import type { FashionLookbookItem, LuxuryFashionHouseConfig } from "./types";
import { LUXURY_FASHION_HOUSE_DEFAULTS, mergeFashionHouse } from "./house-defaults";

/** 29 Aug 2026 09:00 Africa/Nairobi — 30 Aug 2026 20:00. */
export const FEMMORA_START_ISO = "2026-08-29T09:00:00+03:00";
export const FEMMORA_END_ISO = "2026-08-30T20:00:00+03:00";

export const FEMMORA_MAPS_URL =
  "https://www.google.com/maps/search/?api=1&query=Femmora%20GH%20Westlands";

/** Invitation flyer artwork — card face and ENTER EXPERIENCE, never hub wallpaper. */
export const FEMMORA_SILK_BED = "/templates/femmora/silk-bed.jpg";
export const FEMMORA_INVITATION_FLYER = "/templates/femmora/invitation-flyer.jpg";
export const FEMMORA_FLYER_CARD = FEMMORA_INVITATION_FLYER;
export const FEMMORA_LOGO_MARK = "/templates/femmora/logo-mark.png";
/** WhatsApp / iMessage / Snapchat link preview — physical card on silk, never hub wallpaper. */
export const FEMMORA_SHARE_PLACECARD = "/templates/femmora/share-placecard.jpg";
export const FEMMORA_SHARE_PLACECARD_WIDTH = 1600;
export const FEMMORA_SHARE_PLACECARD_HEIGHT = 1234;
/** Invitation bed — Adrian Berenguer, The Beauty. Femmora SKU only. */
export const FEMMORA_INVITE_MUSIC = "/templates/femmora/the-beauty.mp3";
export const FEMMORA_INVITE_MUSIC_DURATION_SEC = 137.52;
export const FEMMORA_STORE_FILM = "/templates/femmora/store-preview.mp4";
export const FEMMORA_STORE_POSTER = "/templates/femmora/store-poster.jpg";
export const FEMMORA_INSTAGRAM_HANDLE = "@femmora_gh";
export const FEMMORA_INSTAGRAM_URL = "https://www.instagram.com/femmora_gh/";
export const FEMMORA_TIKTOK_HANDLE = "@femmora.woman";
export const FEMMORA_TIKTOK_URL = "https://www.tiktok.com/@femmora.woman";

export const FEMMORA_DEFAULT_LOOKS: FashionLookbookItem[] = [
  {
    id: "femmora-look-crystal-knit",
    url: "/templates/femmora/look-crystal-knit.jpg",
    type: "image",
    caption: "Crystal knit",
    collectionName: "The Collection",
  },
  {
    id: "femmora-look-floral-mini",
    url: "/templates/femmora/look-floral-mini.jpg",
    type: "image",
    caption: "Floral mini",
    collectionName: "The Collection",
  },
  {
    id: "femmora-look-pearl-gown",
    url: "/templates/femmora/look-pearl-gown.jpg",
    type: "image",
    caption: "Pearl gown",
    collectionName: "The Collection",
  },
];

export const FEMMORA_HOUSE_DEFAULTS: LuxuryFashionHouseConfig = mergeFashionHouse(
  LUXURY_FASHION_HOUSE_DEFAULTS,
  {
    houseName: "FEMMORA",
    monogram: "F",
    eventTitle: "Soft Opening",
    unveilingLabel: "TAP TO OPEN",
    whisperLine: "A private first look",
    whisperEyebrow: "FEMMORA",
    whisperScript: "Soft Opening",
    hubLede: "",
    portalWelcome: "STEP INSIDE FEMMORA",
    portalPrompt: "The house is waiting",
    rsvpHeading: "Will we see you at Femmora?",
    finaleKicker: "Exclusive invitation",
    finaleMessage: "We can't wait to welcome you",
    hoursLabel: "9 AM TO 8 PM EACH DAY",
    datesLabel: "29TH & 30TH AUGUST",
    locationName: "FEMMORA GH",
    address: "Westlands",
    mapsUrl: FEMMORA_MAPS_URL,
    openingStyle: "card-envelope",
    envelopeFaceLine: "PRIVATE INVITATION",
    folioFaceLine: "PRIVATE INVITATION",
    cardCtaLabel: "OPEN",
    teaserPlaceLine: "WESTLANDS",
    teaserDateLine: "29 — 30 AUGUST",
    teaserClipUrl: null,
    teaserPosterUrl: null,
    mapsCtaLabel: "View on Google Maps",
    countdownBeforeLabel: "The doors open in",
    countdownAfterLabel: "The doors are open",
    countdownEndedLabel: "Femmora is now open",
    replayUnveilingLabel: "Replay the unveiling",
    filmChapterTitle: "The first look",
    filmChapterLede: "Experience Femmora",
    wishesTitle: "Compliments and guest wishes to the host of Femmora",
    wishesEmpty: "A quiet boutique — be the first to compliment this opening.",
    markVariant: "letter",
    logoUrl: FEMMORA_LOGO_MARK,
    shareOgImageUrl: FEMMORA_SHARE_PLACECARD,
    lookbookKicker: "First looks",
    lookbookItems: FEMMORA_DEFAULT_LOOKS,
    silkBedUrl: null,
    flyerCardUrl: FEMMORA_FLYER_CARD,
    visionStoreEnabled: true,
    visionStoreKicker: "Online vision store",
    visionStoreTitle: "The house, wherever you are",
    visionStoreLine: "Our Bespoke digital store is on its way, shop the collection from anywhere.",
    visionStoreDeliveryLine: "Nationwide delivery",
    visionStoreSoonLabel: "Opening",
    startAtIso: FEMMORA_START_ISO,
    endAtIso: FEMMORA_END_ISO,
    filmUrl: FEMMORA_STORE_FILM,
    filmPosterUrl: FEMMORA_STORE_POSTER,
    visitDayOptions: [
      { id: "29", label: "29 August" },
      { id: "30", label: "30 August" },
      { id: "BOTH", label: "Both" },
    ],
    showSocialSection: true,
    instagramHandle: FEMMORA_INSTAGRAM_HANDLE,
    instagramUrl: FEMMORA_INSTAGRAM_URL,
    tiktokHandle: FEMMORA_TIKTOK_HANDLE,
    tiktokUrl: FEMMORA_TIKTOK_URL,
    socialIntroText: "Discover new arrivals, behind-the-scenes moments, and more from the world of Femmora.",
    socialTitle: "Follow Femmora",
    socialCtaLabel: "Follow on Instagram",
    showSocialIconsInFinale: true,
    socialLinks: [
      {
        platform: "instagram",
        handle: FEMMORA_INSTAGRAM_HANDLE,
        url: FEMMORA_INSTAGRAM_URL,
        enabled: true,
      },
      {
        platform: "tiktok",
        handle: FEMMORA_TIKTOK_HANDLE,
        url: FEMMORA_TIKTOK_URL,
        enabled: true,
      },
    ],
  }
);

export const LUXURY_FASHION_LAYOUT_SLUG = "luxury-fashion-flagship" as const;
export const FEMMORA_CATALOG_SLUG = "femmora-flagship-soft-opening" as const;
export const LUXURY_FASHION_OPENING_ID = "luxury-fashion-flagship" as const;
