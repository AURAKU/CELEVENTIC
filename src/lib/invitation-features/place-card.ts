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
    monogram: asString(o.monogram, base.monogram).slice(0, 4).toUpperCase(),
    animation: pickEnum(o.animation, ANIMATIONS, base.animation),
    visibility: pickEnum(o.visibility, VISIBILITIES, base.visibility),
    sectionOrder:
      typeof o.sectionOrder === "number" && Number.isFinite(o.sectionOrder)
        ? Math.trunc(o.sectionOrder)
        : base.sectionOrder,
    preset: typeof o.preset === "string" ? o.preset : base.preset,
  };
}

/** Format the bold allowance line; `{n}` is replaced with the party size. */
export function formatAllowanceCopy(template: string, partySize: number): string {
  const n = Math.max(0, Math.trunc(partySize));
  const raw = (template || PLACE_CARD_DEFAULTS.allowanceDisplayWording).replace(
    /\{n\}/gi,
    String(n)
  );
  return raw.toUpperCase();
}

export interface PlaceCardRecipientInput {
  invitationName: string;
  guestName?: string | null;
  groupName?: string | null;
  partySize: number;
  assigned: boolean;
}

/** Resolve the line shown under the salutation. */
export function resolveRecipientLine(
  config: PlaceCardConfig,
  input: PlaceCardRecipientInput
): string {
  const name = (input.guestName || input.invitationName || "").trim();
  const group = (config.groupName || input.groupName || "").trim();

  switch (config.recipientDisplay) {
    case "group":
      return group || name || "Guest";
    case "both":
      if (group && name && group.toLowerCase() !== name.toLowerCase()) {
        return `${name} · ${group}`;
      }
      return name || group || "Guest";
    case "name":
    default:
      return name || group || "Guest";
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
}

/** Live party position, mirrored from the admission projection. */
export interface PlaceCardPartyState {
  allowance: number;
  admittedCount: number;
  /** Zero when nobody has arrived yet. */
  remainingCount: number;
}

export interface PlaceCardViewModel {
  heading: string;
  salutation: string;
  recipientLine: string;
  /** Bold allowance line, e.g. "THIS INVITATION ADMITS 3 GUESTS". */
  allowanceCopy: string;
  /** Present only while a group is part-way through arriving. */
  arrivalCopy: string | null;
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

/**
 * Guest-facing arrival copy for a part-arrived party.
 *
 * Deliberately plain: a guest reads "2 of your 3 guests have arrived", never
 * `PARTIALLY_ADMITTED`. Returns null when there is nothing worth saying (nobody
 * in yet, or the whole party is already inside).
 */
export function resolveArrivalCopy(party: PlaceCardPartyState): string | null {
  const allowance = Math.max(0, Math.trunc(party.allowance));
  const admitted = Math.max(0, Math.min(Math.trunc(party.admittedCount), allowance));
  if (allowance <= 1 || admitted <= 0) return null;

  const remaining = Math.max(0, allowance - admitted);
  if (remaining === 0) return `All ${allowance} of your guests have arrived.`;
  return (
    `${admitted} of your ${allowance} guests ${admitted === 1 ? "has" : "have"} arrived · ` +
    `${remaining} still welcome`
  );
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
  const monogram =
    config.monogram.trim() ||
    recipientLine
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase();

  return {
    heading: config.heading.trim() || headingFor(recipientType),
    salutation: config.salutation.trim(),
    recipientLine,
    allowanceCopy: formatAllowanceCopy(config.allowanceDisplayWording, allowance),
    arrivalCopy: resolveArrivalCopy(party),
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
