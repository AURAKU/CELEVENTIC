/**
 * Event Guide — public contract.
 *
 * Everything a guest (or an offline cache) ever receives is described here.
 * The shapes are deliberately narrow: no database ids, no contact details, no
 * admission tokens. `buildPublicPayload` is the only place allowed to construct
 * them, and it builds field by field rather than spreading a Prisma row.
 */

export const EVENT_GUIDE_TABS = ["programme", "seating", "menu"] as const;
export type EventGuideTabKey = (typeof EVENT_GUIDE_TABS)[number];

export const EVENT_GUIDE_PAYLOAD_FORMAT = "celeventic.event-guide/1";

export function isEventGuideTab(value: unknown): value is EventGuideTabKey {
  return typeof value === "string" && (EVENT_GUIDE_TABS as readonly string[]).includes(value);
}

/** `?tab=` deep link → tab, falling back to the organizer's default. */
export function resolveTabFromQuery(
  raw: unknown,
  fallback: EventGuideTabKey = "programme"
): EventGuideTabKey {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return isEventGuideTab(value) ? value : fallback;
}

/**
 * What a line of the programme is doing, when it is not an item of its own.
 *
 * The organizer decides this in their script — `# CEREMONY` is a heading,
 * `> …` is a subscript — and the reader falls back to the same two roles when
 * they did not say.
 *
 *  - `section` — a heading between blocks (`CEREMONY`, `RECEPTION`).
 *  - `note` — a subscript with no item above it to sit under.
 *
 * An ordinary item carries no kind at all, so every payload published before
 * any of this existed still reads exactly as it did.
 */
export const GUIDE_PROGRAMME_ITEM_KINDS = ["section", "note"] as const;
export type GuideProgrammeItemKind = (typeof GUIDE_PROGRAMME_ITEM_KINDS)[number];

export function isGuideProgrammeItemKind(value: unknown): value is GuideProgrammeItemKind {
  return (
    typeof value === "string" &&
    (GUIDE_PROGRAMME_ITEM_KINDS as readonly string[]).includes(value)
  );
}

export interface GuideProgrammeItem {
  id: string;
  time: string;
  title: string;
  description?: string;
  /** Absent on an ordinary item. See `GuideProgrammeItemKind`. */
  kind?: GuideProgrammeItemKind;
}

export interface GuideMenuSection {
  id: string;
  heading: string;
  items: string[];
}

export interface GuideMenu {
  body: string;
  sections: GuideMenuSection[];
  /** Optional externally hosted full menu (PDF/image). */
  url: string | null;
}

export interface GuideAttachment {
  label: string;
  url: string;
  kind: "pdf" | "image";
}

export interface GuideThemeTokens {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  fonts: {
    heading: string;
    script: string;
    body: string;
    eyebrow: string;
  };
  layout: string;
  backgroundImageUrl: string | null;
  accentWash: string;
  paperWash: string;
  /**
   * Colour for the small tracked labels (section headings, programme times).
   *
   * Derived from `colors.secondary`, darkened or lightened only as far as it
   * takes to clear 4.5:1 against the background. A decorative gold reads
   * beautifully as a rule but is unreadable as 11px type on cream, and the
   * decorative token stays untouched for flourishes.
   */
  labelColor: string;
  /**
   * The ink on a button filled with `colors.accent`.
   *
   * The guest's page has never painted `colors.background` on the accent — it
   * has always chosen dark or light ink by the accent's luminance. Recording
   * that choice here is what lets the publish gate measure the pair that
   * actually renders instead of a combination nobody draws, which is what was
   * failing readable invitation palettes at the publish button.
   */
  onActionColor: string;
}

export interface GuideHeader {
  eventTitle: string;
  celebrants: string | null;
  dateLabel: string | null;
  venue: string | null;
  welcome: string | null;
}

export interface GuideSeatingConfig {
  enabled: boolean;
  mode: "ADMISSION_CODE" | "GUEST_NAME";
  minQueryLength: number;
  maxMatches: number;
  note: string | null;
}

/**
 * The published snapshot. Cached verbatim by the service worker and shipped
 * inside the Venue Offline Pack, so it must never contain anything private.
 */
export interface EventGuidePayload {
  format: typeof EVENT_GUIDE_PAYLOAD_FORMAT;
  version: number;
  publishedAt: string | null;
  defaultTab: EventGuideTabKey;
  header: GuideHeader;
  theme: GuideThemeTokens;
  programme: GuideProgrammeItem[];
  menu: GuideMenu;
  attachments: GuideAttachment[];
  seating: GuideSeatingConfig;
  offlineEnabled: boolean;
}

export type GuideUnavailableReason =
  | "NOT_FOUND"
  | "WRONG_TYPE"
  | "REVOKED"
  | "DISABLED"
  | "EXPIRED"
  | "NOT_ENABLED"
  | "NOT_PUBLISHED"
  | "EVENT_CANCELLED";

export const GUIDE_UNAVAILABLE_COPY: Record<
  GuideUnavailableReason,
  { heading: string; body: string }
> = {
  NOT_FOUND: {
    heading: "This guide link is not active",
    body: "The link may have been mistyped or replaced. Please check the printed sign again, or ask a member of the host team.",
  },
  WRONG_TYPE: {
    heading: "This link points somewhere else",
    body: "That code belongs to a different part of the celebration. Please scan the Event Guide sign.",
  },
  REVOKED: {
    heading: "This guide link has been retired",
    body: "The hosts have issued a new code for this celebration. Please scan the sign displayed at the venue.",
  },
  DISABLED: {
    heading: "The guide is paused",
    body: "The hosts have temporarily turned off the event guide. Please try again shortly.",
  },
  EXPIRED: {
    heading: "This guide has closed",
    body: "Thank you for celebrating with us. The event guide for this celebration is no longer available.",
  },
  NOT_ENABLED: {
    heading: "The guide is not open yet",
    body: "The hosts have not opened the event guide for guests. Please check back closer to the day.",
  },
  NOT_PUBLISHED: {
    heading: "Almost ready",
    body: "The hosts are still putting the finishing touches to this guide. Please scan again a little later.",
  },
  EVENT_CANCELLED: {
    heading: "This celebration is no longer taking place",
    body: "Please contact the hosts directly if you need more information.",
  },
};

/** Result of a privacy-safe seating lookup. Never contains internal ids or contacts. */
export interface GuideSeatingMatch {
  partyName: string;
  tableNumber: string | null;
  seatLabel: string | null;
  zone: string | null;
  ceremonyRowLabel: string | null;
  ceremonySeatLabel: string | null;
  /** Named members of this party only — never anyone from another party. */
  partyMembers: string[];
  /** Unnamed plus-ones travelling with this party, shown as an allowance. */
  plusOnes: number;
  /**
   * This party's own admission code, for the seat card QR + digits.
   * Only returned after a successful lookup of *this* party — never for others.
   */
  admissionCode: string | null;
}

export type GuideSeatingOutcome =
  | { status: "ok"; match: GuideSeatingMatch }
  | { status: "query_too_short"; minQueryLength: number }
  | { status: "no_match" }
  | { status: "ambiguous"; matchCount: number }
  | { status: "disabled" }
  | { status: "rate_limited"; retryAfterSeconds: number };
