import { AURELIA_HERO_FALLBACK, AURELIA_THEME_DEFAULTS, AURELIA_WEDDING_DEFAULTS, SERAPHINE_WEDDING_DEFAULTS } from "./preset";
import { SERAPHINE_LAYOUT_SLUG } from "./types";
import type {
  AureliaCeremony,
  AureliaDressCode,
  AureliaFaqItem,
  AureliaJourneyItem,
  AureliaPaletteSwatch,
  AureliaSectionId,
  AureliaThemeTokens,
  AureliaVenueCard,
  AureliaWeddingConfig,
} from "./types";

function trim(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

function mergeTheme(
  stored?: Partial<AureliaThemeTokens> | null
): AureliaThemeTokens {
  return { ...AURELIA_THEME_DEFAULTS, ...stored };
}

function mergeCeremonies(
  stored: AureliaCeremony[] | null | undefined,
  base: AureliaWeddingConfig
): AureliaCeremony[] {
  if (stored == null) return base.ceremonies;
  return stored.filter((item) => trim(item.title) || trim(item.venueName));
}

function mergeVenues(
  stored: AureliaVenueCard[] | null | undefined,
  base: AureliaWeddingConfig
): AureliaVenueCard[] {
  if (stored == null) return base.venues;
  return stored.filter((item) => trim(item.venueName) || trim(item.eventLabel));
}

function mergeDress(
  stored: AureliaDressCode[] | null | undefined,
  base: AureliaWeddingConfig
): AureliaDressCode[] {
  if (stored == null) return base.dressCodes;
  return stored.map((item) => ({
    ...item,
    palette: (item.palette ?? []).filter(
      (swatch: AureliaPaletteSwatch) => trim(swatch.hex)
    ).slice(0, 6),
  }));
}

function mergeJourney(
  stored: AureliaJourneyItem[] | null | undefined,
  base: AureliaWeddingConfig
): AureliaJourneyItem[] {
  if (stored == null) return base.journey;
  return stored.filter((item) => trim(item.title) || trim(item.imageUrl));
}

function mergeFaqs(
  stored: AureliaFaqItem[] | null | undefined,
  base: AureliaWeddingConfig
): AureliaFaqItem[] {
  if (stored == null) return base.faqs;
  return stored.filter((item) => trim(item.question) && trim(item.answer));
}

export function aureliaFamilyDefaults(layout?: string | null): AureliaWeddingConfig {
  return layout === SERAPHINE_LAYOUT_SLUG ? SERAPHINE_WEDDING_DEFAULTS : AURELIA_WEDDING_DEFAULTS;
}

export function mergeAureliaWedding(
  stored?: Partial<AureliaWeddingConfig> | null,
  base: AureliaWeddingConfig = AURELIA_WEDDING_DEFAULTS
): AureliaWeddingConfig {
  if (!stored) return base;
  return {
    ...base,
    ...stored,
    partnerOneName: trim(stored.partnerOneName) || base.partnerOneName,
    partnerTwoName: trim(stored.partnerTwoName) || base.partnerTwoName,
    monogram: trim(stored.monogram) || base.monogram,
    albumEyebrow: trim(stored.albumEyebrow) || base.albumEyebrow,
    albumTitle: trim(stored.albumTitle) || base.albumTitle,
    albumLede: trim(stored.albumLede) || base.albumLede,
    albumUploadCta: trim(stored.albumUploadCta) || base.albumUploadCta,
    albumViewCta: trim(stored.albumViewCta) || base.albumViewCta,
    storyParagraphs:
      stored.storyParagraphs?.map((p) => trim(p)).filter(Boolean) ?? base.storyParagraphs,
    theme: mergeTheme(stored.theme),
    ceremonies: mergeCeremonies(stored.ceremonies, base),
    venues: mergeVenues(stored.venues, base),
    dressCodes: mergeDress(stored.dressCodes, base),
    journey: mergeJourney(stored.journey, base),
    faqs: mergeFaqs(stored.faqs, base),
    sections: { ...base.sections, ...stored.sections },
  };
}

export function aureliaVenueKey(item: {
  venueName?: string;
  address?: string;
  mapsUrl?: string;
}): string {
  return [trim(item.venueName).toLowerCase(), trim(item.address).toLowerCase(), trim(item.mapsUrl)].join("|");
}

export function aureliaDistinctVenues(config: AureliaWeddingConfig): AureliaVenueCard[] {
  const ceremonyKeys = new Set(config.ceremonies.map(aureliaVenueKey));
  return config.venues.filter((venue) => !ceremonyKeys.has(aureliaVenueKey(venue)));
}

export function aureliaSectionVisible(
  config: AureliaWeddingConfig,
  id: AureliaSectionId
): boolean {
  if (config.sections?.[id]?.visible === false) return false;
  switch (id) {
    case "story":
      return config.storyParagraphs.length > 0 || Boolean(trim(config.storyTitle));
    case "celebrations":
      return config.ceremonies.length > 0;
    case "venues":
      return aureliaDistinctVenues(config).length > 0;
    case "dress":
      return config.dressCodes.length > 0;
    case "journey":
      return config.journey.length > 0;
    case "faq":
      return config.faqs.length > 0;
    case "gifts":
      return Boolean(trim(config.giftsTitle) || trim(config.giftsLede) || trim(config.giftsDetails));
    case "album":
      return Boolean(
        trim(config.albumTitle) || trim(config.albumLede) || trim(config.albumEyebrow)
      );
    default:
      return true;
  }
}

export function aureliaNavItems(config: AureliaWeddingConfig): Array<{
  id: AureliaSectionId;
  label: string;
}> {
  const items: Array<{ id: AureliaSectionId; label: string }> = [{ id: "home", label: "Home" }];
  const rest: Array<[AureliaSectionId, string]> = [
    ["story", "Our Story"],
    ["celebrations", "Celebrations"],
    ["venues", "Venues"],
    ["dress", "Dress Code"],
    ["journey", "Our Journey"],
    ["album", "Album"],
    ["rsvp", "RSVP"],
  ];
  for (const [id, label] of rest) {
    if (aureliaSectionVisible(config, id)) items.push({ id, label });
  }
  return items;
}

export function isAureliaDummyHero(url?: string | null): boolean {
  const value = url?.trim() ?? "";
  return !value || /\/templates\/aurelia\/hero\.(svg|jpg|jpeg|webp)(\?|$)/i.test(value);
}

export function resolveAureliaHeroImage(input: {
  heroImageUrl?: string | null;
  coverImageUrl?: string | null;
  mediaHeroUrl?: string | null;
  heroCleared?: boolean;
}): string {
  if (input.heroCleared) return AURELIA_HERO_FALLBACK;
  const uploaded = input.mediaHeroUrl?.trim();
  if (uploaded) return uploaded;
  const configured = input.heroImageUrl?.trim();
  if (configured && !isAureliaDummyHero(configured)) return configured;
  const cover = input.coverImageUrl?.trim();
  if (cover) return cover;
  return AURELIA_HERO_FALLBACK;
}

export function aureliaTokenStyle(theme: AureliaThemeTokens): Record<string, string> {
  return {
    "--wedding-ivory": theme.ivory,
    "--wedding-cream": theme.cream,
    "--wedding-champagne": theme.champagne,
    "--wedding-terracotta": theme.terracotta,
    "--wedding-blush": theme.blush,
    "--wedding-espresso": theme.espresso,
    "--wedding-brown": theme.brown,
    "--wedding-gold": theme.gold,
    "--wedding-text": theme.text,
  };
}
