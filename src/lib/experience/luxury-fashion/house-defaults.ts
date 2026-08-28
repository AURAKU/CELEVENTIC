import type { FashionLookbookItem, FashionNavLabel, LuxuryFashionHouseConfig } from "./types";

export function mergeFashionHouse(
  base: LuxuryFashionHouseConfig,
  override?: Partial<LuxuryFashionHouseConfig> | null
): LuxuryFashionHouseConfig {
  if (!override) return base;
  return {
    ...base,
    ...override,
    navLabels: override.navLabels?.length ? override.navLabels : base.navLabels,
    lookbookItems: override.lookbookItems !== undefined ? override.lookbookItems : base.lookbookItems,
    silkBedUrl: override.silkBedUrl === undefined ? base.silkBedUrl : override.silkBedUrl,
    filmUrl: override.filmUrl === undefined ? base.filmUrl : override.filmUrl,
    filmPosterUrl: override.filmPosterUrl === undefined ? base.filmPosterUrl : override.filmPosterUrl,
    visitDayOptions:
      override.visitDayOptions !== undefined ? override.visitDayOptions : base.visitDayOptions,
    socialLinks: override.socialLinks !== undefined ? override.socialLinks : base.socialLinks,
    chapters: { ...base.chapters, ...override.chapters },
  };
}

export const LUXURY_FASHION_NAV_LABELS: FashionNavLabel[] = [
  { id: "experience", label: "Enter Experience" },
  { id: "store-preview", label: "Store Preview" },
  { id: "collection", label: "View Collection" },
  { id: "rsvp", label: "RSVP" },
  { id: "location", label: "Location" },
  { id: "event-details", label: "Event Details" },
  { id: "social", label: "Stay Connected" },
];

/** Neutral fashion-flagship DNA. Presets (Femmora, later houses) overlay this. */
export const LUXURY_FASHION_HOUSE_DEFAULTS: LuxuryFashionHouseConfig = {
  houseName: "THE HOUSE",
  monogram: "H",
  eventTitle: "Flagship Opening",
  unveilingLabel: "Enter the Unveiling",
  teaserLine: "A quiet house. A first light.",
  whisperLine: "Something beautiful is about to open",
  whisperEyebrow: "SOMETHING BEAUTIFUL",
  whisperScript: "Is about to open",
  hubLede: "An invitation to experience the house.",
  swipeHint: "Swipe to explore",
  portalWelcome: "Welcome",
  portalPrompt: "The doors are about to open",
  rsvpHeading: "Will we see you?",
  rsvpAcceptedLabel: "Yes — I'll be there",
  finaleKicker: "A new chapter in style.",
  hoursLabel: "9 AM TO 8 PM",
  datesLabel: "OPENING DAYS",
  locationName: "The House",
  address: "",
  mapsUrl: "",
  silkStyle: "ivory-champagne",
  markVariant: "letter",
  filmCta: "Step inside",
  filmSkipLabel: "Continue to the invitation",
  navigationStyle: "garment-tag",
  navLabels: LUXURY_FASHION_NAV_LABELS,
  countdownBeforeLabel: "The doors open in",
  countdownAfterLabel: "The doors are open",
  finaleMessage: "We'll see you inside.",
  lookbookTitle: "The Collection",
  lookbookItems: [] as FashionLookbookItem[],
  silkBedUrl: null,
  startAtIso: "",
  endAtIso: "",
  timeZone: "Africa/Nairobi",
  filmUrl: null,
  filmPosterUrl: null,
  visitDayOptions: [],
  showSocialSection: false,
  instagramHandle: "",
  instagramUrl: "",
  socialIntroText: "",
  socialTitle: "Stay Connected",
  socialCtaLabel: "Follow on Instagram",
  showSocialIconsInFinale: false,
  socialLinks: [],
  chapters: {
    boutique: true,
    film: true,
    collection: true,
    countdown: true,
    maps: true,
    rsvp: true,
    share: true,
    social: true,
  },
};
