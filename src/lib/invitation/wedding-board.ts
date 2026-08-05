/**
 * Editable copy, design choices and feature toggles for the "Forever Afaris"
 * luxury wedding template (layout `forever-afaris-wedding`).
 *
 * Mirrors the Traditional Marriage vision-board pattern
 * (see src/lib/invitation/vision-board.ts): a single serialisable config object
 * stored on `design.studio.weddingBoard`, merged with defaults at render time so
 * every field stays admin/user editable while the template always has a full,
 * premium fallback. No external image URL is required — the envelope, wax seal,
 * and gate render as CSS/SVG so the template is complete with zero uploads.
 */

export interface WeddingBoardFeatureFlags {
  /** Personalised "Invited guest" greeting from the guest link */
  guestWelcome?: boolean;
  /** Hero portrait framed in a lace/botanical arch (uses the hero upload) */
  heroPortrait?: boolean;
  /** Live countdown to the ceremony */
  countdown?: boolean;
  /** Full personalised greeting scene addressed to the named guest */
  greeting?: boolean;
  /** Programme / order-of-day timeline */
  programme?: boolean;
  /** Venue block + Google Maps CTA */
  location?: boolean;
  /** Dress code section */
  dressCode?: boolean;
  /** Adults-only / named-guest policy section */
  guestPolicy?: boolean;
  /** Optional couple story section */
  story?: boolean;
  /** Optional gallery strip (reference / gallery uploads only — never the hero portrait) */
  gallery?: boolean;
  /** Scratch-to-reveal keepsake message */
  scratch?: boolean;
  /** Kindly Respond (RSVP) section */
  rsvp?: boolean;
  /** Closing / appreciation scene */
  closing?: boolean;
  /** Family introduction scene */
  familyIntro?: boolean;
  /** Memory Vault upload call-to-action */
  memory?: boolean;
}

export interface WeddingBoardRsvpContact {
  name: string;
  phone: string;
}

export interface WeddingBoardProgrammeItem {
  /** Stable key for list rendering / editor reordering */
  id: string;
  time: string;
  title: string;
  description?: string;
}

/** Envelope paper treatment shown in the opening ceremony. */
export type WeddingEnvelopeStyle =
  | "blush-floral"
  | "ivory-lace"
  | "champagne-botanical"
  | "rose-watercolour";

/** Gate architecture rebuilt in SVG for the reveal. */
export type WeddingGateStyle = "golden-baroque" | "ivory-arch" | "botanical-trellis";

/** Wax colour poured for the seal. */
export type WeddingSealColor =
  | "champagne"
  | "rose-gold"
  | "blush"
  | "ivory"
  | "emerald"
  | "burgundy";

/** Relief pressed into the wax. */
export type WeddingSealMotif = "monogram" | "swan" | "rose" | "laurel";

/**
 * Every scene the invitation body can render, in the order the ceremony was
 * designed to flow. Hosts may reorder or hide any of them.
 */
export type WeddingSectionId =
  | "hero"
  | "family"
  | "details"
  | "countdown"
  | "greeting"
  | "programme"
  | "venue"
  | "dressCode"
  | "guestPolicy"
  | "rsvp"
  | "story"
  | "gallery"
  | "scratch"
  | "memory"
  | "closing";

export const WEDDING_SECTION_ORDER: WeddingSectionId[] = [
  "hero",
  "family",
  "details",
  "countdown",
  "greeting",
  "programme",
  "venue",
  "dressCode",
  "guestPolicy",
  "story",
  "gallery",
  "scratch",
  "memory",
  "rsvp",
  "closing",
];

const SECTION_ID_SET = new Set<string>(WEDDING_SECTION_ORDER);

export interface WeddingBoardContent {
  // — Opening ceremony —
  /** Hint shown under the wax seal ("Tap to open") */
  openingInstruction?: string;
  /** Two-letter monogram / short word on the wax seal (e.g. "J | C") */
  sealMonogram?: string;
  /** Title revealed on the intro gate (e.g. "#THE FOREVER AFARIS") */
  gateWord?: string;
  /** Line addressed on the envelope face, above the seal */
  envelopeAddressLine?: string;
  /** Paper treatment of the envelope */
  envelopeStyle?: WeddingEnvelopeStyle;
  /** Architecture of the gate that parts into the invitation */
  gateStyle?: WeddingGateStyle;
  /** Wax colour of the seal */
  sealColor?: WeddingSealColor;
  /** Relief pressed into the wax */
  sealMotif?: WeddingSealMotif;
  /** Fire a soft vibration when the seal lifts (supported devices only) */
  haptics?: boolean;

  // — Palette (blank = template default) —
  /** Champagne accent — seals, rules, gate filigree */
  accentColor?: string;
  /** Blush wash behind the envelope and section fills */
  blushColor?: string;
  /** Deep ink for headings */
  inkColor?: string;
  /** Page canvas / ivory */
  canvasColor?: string;

  // — Hero announcement —
  /** Single announcement phrase (e.g. “TOGETHER WITH THEIR FAMILIES”) — shown once in the hero */
  eyebrow?: string;
  scriptTitle?: string;
  /**
   * Optional distinct heading for the family scene only.
   * Leave blank to avoid repeating the hero eyebrow — defaults and merges strip
   * any phrase that matches `eyebrow` (case/spacing insensitive).
   */
  familyHeading?: string;
  familyIntro?: string;
  coupleName1?: string;
  coupleName2?: string;
  invitationCopy?: string;
  hashtag?: string;
  /** Caption printed under the hero portrait */
  heroCaption?: string;

  // — Event details —
  displayDate?: string;
  weekday?: string;
  timeLabel?: string;
  receptionText?: string;
  accessNote?: string;
  venueName?: string;
  venueAddress?: string;
  mapUrl?: string;
  mapButtonLabel?: string;

  // — Countdown —
  countdownHeading?: string;
  /** ISO date-time the countdown targets; falls back to the event start date */
  countdownTarget?: string;
  countdownExpiredMessage?: string;

  // — Personalised greeting —
  greetingHeading?: string;
  greetingBody?: string;
  /** Used when a guest opens a link with no name attached */
  greetingFallbackName?: string;

  // — Programme —
  programmeHeading?: string;
  programmeItems?: WeddingBoardProgrammeItem[];

  // — Dress code —
  dressCodeHeading?: string;
  dressCodeLadies?: string;
  dressCodeGents?: string;

  // — Guest / child policy —
  guestPolicyHeading?: string;
  guestPolicyBody?: string;

  // — Optional couple story —
  storyHeading?: string;
  storyBody?: string;

  // — Optional gallery —
  galleryHeading?: string;

  // — Scratch to reveal —
  scratchHeading?: string;
  scratchPrompt?: string;
  scratchMessage?: string;

  // — RSVP —
  rsvpHeading?: string;
  rsvpContacts?: WeddingBoardRsvpContact[];

  // — Closing —
  closingHeading?: string;
  closingMessage?: string;
  closingSignature?: string;
  replayLabel?: string;

  // — Memory Vault —
  memoryHeading?: string;
  memoryBody?: string;
  memoryCta?: string;

  /** Host-chosen scene order; unknown/missing ids fall back to the design order */
  sectionOrder?: WeddingSectionId[];
  features?: WeddingBoardFeatureFlags;
}

/** Default wax-seal monogram for the Forever Afaris wedding. */
export const FOREVER_AFARIS_DEFAULT_SEAL = "J | C";

/**
 * Fully-populated defaults — the exact mandated wedding content. Every field is
 * still overridable through `design.studio.weddingBoard`.
 */
export const DEFAULT_WEDDING_BOARD: Required<
  Omit<
    WeddingBoardContent,
    "features" | "rsvpContacts" | "programmeItems" | "sectionOrder"
  >
> & {
  rsvpContacts: WeddingBoardRsvpContact[];
  programmeItems: WeddingBoardProgrammeItem[];
  sectionOrder: WeddingSectionId[];
  features: Required<WeddingBoardFeatureFlags>;
} = {
  openingInstruction: "Lift the seal to open",
  sealMonogram: FOREVER_AFARIS_DEFAULT_SEAL,
  gateWord: "#THE FOREVER AFARIS",
  envelopeAddressLine: "You are cordially invited",
  envelopeStyle: "blush-floral",
  gateStyle: "golden-baroque",
  sealColor: "champagne",
  sealMotif: "monogram",
  haptics: true,

  accentColor: "",
  blushColor: "",
  inkColor: "",
  canvasColor: "",

  eyebrow: "TOGETHER WITH THEIR FAMILIES",
  scriptTitle: "The Wedding",
  familyIntro:
    "The Afari and Opoku families warmly welcome you to share in the joy of this union, the day two families become one.",
  coupleName1: "JEFFERY OWURAKU AFARI",
  coupleName2: "FRANCISCA CHELSY SERWAAH OPOKU",
  invitationCopy:
    "Joyfully request the honor of your presence at the ceremony of their marriage",
  hashtag: "#TheForeverAfaris",
  heroCaption: "",

  displayDate: "AUGUST • 15 • 2026",
  weekday: "SATURDAY",
  timeLabel: "2:00 PM",
  receptionText: "Reception follows",
  accessNote: "STRICTLY BY INVITATION",
  venueName: "SUBTLE CLASS EVENT CENTRE, OGBOJO.",
  venueAddress: "Ogbojo, Greater Accra",
  mapUrl: "",
  mapButtonLabel: "Tap here for Google Map directions",

  countdownHeading: "Counting Down To Forever",
  countdownTarget: "2026-08-15T14:00:00",
  countdownExpiredMessage: "Today we say I do",

  greetingHeading: "A Note For You",
  greetingBody:
    "Of all the people we could have shared this day with, we chose you. Thank you for standing with us as we begin forever.",
  greetingFallbackName: "Our Treasured Guest",

  programmeHeading: "Order Of The Day",
  programmeItems: [
    { id: "arrival", time: "1:30 PM", title: "Guest Arrival", description: "Welcome drinks & seating" },
    { id: "ceremony", time: "2:00 PM", title: "Wedding Ceremony", description: "The exchange of vows" },
    { id: "photos", time: "3:30 PM", title: "Photographs", description: "Portraits with the couple" },
    { id: "reception", time: "4:30 PM", title: "Reception", description: "Dining, toasts & dancing" },
  ],

  dressCodeHeading: "DRESS CODE",
  dressCodeLadies:
    "Embrace the occasion with elegant attire. Think bold, vibrant colours with a luxurious and timeless finish.",
  dressCodeGents:
    "Please join us in classic black-tie attire. A tuxedo or tailored suit will keep the evening sophisticated and stylish.",

  guestPolicyHeading: "ARE KIDS ALLOWED OR CAN I BRING A GUEST?",
  guestPolicyBody:
    "While we adore children, this celebration will be an adults-only event due to venue capacity restrictions. Due to limited capacity, we can only accommodate guests whose names appear on the invitation. We appreciate your cooperation.",

  storyHeading: "Our Story",
  storyBody:
    "Two families, one forever. From a first hello to this joyful yes, we can't wait to celebrate the beginning of our always with you.",

  galleryHeading: "Moments",

  scratchHeading: "A Little Secret",
  scratchPrompt: "Scratch to reveal",
  scratchMessage:
    "Save the first dance for us, and stay for the champagne tower at sunset.",

  rsvpHeading: "R.S.V.P",
  rsvpContacts: [
    { name: "JUSTINE KUFFOUR", phone: "+233 595 968 686" },
    { name: "MAAME YEBOAH", phone: "+233 242 651 828" },
  ],

  closingHeading: "With Love & Gratitude",
  closingMessage:
    "Your presence is the greatest gift. We look forward to celebrating this beautiful day with you.",
  closingSignature: "Jeffery & Francisca",
  replayLabel: "Replay opening",

  // Empty on purpose: hero `eyebrow` already carries “Together with their families”.
  familyHeading: "",
  memoryHeading: "Memory Vault",
  memoryBody:
    "Every photo and video you capture belongs in our album. Upload yours and we will treasure it forever.",
  memoryCta: "Add your memories",

  sectionOrder: WEDDING_SECTION_ORDER,
  features: {
    guestWelcome: true,
    heroPortrait: true,
    countdown: true,
    greeting: true,
    programme: true,
    location: true,
    dressCode: true,
    guestPolicy: true,
    story: true,
    gallery: true,
    scratch: false,
    rsvp: true,
    closing: true,
    familyIntro: true,
    memory: true,
  },
};

export type ResolvedWeddingBoard = typeof DEFAULT_WEDDING_BOARD;

/**
 * Repair the first-generation Afaris name snapshot without overriding genuine
 * host edits. That snapshot omitted Jeffery's first name and occasionally
 * stored only Francisca's first name.
 */
export function resolveAfarisCoupleNames(
  coupleName1: string | null | undefined,
  coupleName2: string | null | undefined
): { coupleName1: string; coupleName2: string } {
  const groom = coupleName1?.trim() ?? "";
  const bride = coupleName2?.trim() ?? "";
  return {
    coupleName1: /^owuraku\s+afari$/i.test(groom)
      ? DEFAULT_WEDDING_BOARD.coupleName1
      : groom,
    coupleName2: /^francisca$/i.test(bride)
      ? DEFAULT_WEDDING_BOARD.coupleName2
      : bride,
  };
}

/** Legacy studio value before the full hashtag title shipped. */
const LEGACY_GATE_WORDS = new Set(["forever"]);

/**
 * Guest-facing intro title. Upgrades the short legacy gate word to the full
 * Forever Afaris line so mobile never shows a cropped single word.
 */
export function resolveGateTitle(gateWord?: string | null): string {
  const trimmed = gateWord?.trim() ?? "";
  if (!trimmed || LEGACY_GATE_WORDS.has(trimmed.toLowerCase())) {
    return DEFAULT_WEDDING_BOARD.gateWord;
  }
  return trimmed;
}

/**
 * Short intro couple line for the golden-gate / invitation intro beat.
 * Prefers CHELSY when present in the bride's legal name and leads with her
 * preferred name: "CHELSY & JEFFERY".
 */
export function resolveIntroCoupleLine(
  coupleName1?: string | null,
  coupleName2?: string | null
): string {
  const { coupleName1: groomFull, coupleName2: brideFull } = resolveAfarisCoupleNames(
    coupleName1,
    coupleName2
  );
  const groomFirst = groomFull.split(/\s+/)[0]?.toUpperCase() ?? "";
  const brideTokens = brideFull.split(/\s+/).filter(Boolean);
  const chelsy = brideTokens.find((t) => /^chelsy$/i.test(t));
  const brideFirst = (chelsy ?? brideTokens[0] ?? "").toUpperCase();

  if (brideFirst && groomFirst) return `${brideFirst} & ${groomFirst}`;
  if (brideFirst) return brideFirst;
  if (groomFirst) return groomFirst;
  return "CHELSY & JEFFERY";
}

/**
 * Guest-facing prose: replace em/en dashes (and spaced hyphens) between
 * words or phrases with a comma so the line reads cleanly without “—”.
 */
export function withoutPhraseDashes(value: string | null | undefined): string {
  return (value ?? "")
    .replace(/\s*[—–]\s*/g, ", ")
    .replace(/(\w)\s+-\s+(\w)/g, "$1, $2")
    .replace(/,\s*,/g, ",")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Fold invitation display phrases for duplicate detection: case, whitespace,
 * and common punctuation differences do not count as distinct copy.
 */
export function normalizeInvitationPhrase(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** True when two phrases read as the same announcement line to a guest. */
export function invitationPhrasesMatch(
  a: string | null | undefined,
  b: string | null | undefined
): boolean {
  const left = normalizeInvitationPhrase(a);
  const right = normalizeInvitationPhrase(b);
  return Boolean(left) && left === right;
}

/**
 * Return `candidate` only when it is non-empty and not a duplicate of any
 * phrase already shown on the invitation (typically the hero eyebrow).
 */
export function distinctInvitationPhrase(
  candidate: string | null | undefined,
  ...against: Array<string | null | undefined>
): string {
  const trimmed = (candidate ?? "").trim();
  if (!trimmed) return "";
  if (against.some((phrase) => invitationPhrasesMatch(trimmed, phrase))) return "";
  return trimmed;
}

/**
 * Keep a host's ordering while guaranteeing every scene has a slot: known ids
 * are honoured in the order given, anything the host never touched keeps its
 * designed position at the end.
 */
export function normaliseSectionOrder(order?: WeddingSectionId[] | null): WeddingSectionId[] {
  if (!order?.length) return WEDDING_SECTION_ORDER;
  const seen = new Set<WeddingSectionId>();
  const kept = order.filter((id): id is WeddingSectionId => {
    if (!SECTION_ID_SET.has(id) || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
  return [...kept, ...WEDDING_SECTION_ORDER.filter((id) => !seen.has(id))];
}

/** Merge host-edited copy over the premium defaults (arrays fall back whole). */
export function mergeWeddingBoard(
  partial?: WeddingBoardContent | null
): ResolvedWeddingBoard {
  const merged: ResolvedWeddingBoard = {
    ...DEFAULT_WEDDING_BOARD,
    ...partial,
    rsvpContacts: partial?.rsvpContacts?.length
      ? partial.rsvpContacts
      : DEFAULT_WEDDING_BOARD.rsvpContacts,
    programmeItems: partial?.programmeItems?.length
      ? partial.programmeItems
      : DEFAULT_WEDDING_BOARD.programmeItems,
    sectionOrder: normaliseSectionOrder(partial?.sectionOrder),
    features: {
      ...DEFAULT_WEDDING_BOARD.features,
      ...partial?.features,
    },
  };

  // One announcement phrase on the live invite: never echo the hero eyebrow
  // as a second family-section heading (covers legacy saved boards).
  merged.familyHeading = distinctInvitationPhrase(merged.familyHeading, merged.eyebrow);

  // Strip legacy “—” separators from published Studio snapshots and defaults.
  const proseKeys = [
    "familyIntro",
    "invitationCopy",
    "greetingBody",
    "dressCodeLadies",
    "dressCodeGents",
    "guestPolicyBody",
    "storyBody",
    "scratchMessage",
    "closingMessage",
    "memoryBody",
    "receptionText",
    "accessNote",
    "heroCaption",
    "openingInstruction",
    "envelopeAddressLine",
    "countdownExpiredMessage",
  ] as const;
  for (const key of proseKeys) {
    merged[key] = withoutPhraseDashes(merged[key]);
  }
  merged.programmeItems = merged.programmeItems.map((item) => ({
    ...item,
    title: withoutPhraseDashes(item.title),
    description: item.description ? withoutPhraseDashes(item.description) : item.description,
  }));

  return merged;
}
