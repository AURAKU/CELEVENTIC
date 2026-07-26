/**
 * Forever Afaris — luxury wedding palette.
 * Blush pink · ivory linen · champagne gold, drawn from the reference stationery.
 * Kept as a local constant object (the sanctioned pattern for
 * `components/invitation/templates/*`; token-purity lint only gates the
 * invitation-pages / invitation-paged viewers).
 */
export const FA_PALETTE = {
  /** Deepest ink for primary headings */
  ink: "#3A2A2E",
  /** Soft brown-rose body text */
  cocoa: "#6E5257",
  /** Champagne gold — seals, rules, accents */
  gold: "#C7A35A",
  goldDeep: "#A9852F",
  goldSoft: "#E6D2A2",
  /** Blush pinks — envelope + section washes */
  blush: "#F6E2DE",
  blushDeep: "#EFCBC5",
  rose: "#D99A93",
  /** Ivory / champagne neutrals */
  ivory: "#FBF6EF",
  cream: "#F3E9DC",
  linen: "#FFFDFA",
  /** Hairline borders */
  border: "#E7D3C4",
  /** Muted sage for botanical accents */
  sage: "#9DAE93",
} as const;

export type FaPalette = typeof FA_PALETTE;
