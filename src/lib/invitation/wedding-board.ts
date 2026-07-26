/**
 * Editable copy + feature toggles for the "Forever Afaris" luxury wedding
 * template (layout `forever-afaris-wedding`).
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
  /** Live countdown to the ceremony */
  countdown?: boolean;
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
  /** Optional gallery strip (uses design.media hero/gallery assets) */
  gallery?: boolean;
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

export interface WeddingBoardContent {
  // — Opening ceremony —
  /** Hint shown under the wax seal ("Tap to open") */
  openingInstruction?: string;
  /** Two-letter monogram / short word on the wax seal (e.g. "J | C") */
  sealMonogram?: string;
  /** Word revealed as the gate opens (e.g. "Forever") */
  gateWord?: string;

  // — Hero announcement —
  eyebrow?: string;
  scriptTitle?: string;
  /** Heading above the family introduction */
  familyHeading?: string;
  familyIntro?: string;
  coupleName1?: string;
  coupleName2?: string;
  invitationCopy?: string;
  hashtag?: string;

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

  // — RSVP —
  rsvpHeading?: string;
  rsvpContacts?: WeddingBoardRsvpContact[];

  // — Closing —
  closingHeading?: string;
  closingMessage?: string;
  closingSignature?: string;

  // — Memory Vault —
  memoryHeading?: string;
  memoryBody?: string;
  memoryCta?: string;

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
    "features" | "rsvpContacts" | "programmeItems"
  >
> & {
  rsvpContacts: WeddingBoardRsvpContact[];
  programmeItems: WeddingBoardProgrammeItem[];
  features: Required<WeddingBoardFeatureFlags>;
} = {
  openingInstruction: "Tap the seal to open",
  sealMonogram: FOREVER_AFARIS_DEFAULT_SEAL,
  gateWord: "Forever",

  eyebrow: "TOGETHER WITH THEIR FAMILIES",
  scriptTitle: "The Wedding",
  familyIntro:
    "The Afari and Opoku families warmly welcome you to share in the joy of this union — the day two families become one.",
  coupleName1: "JEFFERY OWURAKU AFARI",
  coupleName2: "FRANCISCA CHELSY SERWAAH OPOKU",
  invitationCopy:
    "Joyfully request the honor of your presence at the ceremony of their marriage",
  hashtag: "#TheForeverAfaris",

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
    "Two families, one forever. From a first hello to this joyful yes — we can't wait to celebrate the beginning of our always with you.",

  galleryHeading: "Moments",

  rsvpHeading: "R.S.V.P",
  rsvpContacts: [
    { name: "JUSTINE KUFFOUR", phone: "+233 595 968 686" },
    { name: "MAAME YEBOAH", phone: "+233 242 651 828" },
  ],

  closingHeading: "With Love & Gratitude",
  closingMessage:
    "Your presence is the greatest gift. We look forward to celebrating this beautiful day with you.",
  closingSignature: "Jeffery & Francisca",

  familyHeading: "Together With Their Families",
  memoryHeading: "Memory Vault",
  memoryBody:
    "Every photo and video you capture belongs in our album. Upload yours and we will treasure it forever.",
  memoryCta: "Add your memories",

  features: {
    guestWelcome: true,
    countdown: true,
    programme: true,
    location: true,
    dressCode: true,
    guestPolicy: true,
    story: true,
    gallery: true,
    rsvp: true,
    closing: true,
    familyIntro: true,
    memory: true,
  },
};

export type ResolvedWeddingBoard = typeof DEFAULT_WEDDING_BOARD;

/** Merge host-edited copy over the premium defaults (arrays fall back whole). */
export function mergeWeddingBoard(
  partial?: WeddingBoardContent | null
): ResolvedWeddingBoard {
  return {
    ...DEFAULT_WEDDING_BOARD,
    ...partial,
    rsvpContacts: partial?.rsvpContacts?.length
      ? partial.rsvpContacts
      : DEFAULT_WEDDING_BOARD.rsvpContacts,
    programmeItems: partial?.programmeItems?.length
      ? partial.programmeItems
      : DEFAULT_WEDDING_BOARD.programmeItems,
    features: {
      ...DEFAULT_WEDDING_BOARD.features,
      ...partial?.features,
    },
  };
}
