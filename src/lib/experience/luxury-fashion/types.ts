/**
 * Reusable luxury fashion flagship opening — house DNA, not a one-off flyer.
 * Other houses later supply their own LuxuryFashionHouseConfig.
 */

export type FashionSilkStyle = "ivory-champagne" | "pearl-mocha" | "espresso-gold";

export type FashionNavStyle = "editorial-index" | "garment-tag" | "runway-chapters";

export type FashionNavDestination =
  | "experience"
  | "store-preview"
  | "collection"
  | "event-details"
  | "location"
  | "rsvp"
  | "share";

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
  filmCta: string;
  filmSkipLabel: string;
  navigationStyle: FashionNavStyle;
  navLabels: FashionNavLabel[];
  countdownBeforeLabel: string;
  countdownAfterLabel: string;
  finaleMessage: string;
  lookbookTitle: string;
  lookbookItems?: FashionLookbookItem[];
  /** Absolute ISO-8601 with offset. Countdown/calendar source of truth. */
  startAtIso: string;
  endAtIso: string;
  timeZone: string;
  filmUrl?: string | null;
  filmPosterUrl?: string | null;
}

export type FashionOpeningPhase =
  | "whisper"
  | "arming-silk"
  | "silk"
  | "silk-opening"
  | "arming-doors"
  | "doors"
  | "doors-opening"
  | "complete";

export const FASHION_NAV_DESTINATIONS: FashionNavDestination[] = [
  "experience",
  "store-preview",
  "collection",
  "event-details",
  "location",
  "rsvp",
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
