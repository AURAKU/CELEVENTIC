import type { ButtonStyle } from "@/lib/invitation-studio/studio-types";

/** Editable copy + feature toggles for the Traditional Marriage Ceremony vision board. */
export interface VisionBoardFeatureFlags {
  guestWelcome?: boolean;
  seating?: boolean;
  qr?: boolean;
  rsvp?: boolean;
  location?: boolean;
  music?: boolean;
  gallery?: boolean;
  memory?: boolean;
  admissionCode?: boolean;
  contributions?: boolean;
  timeline?: boolean;
}

export interface VisionBoardRsvpContact {
  name: string;
  phone: string;
}

export interface VisionBoardContent {
  eyebrow?: string;
  scriptTitle?: string;
  familyInvite?: string;
  coupleName1?: string;
  coupleName2?: string;
  weekday?: string;
  monthLabel?: string;
  dayNumber?: string;
  timeLabel?: string;
  dressCodeLine?: string;
  sentiment?: string;
  locationCta?: string;
  rsvpHeading?: string;
  rsvpContacts?: VisionBoardRsvpContact[];
  hashtag?: string;
  /** Show the original invitation art as the card backdrop */
  showArtBackdrop?: boolean;
  /** Prefer live editable typography over flat art alone */
  liveTypography?: boolean;
  features?: VisionBoardFeatureFlags;
}

export const TRADITIONAL_MARRIAGE_ART_URL =
  "/templates/traditional-marriage-ceremony.png";

export const DEFAULT_VISION_BOARD: Required<
  Omit<VisionBoardContent, "features" | "rsvpContacts">
> & {
  rsvpContacts: VisionBoardRsvpContact[];
  features: Required<VisionBoardFeatureFlags>;
} = {
  eyebrow: "TRADITIONAL",
  scriptTitle: "Marriage Ceremony",
  familyInvite:
    "THE AFARI AND OPOKU FAMILIES HUMBLY INVITE YOU TO WITNESS THE TRADITIONAL MARRIAGE CEREMONY BETWEEN THEIR SON AND DAUGHTER",
  coupleName1: "OWURAKU AFARI",
  coupleName2: "FRANCISCA CHELSY SERWAAH OPOKU",
  weekday: "THURSDAY",
  monthLabel: "AUGUST",
  dayNumber: "13",
  timeLabel: "10:00AM",
  dressCodeLine:
    "DRESS CODE: EMBRACE THE OCCASION WITH AN ELEGANT TRADITIONAL / AFRICAN WEAR",
  sentiment: "Your Presence Will Be Deeply Appreciated!",
  locationCta: "CLICK HERE FOR LOCATION",
  rsvpHeading: "R.S.V.P",
  rsvpContacts: [
    { name: "MAAME YEBOAH", phone: "0242651828" },
    { name: "MABEL OPOKU", phone: "0544956617" },
  ],
  hashtag: "#TheForeverAfaris",
  showArtBackdrop: true,
  /** Exact card art by default — avoids duplicated printed + live copy */
  liveTypography: false,
  features: {
    guestWelcome: true,
    seating: true,
    qr: true,
    rsvp: true,
    location: true,
    music: true,
    gallery: true,
    memory: true,
    admissionCode: true,
    contributions: true,
    timeline: true,
  },
};

export function mergeVisionBoard(
  partial?: VisionBoardContent | null
): typeof DEFAULT_VISION_BOARD {
  return {
    ...DEFAULT_VISION_BOARD,
    ...partial,
    rsvpContacts: partial?.rsvpContacts?.length
      ? partial.rsvpContacts
      : DEFAULT_VISION_BOARD.rsvpContacts,
    features: {
      ...DEFAULT_VISION_BOARD.features,
      ...partial?.features,
    },
  };
}

export const VISION_BOARD_BUTTON_STYLE: ButtonStyle = "ribbon";
