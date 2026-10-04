import { withPublicQrCenter } from "@/lib/qr/qr-constants";
import {
  isFamilyAlbumQrCenter,
  isFamilyHeroQrCenter,
  isOfficialCeleventicQrCenter,
  isOrganizerUploadedQrCenter,
} from "@/lib/qr/qr-center-resolution";
import {
  AURELIA_HERO_FALLBACK,
  AURELIA_QR_CENTER,
  AURELIA_THEME_DEFAULTS,
  AURELIA_WEDDING_DEFAULTS,
  AURELIA_WHITE_ISO,
  SERAPHINE_HERO_FALLBACK,
  SERAPHINE_WEDDING_DEFAULTS,
} from "./preset";
import { SERAPHINE_LAYOUT_SLUG } from "./types";
import type {
  AureliaCeremony,
  AureliaDressCode,
  AureliaFaqItem,
  AureliaJourneyItem,
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

/**
 * Album QR inset: organizer-uploaded QR-center photo, otherwise the looking-back
 * couple portrait on Aurelia and the hero photograph on Seraphine. Other
 * catalogue stock never wins this slot.
 */
export function withAureliaAlbumQrCenter(
  qrImageUrl?: string | null,
  centerImageUrl?: string | null,
  layout?: string | null
): string | null {
  if (!qrImageUrl) return null;
  const uploaded = isOrganizerUploadedQrCenter(centerImageUrl);
  const family =
    isFamilyAlbumQrCenter(centerImageUrl) || isFamilyHeroQrCenter(centerImageUrl);
  const fallback =
    layout === SERAPHINE_LAYOUT_SLUG ? SERAPHINE_HERO_FALLBACK : AURELIA_QR_CENTER;
  const center = uploaded || family ? centerImageUrl!.trim() : fallback;
  const photograph = !isOfficialCeleventicQrCenter(center);
  return withPublicQrCenter(qrImageUrl, center, photograph ? "hero" : "balanced");
}

function mergeTheme(
  stored?: Partial<AureliaThemeTokens> | null,
  base: AureliaThemeTokens = AURELIA_THEME_DEFAULTS
): AureliaThemeTokens {
  return { ...base, ...stored };
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
        title: canonical.title,
        kicker: canonical.kicker,
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
    .filter((item) => {
      if (!(trim(item.venueName) || trim(item.eventLabel))) return false;
      if (canonicalById.has(item.id)) return true;
      return item.id !== "traditional" && item.id !== "white";
    })
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
      imageUrl: trim(extra.imageUrl) || canonical.imageUrl,
      palette: canonical.palette.map((swatch) => ({ ...swatch })),
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

function mergeGiftCopy(
  stored: Partial<AureliaWeddingConfig>,
  base: AureliaWeddingConfig
): Pick<AureliaWeddingConfig, "giftsEyebrow" | "giftsTitle" | "giftsLede" | "giftsDetails"> {
  const staleHiddenGifts =
    stored.sections?.gifts?.visible === false &&
    !trim(stored.giftsTitle) &&
    !trim(stored.giftsLede) &&
    !trim(stored.giftsDetails) &&
    Boolean(trim(base.giftsTitle)) &&
    base.sections?.gifts?.visible !== false;
  const take = (value: string | undefined, fallback: string) => {
    const trimmed = trim(value);
    if (trimmed) return trimmed;
    if (value === undefined || staleHiddenGifts) return fallback;
    return "";
  };
  return {
    giftsEyebrow: take(stored.giftsEyebrow, base.giftsEyebrow),
    giftsTitle: take(stored.giftsTitle, base.giftsTitle),
    giftsLede: take(stored.giftsLede, base.giftsLede),
    giftsDetails: take(stored.giftsDetails, base.giftsDetails ?? ""),
  };
}

function mergeSections(
  storedSections: AureliaWeddingConfig["sections"],
  stored: Partial<AureliaWeddingConfig>,
  base: AureliaWeddingConfig
): AureliaWeddingConfig["sections"] {
  const merged = { ...base.sections, ...storedSections };
  const staleHiddenGifts =
    storedSections?.gifts?.visible === false &&
    !trim(stored.giftsTitle) &&
    !trim(stored.giftsLede) &&
    !trim(stored.giftsDetails) &&
    Boolean(trim(base.giftsTitle)) &&
    base.sections?.gifts?.visible !== false;
  return staleHiddenGifts ? { ...merged, gifts: { visible: true } } : merged;
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
    monogramImageUrl: isSeraphinePlaceholderMonogram(stored.monogramImageUrl)
      ? trim(base.monogramImageUrl) || null
      : trim(base.monogramImageUrl) || stored.monogramImageUrl,
    storySignature: base.storySignature,
    dateDisplay: base.dateDisplay,
    heroTagline: "",
    heroImageUrl: isAureliaDummyHero(stored.heroImageUrl)
      ? base.heroImageUrl
      : trim(stored.heroImageUrl) || base.heroImageUrl,
    storyImageUrl: /\/templates\/aurelia\//i.test(trim(stored.storyImageUrl))
      ? base.storyImageUrl
      : stored.storyImageUrl !== undefined
        ? stored.storyImageUrl
        : base.storyImageUrl,
    rsvpShowPhone: base.rsvpShowPhone === true,
    albumEyebrow: trim(stored.albumEyebrow) || base.albumEyebrow,
    albumTitle: trim(stored.albumTitle) || base.albumTitle,
    albumLede: trim(stored.albumLede) || base.albumLede,
    albumUploadCta: trim(stored.albumUploadCta) || base.albumUploadCta,
    albumViewCta: trim(stored.albumViewCta) || base.albumViewCta,
    storyParagraphs:
      stored.storyParagraphs?.map((p) => trim(p)).filter(Boolean) ?? base.storyParagraphs,
    theme: mergeTheme(stored.theme, base.theme),
    ceremonies: mergeCeremonies(stored.ceremonies, base),
    venues: mergeVenues(stored.venues, base),
    dressCodes: mergeDress(stored.dressCodes, base),
    journey: mergeJourney(stored.journey, base),
    faqs: mergeFaqs(stored.faqs, base),
    rsvpByLabel: "",
    rsvpContacts: mergeRsvpContacts(stored.rsvpContacts, base),
    ...mergeGiftCopy(stored, base),
    sections: mergeSections(stored.sections, stored, base),
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

/** Count down to the first celebration day, not a later ceremony. */
export function resolveAureliaCountdownIso(
  ceremonies: Array<{ startAtIso?: string | null }>,
  fallback?: string | null
): string {
  const dated = ceremonies
    .map((item) => item.startAtIso?.trim())
    .filter((iso): iso is string => Boolean(iso))
    .map((iso) => ({ iso, time: Date.parse(iso) }))
    .filter((item) => Number.isFinite(item.time))
    .sort((a, b) => a.time - b.time);
  if (dated[0]) return dated[0].iso;
  const fallbackIso = fallback?.trim();
  if (fallbackIso && Number.isFinite(Date.parse(fallbackIso))) return fallbackIso;
  return AURELIA_WHITE_ISO;
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
    ["story", trim(config.storyTitle) || "Our Story"],
    ["celebrations", "Celebrations"],
    ["venues", "Venues"],
    ["dress", "Dress Code"],
    ["journey", "Our Journey"],
    ["album", "Album"],
    ["gifts", "Gift"],
    ["rsvp", "RSVP"],
  ];
  for (const [id, label] of rest) {
    if (aureliaSectionVisible(config, id)) items.push({ id, label });
  }
  return items;
}

export function isSeraphinePlaceholderMonogram(url?: string | null): boolean {
  return /\/templates\/seraphine\/monogram\.svg(\?|$)/i.test(url?.trim() ?? "");
}

export function isAureliaDummyHero(url?: string | null): boolean {
  const value = url?.trim() ?? "";
  return !value || /\/templates\/aurelia\/hero\.(svg|jpg|jpeg|webp)(\?|$)/i.test(value);
}

export function isAureliaFamilyPlaceholderHero(url?: string | null): boolean {
  const value = url?.trim() ?? "";
  return (
    !value ||
    /\/templates\/(?:aurelia|seraphine)\/hero\.(svg|jpg|jpeg|webp)(\?|$)/i.test(value)
  );
}

export function resolveAureliaHeroImage(input: {
  heroImageUrl?: string | null;
  coverImageUrl?: string | null;
  mediaHeroUrl?: string | null;
  heroCleared?: boolean;
  fallback?: string | null;
}): string {
  const fallback = trim(input.fallback) || AURELIA_HERO_FALLBACK;
  if (input.heroCleared) return fallback;
  const uploaded = input.mediaHeroUrl?.trim();
  if (uploaded && !isAureliaFamilyPlaceholderHero(uploaded)) return uploaded;
  const configured = input.heroImageUrl?.trim();
  if (configured && !isAureliaFamilyPlaceholderHero(configured)) return configured;
  const cover = input.coverImageUrl?.trim();
  if (cover && !isAureliaFamilyPlaceholderHero(cover)) return cover;
  return fallback;
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
