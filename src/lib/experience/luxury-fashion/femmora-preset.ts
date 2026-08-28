/**
 * Femmora house DNA — original Celeventic fashion identity.
 * Ivory / pearl / champagne / mocha. Not a reproduction of any fashion-house font.
 *
 * Bundled demo media lives in `public/templates/femmora/` (web H.264 + poster).
 * Organizers replace the film via Studio hero video + poster.
 */

import type { FashionLookbookItem, LuxuryFashionHouseConfig } from "./types";

/** 29 Aug 2026 09:00 Africa/Nairobi — 30 Aug 2026 20:00. */
export const FEMMORA_START_ISO = "2026-08-29T09:00:00+03:00";
export const FEMMORA_END_ISO = "2026-08-30T20:00:00+03:00";

export const FEMMORA_MAPS_URL =
  "https://www.google.com/maps/search/?api=1&query=Femmora%20GH%20Westlands";

export const FEMMORA_SILK_BED = "/templates/femmora/silk-bed.jpg";
export const FEMMORA_STORE_FILM = "/templates/femmora/store-preview.mp4";
export const FEMMORA_STORE_POSTER = "/templates/femmora/store-poster.jpg";

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

export const FEMMORA_HOUSE_DEFAULTS: LuxuryFashionHouseConfig = {
  houseName: "FEMMORA",
  monogram: "F",
  eventTitle: "Soft Opening",
  unveilingLabel: "Enter the Unveiling",
  teaserLine: "A quiet house. A first light.",
  whisperLine: "Something beautiful is about to open",
  hubLede: "An invitation to experience the world of Femmora.",
  swipeHint: "Swipe to explore",
  portalWelcome: "Welcome to Femmora",
  portalPrompt: "The doors are about to open",
  rsvpHeading: "Will we see you at Femmora?",
  rsvpAcceptedLabel: "Yes — I'll be there",
  finaleKicker: "A new chapter in style.",
  hoursLabel: "9 AM TO 8 PM EACH DAY",
  datesLabel: "29TH & 30TH AUGUST",
  locationName: "FEMMORA GH",
  address: "Westlands",
  mapsUrl: FEMMORA_MAPS_URL,
  silkStyle: "ivory-champagne",
  filmCta: "Step inside",
  filmSkipLabel: "Continue to the invitation",
  navigationStyle: "garment-tag",
  navLabels: [
    { id: "experience", label: "Enter Experience" },
    { id: "store-preview", label: "Store Preview" },
    { id: "collection", label: "View Collection" },
    { id: "rsvp", label: "RSVP" },
    { id: "location", label: "Location" },
    { id: "event-details", label: "Event Details" },
  ],
  countdownBeforeLabel: "The doors open in",
  countdownAfterLabel: "The doors are open",
  finaleMessage: "We'll see you inside.",
  lookbookTitle: "The Collection",
  lookbookItems: FEMMORA_DEFAULT_LOOKS,
  silkBedUrl: FEMMORA_SILK_BED,
  startAtIso: FEMMORA_START_ISO,
  endAtIso: FEMMORA_END_ISO,
  timeZone: "Africa/Nairobi",
  filmUrl: FEMMORA_STORE_FILM,
  filmPosterUrl: FEMMORA_STORE_POSTER,
};

export const LUXURY_FASHION_LAYOUT_SLUG = "luxury-fashion-flagship" as const;
export const FEMMORA_CATALOG_SLUG = "femmora-flagship-soft-opening" as const;
export const LUXURY_FASHION_OPENING_ID = "luxury-fashion-flagship" as const;
