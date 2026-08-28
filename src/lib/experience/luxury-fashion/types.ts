/**
 * Reusable luxury fashion flagship opening — house DNA, not a one-off flyer.
 * Other houses later supply their own LuxuryFashionHouseConfig.
 */

import type {
  InvitationSocialLink,
  InvitationSocialPlatformId,
} from "@/lib/invitation/social-links";

export type FashionSilkStyle = "ivory-champagne" | "pearl-mocha" | "espresso-gold";

export type FashionNavStyle = "editorial-index" | "garment-tag" | "runway-chapters";

export type FashionNavDestination =
  | "experience"
  | "store-preview"
  | "collection"
  | "event-details"
  | "location"
  | "rsvp"
  | "share"
  | "social";

export type FashionSocialPlatformId = InvitationSocialPlatformId;
export type FashionSocialLink = InvitationSocialLink;

export interface FashionNavLabel {
  id: FashionNavDestination;
  label: string;
}

export interface FashionLookbookItem {
  id: string;
  url: string;
  type: "image" | "video";
  caption?: string;
  collectionName?: string;
  posterUrl?: string | null;
}

export interface LuxuryFashionHouseConfig {
  houseName: string;
  monogram: string;
  eventTitle: string;
  unveilingLabel: string;
  teaserLine: string;
  whisperLine: string;
  whisperEyebrow?: string;
  whisperScript?: string;
  hubLede: string;
  swipeHint: string;
  portalWelcome: string;
  portalPrompt: string;
  rsvpHeading: string;
  rsvpAcceptedLabel: string;
  finaleKicker: string;
  hoursLabel: string;
  datesLabel: string;
  locationName: string;
  address: string;
  mapsUrl: string;
  silkStyle: FashionSilkStyle;
  markVariant?: "letter" | "botanical";
  logoUrl?: string | null;
  filmCta: string;
  filmSkipLabel: string;
  navigationStyle: FashionNavStyle;
  navLabels: FashionNavLabel[];
  countdownBeforeLabel: string;
  countdownAfterLabel: string;
  finaleMessage: string;
  lookbookTitle: string;
  lookbookItems?: FashionLookbookItem[];
  silkBedUrl?: string | null;
  /** Absolute ISO-8601 with offset. Countdown/calendar source of truth. */
  startAtIso: string;
  endAtIso: string;
  timeZone: string;
  filmUrl?: string | null;
  filmPosterUrl?: string | null;
  visitDayOptions?: { id: string; label: string }[];
  /** Dedicated Stay Connected / Follow the house chapter. Off unless a preset or Studio enables it. */
  showSocialSection?: boolean;
  instagramHandle?: string;
  instagramUrl?: string;
  socialIntroText?: string;
  socialTitle?: string;
  socialCtaLabel?: string;
  showSocialIconsInFinale?: boolean;
  /** Extra platforms later. Instagram can also live here. */
  socialLinks?: FashionSocialLink[];
  chapters?: {
    boutique?: boolean;
    film?: boolean;
    collection?: boolean;
    countdown?: boolean;
    maps?: boolean;
    rsvp?: boolean;
    share?: boolean;
    social?: boolean;
  };
}

export type FashionOpeningPhase =
  | "arming-silk"
  | "silk"
  | "silk-opening"
  | "doors-opening"
  | "film"
  | "complete";

export const FASHION_NAV_DESTINATIONS: FashionNavDestination[] = [
  "experience",
  "store-preview",
  "collection",
  "event-details",
  "location",
  "rsvp",
  "social",
  "share",
];

export {
  FASHION_DOORS_OPEN_MS,
  FASHION_EXIT_POINTER_MS,
  FASHION_GESTURE_ARM_MS,
  FASHION_REDUCED_OPEN_MS,
  FASHION_SILK_DRAG_PX,
  FASHION_SILK_OPEN_MS,
  FASHION_WHISPER_MS,
} from "./tokens";
