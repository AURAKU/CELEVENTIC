import type { FashionLookbookItem, FashionNavLabel, LuxuryFashionHouseConfig } from "./types";

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
  wishesEmpty: "The atelier is still quiet. Leave the first compliment.",
  rsvpHeading: "Will we see you?",
  rsvpAcceptedLabel: "Yes. I'll be there",
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

export function mergeFashionHouse(
  base?: LuxuryFashionHouseConfig | null,
  override?: Partial<LuxuryFashionHouseConfig> | null
): LuxuryFashionHouseConfig {
  const resolved = base ?? LUXURY_FASHION_HOUSE_DEFAULTS;
  if (!override) return resolved;
  return {
    ...resolved,
    ...override,
    navLabels: override.navLabels?.length ? override.navLabels : resolved.navLabels,
    lookbookItems: override.lookbookItems !== undefined ? override.lookbookItems : resolved.lookbookItems,
    silkBedUrl: override.silkBedUrl === undefined ? resolved.silkBedUrl : override.silkBedUrl,
    logoUrl: override.logoUrl === undefined ? resolved.logoUrl : override.logoUrl,
    shareOgImageUrl:
      override.shareOgImageUrl === undefined ? resolved.shareOgImageUrl : override.shareOgImageUrl,
    filmUrl: override.filmUrl === undefined ? resolved.filmUrl : override.filmUrl,
    filmPosterUrl: override.filmPosterUrl === undefined ? resolved.filmPosterUrl : override.filmPosterUrl,
    teaserClipUrl: override.teaserClipUrl === undefined ? resolved.teaserClipUrl : override.teaserClipUrl,
    teaserPosterUrl: override.teaserPosterUrl === undefined ? resolved.teaserPosterUrl : override.teaserPosterUrl,
    envelopeFaceLine: override.envelopeFaceLine ?? override.folioFaceLine ?? resolved.envelopeFaceLine ?? resolved.folioFaceLine,
    folioFaceLine: override.envelopeFaceLine ?? override.folioFaceLine ?? resolved.envelopeFaceLine ?? resolved.folioFaceLine,
    cardCtaLabel: override.cardCtaLabel ?? resolved.cardCtaLabel,
    flyerCardUrl: override.flyerCardUrl === undefined ? resolved.flyerCardUrl : override.flyerCardUrl,
    experienceFlyerUrl:
      override.experienceFlyerUrl === undefined ? resolved.experienceFlyerUrl : override.experienceFlyerUrl,
    visionStoreEnabled:
      override.visionStoreEnabled === undefined ? resolved.visionStoreEnabled : override.visionStoreEnabled,
    visitDayOptions:
      override.visitDayOptions !== undefined ? override.visitDayOptions : resolved.visitDayOptions,
    socialLinks: override.socialLinks !== undefined ? override.socialLinks : resolved.socialLinks,
    chapters: { ...resolved.chapters, ...override.chapters },
  };
}

const FEMMORA_ASSET_MARKER = "/templates/femmora/";

/** Guest-wishes kicker. Each house’s uppercase nameplate, not a shared salon label. */
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
 * Guest-wishes crest. Only that house’s own `logoUrl`.
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
