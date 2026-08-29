/**
 * Personalised Place Card, shared invitation feature.
 *
 * One module for every template (existing and future). Config lives in
 * `Invitation.featureConfig.PLACE_CARD`; presentation tokens come from the
 * template feature adapter. Live invitations pick up changes on the next
 * request because the public renderer is force-dynamic.
 *
 * Party allowance (`Invitation.admissionAllowance` / guest rows + plusOnes)
 * remains the source of truth for how many heads the invite admits.
 */

export const PlaceCardRecipientType = {
  INDIVIDUAL: "individual",
  COUPLE: "couple",
  PLUS_ONE: "plus_one",
  FAMILY: "family",
  HOUSEHOLD: "household",
  ORGANISATION: "organisation",
  RESERVED_TABLE: "reserved_table",
  CUSTOM: "custom",
} as const;

export type PlaceCardRecipientType =
  (typeof PlaceCardRecipientType)[keyof typeof PlaceCardRecipientType];

export const PlaceCardTheme = {
  INHERIT: "inherit",
  CLASSIC: "classic",
  ELEGANT: "elegant",
  MODERN: "modern",
  FESTIVE: "festive",
} as const;

export type PlaceCardTheme = (typeof PlaceCardTheme)[keyof typeof PlaceCardTheme];

export const PlaceCardFrameStyle = {
  NONE: "none",
  LINE: "line",
  ORNATE: "ornate",
  SOFT: "soft",
} as const;

export type PlaceCardFrameStyle =
  (typeof PlaceCardFrameStyle)[keyof typeof PlaceCardFrameStyle];

export const PlaceCardAnimation = {
  NONE: "none",
  FADE: "fade",
  SHIMMER: "shimmer",
} as const;

export type PlaceCardAnimation =
  (typeof PlaceCardAnimation)[keyof typeof PlaceCardAnimation];

export const PlaceCardVisibility = {
  ALWAYS: "always",
  WHEN_ASSIGNED: "when_assigned",
} as const;

export type PlaceCardVisibility =
  (typeof PlaceCardVisibility)[keyof typeof PlaceCardVisibility];

export const PlaceCardRecipientDisplay = {
  NAME: "name",
  GROUP: "group",
  BOTH: "both",
} as const;

export type PlaceCardRecipientDisplay =
  (typeof PlaceCardRecipientDisplay)[keyof typeof PlaceCardRecipientDisplay];

export interface PlaceCardConfig {
  enabled: boolean;
  heading: string;
  salutation: string;
  recipientDisplay: PlaceCardRecipientDisplay;
  recipientType: PlaceCardRecipientType;
  groupName: string;
  wording: string;
  /** Template with `{n}` for party size, e.g. "THIS INVITATION ADMITS {n} GUESTS". */
  allowanceDisplayWording: string;
  supportingMessage: string;
  theme: PlaceCardTheme;
  frameStyle: PlaceCardFrameStyle;
  monogram: string;
  animation: PlaceCardAnimation;
  visibility: PlaceCardVisibility;
  /** Optional order override for PLACE_CARD; null inherits registry default. */
  sectionOrder: number | null;
  preset: string | null;
}

export const PLACE_CARD_DEFAULTS: PlaceCardConfig = {
  enabled: true,
  heading: "A place is reserved for you",
  salutation: "Dear",
  recipientDisplay: "name",
  recipientType: "individual",
  groupName: "",
  wording: "",
  allowanceDisplayWording: "THIS INVITATION ADMITS {n} GUESTS",
  supportingMessage: "",
  theme: "inherit",
  frameStyle: "line",
  monogram: "",
  animation: "fade",
  visibility: "when_assigned",
  sectionOrder: null,
  preset: null,
};

/** Named presets organisers can apply in one click. */
export const PLACE_CARD_PRESETS: Record<
  string,
  Partial<PlaceCardConfig> & { label: string }
> = {
  classic: {
    label: "Classic",
    heading: "A place is reserved for you",
    salutation: "Dear",
    theme: "classic",
    frameStyle: "line",
    animation: "fade",
    allowanceDisplayWording: "THIS INVITATION ADMITS {n} GUESTS",
  },
  couple: {
    label: "Couple",
    heading: "Together at our table",
    salutation: "Dear",
    recipientType: "couple",
    recipientDisplay: "both",
    theme: "elegant",
    frameStyle: "ornate",
    allowanceDisplayWording: "THIS INVITATION ADMITS {n} GUESTS",
  },
  family: {
    label: "Family",
    heading: "Your family is welcome",
    salutation: "Dear",
    recipientType: "family",
    recipientDisplay: "group",
    theme: "classic",
    frameStyle: "soft",
    allowanceDisplayWording: "THIS INVITATION ADMITS {n} GUESTS",
  },
  organisation: {
    label: "Organisation",
    heading: "A reserved place for your party",
    salutation: "To",
    recipientType: "organisation",
    recipientDisplay: "group",
    theme: "modern",
    frameStyle: "line",
    allowanceDisplayWording: "THIS INVITATION ADMITS {n} GUESTS",
  },
  reserved_table: {
    label: "Reserved table",
    heading: "Your table awaits",
    salutation: "Dear",
    recipientType: "reserved_table",
    recipientDisplay: "group",
    theme: "elegant",
    frameStyle: "ornate",
    allowanceDisplayWording: "THIS TABLE SEATS {n} GUESTS",
  },
};

const RECIPIENT_TYPES = new Set<string>(Object.values(PlaceCardRecipientType));
const THEMES = new Set<string>(Object.values(PlaceCardTheme));
const FRAMES = new Set<string>(Object.values(PlaceCardFrameStyle));
const ANIMATIONS = new Set<string>(Object.values(PlaceCardAnimation));
const VISIBILITIES = new Set<string>(Object.values(PlaceCardVisibility));
const DISPLAYS = new Set<string>(Object.values(PlaceCardRecipientDisplay));

function asString(v: unknown, fallback: string): string {
  return typeof v === "string" ? v : fallback;
}

function asBool(v: unknown, fallback: boolean): boolean {
  return typeof v === "boolean" ? v : fallback;
}

function pickEnum<T extends string>(v: unknown, allowed: Set<string>, fallback: T): T {
  return typeof v === "string" && allowed.has(v) ? (v as T) : fallback;
}

/** A preset's field overrides, without its human-facing label. */
function presetPatch(presetId: string): Partial<PlaceCardConfig> {
  const patch: Partial<PlaceCardConfig> & { label?: string } = {
    ...PLACE_CARD_PRESETS[presetId],
  };
  delete patch.label;
  return patch;
}

/** Merge sparse organiser overrides onto platform defaults. */
export function resolvePlaceCardConfig(
  raw: unknown,
  presetId?: string | null
): PlaceCardConfig {
  const base: PlaceCardConfig = { ...PLACE_CARD_DEFAULTS };
  if (presetId && PLACE_CARD_PRESETS[presetId]) {
    Object.assign(base, presetPatch(presetId));
    base.preset = presetId;
  }

  if (!raw || typeof raw !== "object") return base;
  const o = raw as Record<string, unknown>;

  if (typeof o.preset === "string" && PLACE_CARD_PRESETS[o.preset] && !presetId) {
    Object.assign(base, presetPatch(o.preset));
    base.preset = o.preset;
  }

  return {
    enabled: asBool(o.enabled, base.enabled),
    heading: asString(o.heading, base.heading),
    salutation: asString(o.salutation, base.salutation),
    recipientDisplay: pickEnum(o.recipientDisplay, DISPLAYS, base.recipientDisplay),
    recipientType: pickEnum(o.recipientType, RECIPIENT_TYPES, base.recipientType),
    groupName: asString(o.groupName, base.groupName),
    wording: asString(o.wording, base.wording),
    allowanceDisplayWording: asString(
      o.allowanceDisplayWording,
      base.allowanceDisplayWording
    ),
    supportingMessage: asString(o.supportingMessage, base.supportingMessage),
    theme: pickEnum(o.theme, THEMES, base.theme),
    frameStyle: pickEnum(o.frameStyle, FRAMES, base.frameStyle),
    monogram: formatPlaceCardMonogram(asString(o.monogram, base.monogram)),
    animation: pickEnum(o.animation, ANIMATIONS, base.animation),
    visibility: pickEnum(o.visibility, VISIBILITIES, base.visibility),
    sectionOrder:
      typeof o.sectionOrder === "number" && Number.isFinite(o.sectionOrder)
        ? Math.trunc(o.sectionOrder)
        : base.sectionOrder,
    preset: typeof o.preset === "string" ? o.preset : base.preset,
  };
}

/**
 * Guest-facing invitation capacity.
 *
 * Unassigned invitations show nothing. Assigned invitations show the exact
 * number of additional guests so the recipient knows their party allowance.
 */
export function formatAllowanceCopy(
  _template: string,
  partySize: number,
  opts?: { assigned?: boolean }
): string {
  if (!opts?.assigned) return "";
  const capacity = Math.max(1, Math.trunc(partySize));
  if (capacity === 1) return "This invitation admits only you.";
  const additionalGuests = capacity - 1;
  return `This invitation admits you and ${additionalGuests} additional ${
    additionalGuests === 1 ? "guest" : "guests"
  }.`;
}

export interface PlaceCardRecipientInput {
  invitationName: string;
  guestName?: string | null;
  groupName?: string | null;
  partySize: number;
  assigned: boolean;
}

/** Ceremony / event titles must never appear as the place-card recipient. */
export function looksLikeEventTitle(value: string): boolean {
  return /\b(ceremony|wedding|invitation|marriage|celebration|funeral|memorial|birthday|engagement|anniversary|opening|flagship|launch|unveiling|boutique)\b/i.test(
    value.trim()
  );
}

/** Join party member names for the place-card hero line. */
export function formatPartyGuestNames(names: Array<string | null | undefined>): string | null {
  const cleaned = names.map((n) => (n ?? "").trim()).filter(Boolean);
  if (!cleaned.length) return null;
  if (cleaned.length === 1) return cleaned[0];
  if (cleaned.length === 2) return `${cleaned[0]} & ${cleaned[1]}`;
  return `${cleaned.slice(0, -1).join(", ")} & ${cleaned[cleaned.length - 1]}`;
}

/**
 * Resolve the one recipient this invitation/pass belongs to.
 *
 * A canonical event invitation can have many Guest rows for organizer
 * management. Those rows must never be joined into a guest-facing place card.
 */
export function resolvePlaceCardGuestName(input: {
  tokenGuest?: string | null;
  passDisplayName?: string | null;
  guestNames: Array<string | null | undefined>;
}): string | null {
  const candidates = [input.tokenGuest, input.passDisplayName];
  for (const candidate of candidates) {
    const value = (candidate ?? "").trim();
    if (value && !isAnonymousRecipientName(value)) return value;
  }

  const namedGuests = input.guestNames
    .map((name) => (name ?? "").trim())
    .filter((name) => name && !isAnonymousRecipientName(name));
  return namedGuests.length === 1 ? namedGuests[0] : null;
}


/** Format place-card badge initials, preserving pipe seals (`C | J`). */
export function formatPlaceCardMonogram(raw?: string | null): string {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return "";

  // Prefer the seal display form so "CJ" / "C|J" / "C | J" all render as "C | J".
  const pipeParts = trimmed
    .replace(/[^a-zA-ZÀ-ÿ\s|&·•.]/g, "")
    .split(/\s*[|&·•.]\s*/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (
    pipeParts.length === 2 &&
    pipeParts.every((p) => p.length === 1 && /^[a-zA-ZÀ-ÿ]$/i.test(p))
  ) {
    return `${pipeParts[0].toUpperCase()} | ${pipeParts[1].toUpperCase()}`;
  }

  const letters = trimmed.replace(/[^a-zA-ZÀ-ÿ]/g, "").toUpperCase();
  if (letters.length === 2) return `${letters[0]} | ${letters[1]}`;
  return letters.slice(0, 3);
}

/**
 * Derive a personalized badge from the invited guest's first and last names.
 * Common honorifics are ignored, so "Mr Kofi Mensah" becomes "K | M".
 */
export function deriveGuestPlaceCardMonogram(name?: string | null): string {
  const honorifics = /^(mr|mrs|ms|miss|dr|prof|rev|reverend|hon|pastor|engr)\.?$/i;
  const parts = (name ?? "")
    .trim()
    .split(/\s+/)
    .map((part) => part.replace(/^[^a-zA-ZÀ-ÿ]+|[^a-zA-ZÀ-ÿ]+$/g, ""))
    .filter((part) => part && !honorifics.test(part));

  if (!parts.length) return "";
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return formatPlaceCardMonogram(`${first}${last}`);
}

/** @deprecated Prefer formatPlaceCardMonogram — kept for callers that expect letters only. */
export function compactPlaceCardMonogram(raw?: string | null): string {
  return (raw ?? "")
    .replace(/[^a-zA-ZÀ-ÿ]/g, "")
    .toUpperCase()
    .slice(0, 3);
}

/** Default place-card addressee when no guest name is assigned. */
export const PLACE_CARD_FALLBACK_RECIPIENT = "Invited Guest";

/** True when a candidate string is not a real guest / party addressee. */
export function isAnonymousRecipientName(value?: string | null): boolean {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return true;
  if (looksLikeEventTitle(trimmed)) return true;
  return /^(guest|invited guest|dear invited guest)$/i.test(trimmed);
}

/**
 * Resolve the hero name line under the salutation.
 *
 * Only a real guest / party name is allowed here. Ceremony titles and blank
 * invitations fall back to "Invited Guest".
 */
export function resolveRecipientLine(
  config: PlaceCardConfig,
  input: PlaceCardRecipientInput
): string {
  const rawGuest = (input.guestName || "").trim();
  const guestName = isAnonymousRecipientName(rawGuest) ? "" : rawGuest;
  // Invitation labels are often the ceremony title ("Traditional Marriage
  // Ceremony") — never promote them to the guest-facing name line.
  const invitationLabel = looksLikeEventTitle(input.invitationName)
    ? ""
    : (input.invitationName || "").trim();
  const safeInvitationLabel = isAnonymousRecipientName(invitationLabel) ? "" : invitationLabel;
  // Prefer an assigned guest name. Never use a ceremony/event title here.
  const name = guestName || (input.assigned ? safeInvitationLabel : "");
  const group = (config.groupName || input.groupName || "").trim();
  const safeGroup = isAnonymousRecipientName(group) ? "" : group;

  switch (config.recipientDisplay) {
    case "group":
      return safeGroup || name || PLACE_CARD_FALLBACK_RECIPIENT;
    case "both":
      if (safeGroup && name && safeGroup.toLowerCase() !== name.toLowerCase()) {
        return `${name} · ${safeGroup}`;
      }
      return name || safeGroup || PLACE_CARD_FALLBACK_RECIPIENT;
    case "name":
    default:
      return name || safeGroup || PLACE_CARD_FALLBACK_RECIPIENT;
  }
}

/** Whether the place card should render for this invitation/guest. */
export function shouldShowPlaceCard(
  config: PlaceCardConfig,
  featureEnabled: boolean,
  assigned: boolean
): boolean {
  if (!featureEnabled || !config.enabled) return false;
  if (config.visibility === "always") return true;
  return assigned;
}

/** Infer a sensible recipient type from party size / naming when unset. */
export function inferRecipientType(
  partySize: number,
  opts?: { hasGroupName?: boolean; plusOnes?: number }
): PlaceCardRecipientType {
  if (opts?.hasGroupName) return "custom";
  if (partySize <= 1) return "individual";
  if (partySize === 2 && (opts?.plusOnes ?? 0) === 1) return "plus_one";
  if (partySize === 2) return "couple";
  if (partySize <= 6) return "family";
  return "household";
}

/* -------------------------------------------------------------------------- */
/*  View model                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Everything the renderer needs to draw a place card, resolved on the server.
 * Declared here (not in the service) so client components can import the type
 * without pulling Prisma into the browser bundle.
 */
export interface PlaceCardViewData {
  config: PlaceCardConfig;
  recipient: PlaceCardRecipientInput;
  party: PlaceCardPartyState;
  /** Personalized guest's organiser-assigned place, when available. */
  seating: PlaceCardSeating | null;
}

/** Personalized guest seating for the invitation place card (dual-stage). */
export interface PlaceCardSeating {
  reception: {
    tableNumber: string;
    seatLabel: string | null;
    zone: string | null;
    /** Organiser choice: table-only capacity vs table + chair. */
    mode: "TABLE_ONLY" | "TABLE_AND_CHAIR";
  } | null;
  ceremony: {
    rowLabel: string;
    seatLabel: string | null;
    zone: string | null;
  } | null;
}

/** Personalized invitation capacity. Admission state is intentionally excluded. */
export interface PlaceCardPartyState {
  allowance: number;
}

export function placeCardHasSeating(seating: PlaceCardSeating | null | undefined): boolean {
  return Boolean(seating?.reception?.tableNumber || seating?.ceremony?.rowLabel || seating?.ceremony?.seatLabel);
}

export interface PlaceCardViewModel {
  heading: string;
  salutation: string;
  recipientLine: string;
  /** Capacity line for assigned guests; blank when unassigned. */
  allowanceCopy: string;
  wording: string;
  supportingMessage: string;
  monogram: string;
  theme: PlaceCardTheme;
  frameStyle: PlaceCardFrameStyle;
  animation: PlaceCardAnimation;
  recipientType: PlaceCardRecipientType;
  /** True for anything the organiser addressed to more than one head. */
  isGroup: boolean;
}

/** Recipient-type-aware fallback heading, used when the organiser left it blank. */
function headingFor(type: PlaceCardRecipientType): string {
  switch (type) {
    case "couple":
      return "Together at our table";
    case "family":
    case "household":
      return "Your family is welcome";
    case "organisation":
      return "A reserved place for your party";
    case "reserved_table":
      return "Your table awaits";
    default:
      return PLACE_CARD_DEFAULTS.heading;
  }
}

/**
 * Build everything the shared place-card component renders.
 *
 * Pure, so the same model can be asserted in tests and reused by any template
 * adapter. Party allowance is passed in from the admission projection, this
 * function never invents a number.
 */
export function buildPlaceCardViewModel(
  config: PlaceCardConfig,
  recipient: PlaceCardRecipientInput,
  party: PlaceCardPartyState
): PlaceCardViewModel {
  const allowance = Math.max(0, Math.trunc(party.allowance));
  const recipientType =
    config.recipientType === PLACE_CARD_DEFAULTS.recipientType
      ? inferRecipientType(allowance, { hasGroupName: Boolean(config.groupName?.trim()) })
      : config.recipientType;

  const recipientLine = resolveRecipientLine(config, recipient);
  // The server resolves a personalized guest monogram first, then the event
  // seal fallback for non-specific invitations (e.g. "C | J").
  const configuredMonogram = formatPlaceCardMonogram(config.monogram);
  const monogram = configuredMonogram;
  const configuredSalutation = config.salutation.trim() || "Dear";
  const salutation = /^dear\b/i.test(recipientLine) ? "" : configuredSalutation;

  return {
    heading: config.heading.trim() || headingFor(recipientType),
    salutation,
    recipientLine,
    allowanceCopy: formatAllowanceCopy(config.allowanceDisplayWording, allowance, {
      assigned: recipient.assigned,
    }),
    wording: config.wording.trim(),
    supportingMessage: config.supportingMessage.trim(),
    monogram,
    theme: config.theme,
    frameStyle: config.frameStyle,
    animation: config.animation,
    recipientType,
    isGroup: allowance > 1,
  };
}
