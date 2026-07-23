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
  /**
   * Wax-seal initials / short monogram on the envelope reveal (e.g. "C | J" or "Love").
   * Traditional Marriage Ceremony defaults to "C | J".
   */
  sealInitials?: string;
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

/** Default seal monogram for the Traditional Marriage Ceremony template. */
export const TRADITIONAL_MARRIAGE_DEFAULT_SEAL = "C | J";

/** Format a compact 2-letter monogram as pipe-spaced display (`CJ` → `C | J`). */
export function formatPipeMonogram(letters: string): string {
  const upper = letters.replace(/[^a-zA-ZÀ-ÿ]/g, "").toUpperCase();
  if (upper.length === 2) return `${upper[0]} | ${upper[1]}`;
  return upper;
}

/**
 * Normalize host-entered seal text for the wax seal.
 * Supports short monograms (`CJ` / `C | J`) and short words/phrases (Love).
 * Two-letter monograms always display pipe-spaced; never bake photo names.
 */
export function normalizeSealInitials(raw?: string | null): string {
  if (!raw) return "";
  const cleaned = raw
    .replace(/[^a-zA-ZÀ-ÿ\s|&'·•.]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "";

  // Explicit pipe / dot separators: "C | J", "C|J", "C.J"
  const pipeParts = cleaned
    .split(/\s*[|&·•.]\s*/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (
    pipeParts.length === 2 &&
    pipeParts.every((p) => p.length === 1 && /^[a-zA-ZÀ-ÿ]$/.test(p))
  ) {
    return formatPipeMonogram(pipeParts.join(""));
  }

  // Classic compact monogram: no spaces, ≤3 letters
  if (!/[\s&]/.test(cleaned) && cleaned.length <= 3 && /^[a-zA-ZÀ-ÿ]+$/.test(cleaned)) {
    const upper = cleaned.toUpperCase();
    return upper.length === 2 ? formatPipeMonogram(upper) : upper;
  }

  // Short words / phrases — keep readable on the seal face
  return cleaned
    .slice(0, 14)
    .split(" ")
    .filter(Boolean)
    .map((w) => {
      if (w === "&" || w === "|") return w;
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(" ");
}

/**
 * Resolve wax-seal initials for the envelope reveal.
 * Priority: explicit seal text → couple/host-derived monogram → TM default C | J → fallback.
 */
export function resolveSealInitials(
  raw?: string | null,
  opts?: {
    layout?: string | null;
    fallback?: string | null;
    coupleName1?: string | null;
    coupleName2?: string | null;
    hostName?: string | null;
  }
): string {
  const normalized = normalizeSealInitials(raw);
  if (normalized) return normalized;

  const derived = deriveCoupleSealInitials(
    opts?.coupleName1,
    opts?.coupleName2,
    opts?.hostName
  );
  if (derived) return normalizeSealInitials(derived);

  if (opts?.layout === "traditional-marriage-ceremony") {
    return TRADITIONAL_MARRIAGE_DEFAULT_SEAL;
  }
  return normalizeSealInitials(opts?.fallback);
}

/** First letter of a person name (skips empty / honorifics-only). */
function firstNameLetter(name?: string | null): string {
  if (!name) return "";
  const cleaned = name.replace(/[^a-zA-ZÀ-ÿ\s'-]/g, " ").trim();
  if (!cleaned) return "";
  const parts = cleaned.split(/\s+/).filter(Boolean);
  const skip = new Set(["and", "the", "&", "mr", "mrs", "ms", "dr", "sir", "lady"]);
  const word = parts.find((p) => !skip.has(p.toLowerCase().replace(/\./g, "")));
  return word ? word.charAt(0).toUpperCase() : "";
}

/**
 * Derive 2-letter wax-seal monogram from couple names or "A & B" / "A and B" host strings.
 */
export function deriveCoupleSealInitials(
  coupleName1?: string | null,
  coupleName2?: string | null,
  hostName?: string | null
): string {
  const a = firstNameLetter(coupleName1);
  const b = firstNameLetter(coupleName2);
  if (a && b) return `${a}${b}`;

  if (hostName) {
    const split = hostName.split(/\s*(?:&|and|x|×)\s*/i).map((s) => s.trim()).filter(Boolean);
    if (split.length >= 2) {
      const h1 = firstNameLetter(split[0]);
      const h2 = firstNameLetter(split[1]);
      if (h1 && h2) return `${h1}${h2}`;
    }
  }
  return "";
}

export const TRADITIONAL_MARRIAGE_ART_URL =
  "/templates/traditional-marriage-ceremony.png";

/**
 * Photoreal Traditional Marriage envelope face (IMG_8701 close-up).
 * HD PNG — seal-cleaned (no baked wax text); embroidery retained.
 * Interactive seal is drawn at the V-flap tip over a cream plate.
 * `v=` busts CDN/browser cache when the plate updates.
 */
export const TRADITIONAL_MARRIAGE_ENVELOPE_ART_URL =
  "/templates/traditional-marriage-envelope.png?v=pearl-cj-2";

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
  sealInitials: TRADITIONAL_MARRIAGE_DEFAULT_SEAL,
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

/** Theme-native control family — never magenta ribbon cut-corners */
export const VISION_BOARD_BUTTON_STYLE: ButtonStyle = "editorial-underline";
