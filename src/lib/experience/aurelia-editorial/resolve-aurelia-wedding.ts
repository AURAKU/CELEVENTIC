import { withPublicQrCenter } from "@/lib/qr/qr-constants";
import { AURELIA_HERO_FALLBACK, AURELIA_THEME_DEFAULTS, AURELIA_WEDDING_DEFAULTS, SERAPHINE_WEDDING_DEFAULTS } from "./preset";
import { SERAPHINE_LAYOUT_SLUG } from "./types";
import type {
  AureliaCeremony,
  AureliaDressCode,
  AureliaFaqItem,
  AureliaJourneyItem,
  AureliaPaletteSwatch,
  AureliaRsvpContact,
  AureliaSectionId,
  AureliaThemeTokens,
  AureliaVenueCard,
  AureliaWeddingConfig,
} from "./types";

function trim(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

/**
 * Remove pause dashes (em dash, en dash, spaced hyphen) from guest-facing copy.
 * Keep compound hyphens such as Tse-Addo, turn-by-turn, and On-site.
 */
export function withoutInvitationPauseDashes(value: string): string {
  return value
    .replace(/\s*[—–‒―]\s*/g, ". ")
    .replace(/(\w)\s+-\s+(\w)/g, "$1. $2")
    .replace(/\.\s*\./g, ".")
    .replace(/\. ([a-z])/g, (_match, ch: string) => `. ${ch.toUpperCase()}`)
    .replace(/\s{2,}/g, " ")
    .replace(/\s+\./g, ".")
    .trim();
}

function copy(value: string): string {
  return withoutInvitationPauseDashes(trim(value));
}

function copyOptional(value: string | null | undefined): string | undefined {
  if (value == null) return value ?? undefined;
  return withoutInvitationPauseDashes(trim(value));
}

function sanitizeAureliaGuestCopy(config: AureliaWeddingConfig): AureliaWeddingConfig {
  return {
    ...config,
    familyIntro: copy(config.familyIntro),
    marriedLine: copy(config.marriedLine),
    dateDisplay: copy(config.dateDisplay),
    heroTagline: copy(config.heroTagline),
    celebrationCta: copy(config.celebrationCta),
    rsvpCta: copy(config.rsvpCta),
    rsvpByLabel: "",
    rsvpContactsEyebrow: copyOptional(config.rsvpContactsEyebrow),
    rsvpContacts: (config.rsvpContacts ?? []).map((item) => ({
      name: copy(item.name),
      phone: trim(item.phone),
    })).filter((item) => item.name && item.phone),
    storyEyebrow: copy(config.storyEyebrow),
    storyTitle: copy(config.storyTitle),
    storyParagraphs: config.storyParagraphs.map(copy),
    storySignature: copy(config.storySignature),
    celebrationsEyebrow: copy(config.celebrationsEyebrow),
    celebrationsTitle: copy(config.celebrationsTitle),
    celebrationsLede: copy(config.celebrationsLede),
    venuesEyebrow: copy(config.venuesEyebrow),
    venuesTitle: copy(config.venuesTitle),
    venuesLede: copy(config.venuesLede),
    privateAddressCopy: copy(config.privateAddressCopy),
    dressEyebrow: copy(config.dressEyebrow),
    dressTitle: copy(config.dressTitle),
    dressLede: copy(config.dressLede),
    journeyEyebrow: copy(config.journeyEyebrow),
    journeyTitle: copy(config.journeyTitle),
    journeyLede: copy(config.journeyLede),
    albumEyebrow: copy(config.albumEyebrow),
    albumTitle: copy(config.albumTitle),
    albumLede: copy(config.albumLede),
    albumUploadCta: copy(config.albumUploadCta),
    albumViewCta: copy(config.albumViewCta),
    rsvpEyebrow: copyOptional(config.rsvpEyebrow),
    rsvpTitle: copy(config.rsvpTitle),
    giftsEyebrow: copy(config.giftsEyebrow),
    giftsTitle: copy(config.giftsTitle),
    giftsLede: copy(config.giftsLede),
    giftsDetails: copyOptional(config.giftsDetails),
    faqEyebrow: copy(config.faqEyebrow),
    faqTitle: copy(config.faqTitle),
    finaleScript: copy(config.finaleScript),
    finaleLine: copy(config.finaleLine),
    countdownTitle: copy(config.countdownTitle),
    ceremonies: config.ceremonies.map((item) => ({
      ...item,
      kicker: copy(item.kicker),
      title: copy(item.title),
      weekday: copy(item.weekday),
      dateLabel: copy(item.dateLabel),
      timeLabel: copy(item.timeLabel),
      venueName: copy(item.venueName),
      address: copy(item.address),
      description: copyOptional(item.description),
    })),
    venues: config.venues.map((item) => ({
      ...item,
      eventLabel: copy(item.eventLabel),
      venueName: copy(item.venueName),
      address: copyOptional(item.address),
    })),
    dressCodes: config.dressCodes.map((item) => ({
      ...item,
      eventLabel: copy(item.eventLabel),
      dateLabel: copy(item.dateLabel),
      title: copy(item.title),
      scriptLine: copyOptional(item.scriptLine),
      note: copyOptional(item.note),
    })),
    journey: config.journey.map((item) => ({
      ...item,
      title: copy(item.title),
      caption: copyOptional(item.caption),
    })),
    faqs: config.faqs.map((item) => ({
      ...item,
      question: copy(item.question),
      answer: copy(item.answer),
    })),
  };
}

/** Album QR on Aurelia/Seraphine invitations uses the standing-couple hero, not event branding. */
export function withAureliaAlbumQrCenter(qrImageUrl?: string | null): string | null {
  if (!qrImageUrl) return null;
  return withPublicQrCenter(qrImageUrl, AURELIA_HERO_FALLBACK, "bold");
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
  if (stored.length === 0) return [];
  const canonicalById = new Map(base.ceremonies.map((item) => [item.id, item]));
  return stored
    .filter((item) => trim(item.title) || trim(item.venueName) || canonicalById.has(item.id))
    .map((item) => {
      const canonical = canonicalById.get(item.id);
      if (!canonical) return item;
      return {
        ...item,
        weekday: canonical.weekday,
        dateLabel: canonical.dateLabel,
        timeLabel: canonical.timeLabel,
        venueName: canonical.venueName,
        address: canonical.address,
        mapsUrl: canonical.mapsUrl,
        startAtIso: canonical.startAtIso,
      };
    });
}

function mergeVenues(
  stored: AureliaVenueCard[] | null | undefined,
  base: AureliaWeddingConfig
): AureliaVenueCard[] {
  if (stored == null) return base.venues;
  const canonicalById = new Map(base.venues.map((item) => [item.id, item]));
  return stored
    .filter((item) => trim(item.venueName) || trim(item.eventLabel))
    .map((item) => {
      const canonical = canonicalById.get(item.id);
      if (!canonical) return item;
      return {
        ...item,
        eventLabel: canonical.eventLabel,
        venueName: canonical.venueName,
        address: canonical.address,
        mapsUrl: canonical.mapsUrl,
      };
    });
}

function mergeDress(
  stored: AureliaDressCode[] | null | undefined,
  base: AureliaWeddingConfig
): AureliaDressCode[] {
  if (stored == null) return base.dressCodes;
  if (stored.length === 0) return [];
  return base.dressCodes.map((canonical) => {
    const extra = stored.find((item) => item.id === canonical.id);
    if (!extra) return canonical;
    return {
      ...canonical,
      title: trim(extra.title) || canonical.title,
      note: trim(extra.note) || canonical.note,
      scriptLine: trim(extra.scriptLine) || canonical.scriptLine,
      palette: canonical.palette.length
        ? canonical.palette.map((swatch) => ({ ...swatch }))
        : (extra.palette ?? [])
            .filter((swatch: AureliaPaletteSwatch) => trim(swatch.hex))
            .slice(0, 6),
    };
  });
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
  const canonicalById = new Map(base.faqs.map((item) => [item.id, item]));
  return stored
    .filter((item) => trim(item.question) && trim(item.answer))
    .map((item) => {
      const canonical = canonicalById.get(item.id);
      if (item.id === "contact" && canonical) {
        return { ...canonical };
      }
      return item;
    });
}

function mergeRsvpContacts(
  stored: AureliaRsvpContact[] | null | undefined,
  base: AureliaWeddingConfig
): AureliaRsvpContact[] {
  if (stored == null || stored.length === 0) return base.rsvpContacts ?? [];
  return stored.filter((item) => trim(item.name) && trim(item.phone));
}

/** Ghana-local numbers (024…) become E.164 tel and WhatsApp links. */
export function aureliaGuestPhoneLinks(
  phone: string,
  message = ""
): { display: string; telHref: string; whatsAppHref: string } | null {
  const display = trim(phone);
  const digits = display.replace(/\D/g, "");
  if (digits.length < 9) return null;
  const e164 = digits.startsWith("233")
    ? digits
    : digits.startsWith("0")
      ? `233${digits.slice(1)}`
      : digits;
  const encoded = encodeURIComponent(message);
  return {
    display,
    telHref: `tel:+${e164}`,
    whatsAppHref: encoded
      ? `https://wa.me/${e164}?text=${encoded}`
      : `https://wa.me/${e164}`,
  };
}

export function aureliaFamilyDefaults(layout?: string | null): AureliaWeddingConfig {
  return layout === SERAPHINE_LAYOUT_SLUG ? SERAPHINE_WEDDING_DEFAULTS : AURELIA_WEDDING_DEFAULTS;
}

export function mergeAureliaWedding(
  stored?: Partial<AureliaWeddingConfig> | null,
  base: AureliaWeddingConfig = AURELIA_WEDDING_DEFAULTS
): AureliaWeddingConfig {
  if (!stored) return sanitizeAureliaGuestCopy(base);
  return sanitizeAureliaGuestCopy({
    ...base,
    ...stored,
    partnerOneName: base.partnerOneName,
    partnerTwoName: base.partnerTwoName,
    monogram: base.monogram,
    storySignature: base.storySignature,
    dateDisplay: base.dateDisplay,
    heroTagline: "",
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
    rsvpByLabel: "",
    rsvpContacts: mergeRsvpContacts(stored.rsvpContacts, base),
    sections: { ...base.sections, ...stored.sections },
  });
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
