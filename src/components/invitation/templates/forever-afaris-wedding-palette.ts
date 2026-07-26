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

export type FaPalette = { -readonly [K in keyof typeof FA_PALETTE]: string };

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

function clean(value?: string | null): string | null {
  const v = value?.trim();
  return v && HEX.test(v) ? v : null;
}

/** Mix a hex colour toward white (amount 0–1) — used to derive soft variants. */
function lighten(hex: string, amount: number): string {
  const full =
    hex.length === 4
      ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
      : hex;
  const n = parseInt(full.slice(1), 16);
  const mix = (channel: number) =>
    Math.round(channel + (255 - channel) * amount)
      .toString(16)
      .padStart(2, "0");
  return `#${mix((n >> 16) & 255)}${mix((n >> 8) & 255)}${mix(n & 255)}`;
}

/** Mix a hex colour toward black (amount 0–1). */
function darken(hex: string, amount: number): string {
  const full =
    hex.length === 4
      ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
      : hex;
  const n = parseInt(full.slice(1), 16);
  const mix = (channel: number) =>
    Math.round(channel * (1 - amount))
      .toString(16)
      .padStart(2, "0");
  return `#${mix((n >> 16) & 255)}${mix((n >> 8) & 255)}${mix(n & 255)}`;
}

export interface WeddingPaletteOverrides {
  accentColor?: string;
  blushColor?: string;
  inkColor?: string;
  canvasColor?: string;
}

/**
 * Apply the host's Studio colour choices on top of the designed palette.
 * A single accent choice cascades into its deep/soft companions so the gold
 * filigree, rules and seal stay a coherent metal rather than one flat swatch.
 */
export function resolveWeddingPalette(overrides?: WeddingPaletteOverrides): FaPalette {
  const palette: FaPalette = { ...FA_PALETTE };

  const accent = clean(overrides?.accentColor);
  if (accent) {
    palette.gold = accent;
    palette.goldDeep = darken(accent, 0.25);
    palette.goldSoft = lighten(accent, 0.45);
  }

  const blush = clean(overrides?.blushColor);
  if (blush) {
    palette.blush = blush;
    palette.blushDeep = darken(blush, 0.1);
    palette.rose = darken(blush, 0.28);
    palette.border = darken(blush, 0.12);
  }

  const ink = clean(overrides?.inkColor);
  if (ink) {
    palette.ink = ink;
    palette.cocoa = lighten(ink, 0.28);
  }

  const canvas = clean(overrides?.canvasColor);
  if (canvas) {
    palette.ivory = canvas;
    palette.cream = darken(canvas, 0.06);
    palette.linen = lighten(canvas, 0.5);
  }

  return palette;
}

/** Wax colours the host can pour the seal in. */
export const WEDDING_SEAL_WAX: Record<
  string,
  { label: string; light: string; base: string; deep: string; text: string }
> = {
  champagne: { label: "Champagne gold", light: "#E6D2A2", base: "#C7A35A", deep: "#A9852F", text: "#3A2A2E" },
  "rose-gold": { label: "Rose gold", light: "#F0CDBE", base: "#D89C82", deep: "#B0715A", text: "#43231A" },
  blush: { label: "Blush", light: "#F8DCD8", base: "#E2A9A2", deep: "#C07E78", text: "#4A2A29" },
  ivory: { label: "Ivory", light: "#FFFDF8", base: "#EFE4D2", deep: "#CBB99C", text: "#4A3B2A" },
  emerald: { label: "Emerald", light: "#8FBFA4", base: "#3F7D5C", deep: "#27543D", text: "#F4FBF6" },
  burgundy: { label: "Burgundy", light: "#B4747B", base: "#7C2F3C", deep: "#521E28", text: "#FBF1F2" },
};

export function resolveSealWax(id?: string | null) {
  return WEDDING_SEAL_WAX[id ?? "champagne"] ?? WEDDING_SEAL_WAX.champagne;
}
