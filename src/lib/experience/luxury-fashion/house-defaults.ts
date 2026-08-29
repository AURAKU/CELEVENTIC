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
    logoUrl: override.logoUrl === undefined ? base.logoUrl : override.logoUrl,
    shareOgImageUrl:
      override.shareOgImageUrl === undefined ? base.shareOgImageUrl : override.shareOgImageUrl,
    filmUrl: override.filmUrl === undefined ? base.filmUrl : override.filmUrl,
    filmPosterUrl: override.filmPosterUrl === undefined ? base.filmPosterUrl : override.filmPosterUrl,
    teaserClipUrl: override.teaserClipUrl === undefined ? base.teaserClipUrl : override.teaserClipUrl,
    teaserPosterUrl: override.teaserPosterUrl === undefined ? base.teaserPosterUrl : override.teaserPosterUrl,
    envelopeFaceLine: override.envelopeFaceLine ?? override.folioFaceLine ?? base.envelopeFaceLine ?? base.folioFaceLine,
    folioFaceLine: override.envelopeFaceLine ?? override.folioFaceLine ?? base.envelopeFaceLine ?? base.folioFaceLine,
    cardCtaLabel: override.cardCtaLabel ?? base.cardCtaLabel,
    flyerCardUrl: override.flyerCardUrl === undefined ? base.flyerCardUrl : override.flyerCardUrl,
    experienceFlyerUrl:
      override.experienceFlyerUrl === undefined ? base.experienceFlyerUrl : override.experienceFlyerUrl,
    visionStoreEnabled:
      override.visionStoreEnabled === undefined ? base.visionStoreEnabled : override.visionStoreEnabled,
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
  { id: "social", label: "Stay Connected" },
];

/** Neutral fashion-flagship DNA. Presets (Femmora, later houses) overlay this. */
export const LUXURY_FASHION_HOUSE_DEFAULTS: LuxuryFashionHouseConfig = {
  houseName: "THE HOUSE",
  monogram: "H",
  eventTitle: "Flagship Opening",
  unveilingLabel: "TAP TO OPEN",
  teaserLine: "A quiet house. A first light.",
  whisperLine: "A private first look",
  whisperEyebrow: "THE HOUSE",
  whisperScript: "Flagship Opening",
  hubLede: "An invitation to experience the house.",
  swipeHint: "Swipe to explore",
  portalWelcome: "Step inside",
  portalPrompt: "The house is waiting",
  openingStyle: "card-envelope",
  envelopeFaceLine: "PRIVATE INVITATION",
  folioFaceLine: "PRIVATE INVITATION",
  cardCtaLabel: "OPEN",
  teaserPlaceLine: "",
  teaserDateLine: "",
  teaserClipUrl: null,
  teaserPosterUrl: null,
  mapsCtaLabel: "View on Google Maps",
  copyLocationLabel: "Copy location",
  shareLocationLabel: "Share location",
  countdownEndedLabel: "The house is now open",
  replayUnveilingLabel: "Replay the unveiling",
  filmChapterTitle: "The first look",
  filmChapterLede: "Experience the house",
  wishesTitle: "Compliments and guest wishes to the host",
  wishesEmpty: "The atelier is still quiet — leave the first compliment.",
  rsvpHeading: "Will we see you?",
  rsvpAcceptedLabel: "Yes — I'll be there",
  rsvpLede: "Yes, maybe, or unable to attend, we will keep your place with care.",
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
  lookbookKicker: "First looks",
  lookbookItems: [] as FashionLookbookItem[],
  silkBedUrl: null,
  shareOgImageUrl: null,
  flyerCardUrl: null,
  experienceFlyerUrl: null,
  visionStoreEnabled: false,
  visionStoreKicker: "Online vision store",
  visionStoreTitle: "The house, in your hands",
  visionStoreLine: "A first look at shopping the collection from anywhere.",
  visionStoreDeliveryLine: "Nationwide delivery",
  visionStoreSoonLabel: "Opening soon",
  startAtIso: "",
  endAtIso: "",
  timeZone: "Africa/Nairobi",
  filmUrl: null,
  filmPosterUrl: null,
  visitDayOptions: [],
  showSocialSection: false,
  instagramHandle: "",
  instagramUrl: "",
  tiktokHandle: "",
  tiktokUrl: "",
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

const FEMMORA_ASSET_MARKER = "/templates/femmora/";

/** Guest-wishes kicker — each house’s uppercase nameplate, not a shared salon label. */
export function fashionHouseNameplate(houseName?: string | null): string {
  const resolved = houseName?.trim() || LUXURY_FASHION_HOUSE_DEFAULTS.houseName;
  return resolved.toUpperCase();
}

type FashionHouseLogoInput =
  | string
  | {
      logoUrl?: string | null;
      houseName?: string | null;
    }
  | null
  | undefined;

/**
 * Guest-wishes crest — only that house’s own `logoUrl`.
 * Femmora’s PNG is used only for a Femmora house; Vale never inherits it.
 * Empty/missing never falls back to Femmora’s mark.
 */
export function fashionHouseLogoSrc(
  houseOrLogo?: FashionHouseLogoInput,
  houseName?: string | null
): string | null {
  const fromHouse = houseOrLogo !== null && typeof houseOrLogo === "object";
  const src = (fromHouse ? houseOrLogo.logoUrl : houseOrLogo)?.trim() ?? "";
  if (!src) return null;

  const name = (fromHouse ? houseOrLogo.houseName : houseName)?.trim() ?? "";
  const isFemmoraAsset = src.includes(FEMMORA_ASSET_MARKER);
  const isFemmoraHouse = name.toUpperCase().includes("FEMMORA");
  if (isFemmoraAsset && name.length > 0 && !isFemmoraHouse) return null;
  return src;
}
