export const AURELIA_CATALOG_SLUG = "aurelia-editorial-wedding";
export const AURELIA_LAYOUT_SLUG = "aurelia-editorial-wedding";
export const AURELIA_OPENING_ID = "aurelia-editorial-wedding";
export const AURELIA_INTRO_ID = "aurelia-ivory-veil";

/** Independent Aurelia-family SKU — own catalogue card, own defaults, shared renderer. */
export const SERAPHINE_CATALOG_SLUG = "seraphine-champagne-wedding";
export const SERAPHINE_LAYOUT_SLUG = "seraphine-champagne-wedding";
export const SERAPHINE_OPENING_ID = "seraphine-champagne-wedding";
export const SERAPHINE_INTRO_ID = "seraphine-ivory-veil";

export function isAureliaEditorialLayout(layout?: string | null): boolean {
  return layout === AURELIA_LAYOUT_SLUG || layout === SERAPHINE_LAYOUT_SLUG;
}

export function isAureliaFamilyOpening(id?: string | null): boolean {
  return id === AURELIA_OPENING_ID || id === SERAPHINE_OPENING_ID;
}

export type AureliaSectionId =
  | "home"
  | "story"
  | "celebrations"
  | "venues"
  | "dress"
  | "journey"
  | "album"
  | "rsvp"
  | "gifts"
  | "faq"
  | "finale";

export interface AureliaThemeTokens {
  ivory: string;
  cream: string;
  champagne: string;
  terracotta: string;
  blush: string;
  espresso: string;
  brown: string;
  gold: string;
  text: string;
}

export interface AureliaPaletteSwatch {
  name: string;
  hex: string;
}

export interface AureliaDressCode {
  id: string;
  eventLabel: string;
  dateLabel: string;
  title: string;
  scriptLine?: string;
  note?: string;
  palette: AureliaPaletteSwatch[];
  variant?: "light" | "dark";
}

export interface AureliaCeremony {
  id: string;
  kicker: string;
  title: string;
  weekday: string;
  dateLabel: string;
  timeLabel: string;
  venueName: string;
  address: string;
  mapsUrl?: string;
  description?: string;
  imageUrl?: string;
  addressPrivate?: boolean;
  startAtIso?: string;
}

export interface AureliaVenueCard {
  id: string;
  eventLabel: string;
  venueName: string;
  address?: string;
  mapsUrl?: string;
  addressPrivate?: boolean;
}

export interface AureliaJourneyItem {
  id: string;
  title: string;
  imageUrl?: string;
  caption?: string;
}

export interface AureliaFaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface AureliaSectionCopy {
  visible?: boolean;
  eyebrow?: string;
  title?: string;
  lede?: string;
}

export interface AureliaWeddingConfig {
  partnerOneName: string;
  partnerTwoName: string;
  monogram: string;
  familyIntro: string;
  marriedLine: string;
  dateDisplay: string;
  heroTagline: string;
  heroImageUrl?: string | null;
  heroOverlay?: number;
  celebrationCta: string;
  rsvpCta: string;
  rsvpByLabel?: string;
  storyEyebrow: string;
  storyTitle: string;
  storyImageUrl?: string | null;
  storyParagraphs: string[];
  storySignature: string;
  celebrationsEyebrow: string;
  celebrationsTitle: string;
  celebrationsLede: string;
  venuesEyebrow: string;
  venuesTitle: string;
  venuesLede: string;
  privateAddressCopy: string;
  dressEyebrow: string;
  dressTitle: string;
  dressLede: string;
  journeyEyebrow: string;
  journeyTitle: string;
  journeyLede: string;
  albumEyebrow: string;
  albumTitle: string;
  albumLede: string;
  albumUploadCta: string;
  albumViewCta: string;
  rsvpEyebrow?: string;
  rsvpTitle: string;
  giftsEyebrow: string;
  giftsTitle: string;
  giftsLede: string;
  giftsDetails?: string;
  faqEyebrow: string;
  faqTitle: string;
  finaleScript: string;
  finaleLine: string;
  finaleImageUrl?: string | null;
  countdownTitle: string;
  theme: AureliaThemeTokens;
  ceremonies: AureliaCeremony[];
  venues: AureliaVenueCard[];
  dressCodes: AureliaDressCode[];
  journey: AureliaJourneyItem[];
  faqs: AureliaFaqItem[];
  sections?: Partial<Record<AureliaSectionId, AureliaSectionCopy>>;
}
