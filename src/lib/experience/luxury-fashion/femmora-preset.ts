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
export const FEMMORA_STORE_FILM = "/templates/femmora/store-preview.mp4";
export const FEMMORA_STORE_POSTER = "/templates/femmora/store-poster.jpg";
export const FEMMORA_INSTAGRAM_HANDLE = "@femmora_gh";
export const FEMMORA_INSTAGRAM_URL = "https://www.instagram.com/femmora_gh/";

export const FEMMORA_DEFAULT_LOOKS: FashionLookbookItem[] = [
  {
    id: "femmora-look-01",
    url: "/templates/femmora/look-01.jpg",
    type: "image",
    caption: "Atelier 01",
    collectionName: "The Collection",
  },
  {
    id: "femmora-look-02",
    url: "/templates/femmora/look-02.jpg",
    type: "image",
    caption: "Atelier 02",
    collectionName: "The Collection",
  },
  {
    id: "femmora-look-03",
    url: "/templates/femmora/look-03.jpg",
    type: "image",
    caption: "Atelier 03",
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
    hubLede: "An invitation to experience the world of Femmora.",
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
    markVariant: "letter",
    logoUrl: FEMMORA_LOGO_MARK,
    lookbookItems: FEMMORA_DEFAULT_LOOKS,
    silkBedUrl: null,
    flyerCardUrl: FEMMORA_FLYER_CARD,
    experienceFlyerUrl: FEMMORA_INVITATION_FLYER,
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
    ],
  }
);

export const LUXURY_FASHION_LAYOUT_SLUG = "luxury-fashion-flagship" as const;
export const FEMMORA_CATALOG_SLUG = "femmora-flagship-soft-opening" as const;
export const LUXURY_FASHION_OPENING_ID = "luxury-fashion-flagship" as const;
