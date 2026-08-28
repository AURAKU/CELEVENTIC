/** Design tokens for luxury fashion flagship experiences. */

export const FASHION_TOKEN_VALUES = {
  ivory: "#F7F1E8",
  cream: "#F3EBE0",
  pearl: "#EFE4D6",
  champagne: "#D9C4A0",
  gold: "#B8956A",
  goldDeep: "#A67C52",
  mocha: "#6B5344",
  espresso: "#2C211C",
  ink: "#1C1613",
} as const;

/**
 * Motion vocabulary — slow, editorial, fashion-film.
 * Components must use these tokens instead of scattered magic durations.
 */
export const FASHION_MOTION = {
  micro: 180,
  standard: 280,
  editorial: 520,
  cinematic: 1100,
  ceremonial: 1400,
  whisper: 1800,
  silkDragPx: 48,
} as const;

export const FASHION_GESTURE_ARM_MS = FASHION_MOTION.editorial;
export const FASHION_SILK_OPEN_MS = FASHION_MOTION.ceremonial;
export const FASHION_DOORS_OPEN_MS = FASHION_MOTION.cinematic;
export const FASHION_REDUCED_OPEN_MS = FASHION_MOTION.standard;
export const FASHION_EXIT_POINTER_MS = FASHION_MOTION.micro;
export const FASHION_WHISPER_MS = FASHION_MOTION.whisper;
export const FASHION_SILK_DRAG_PX = FASHION_MOTION.silkDragPx;

export function fashionTokenStyle(
  overrides?: Partial<typeof FASHION_TOKEN_VALUES>
): Record<`--${string}`, string> {
  const t = { ...FASHION_TOKEN_VALUES, ...overrides };
  return {
    "--ff-ivory": t.ivory,
    "--ff-cream": t.cream,
    "--ff-pearl": t.pearl,
    "--ff-champagne": t.champagne,
    "--ff-gold": t.gold,
    "--ff-gold-deep": t.goldDeep,
    "--ff-mocha": t.mocha,
    "--ff-espresso": t.espresso,
    "--ff-ink": t.ink,
    "--ff-micro": `${FASHION_MOTION.micro}ms`,
    "--ff-standard": `${FASHION_MOTION.standard}ms`,
    "--ff-editorial": `${FASHION_MOTION.editorial}ms`,
    "--ff-cinematic": `${FASHION_MOTION.cinematic}ms`,
    "--ff-ceremonial": `${FASHION_MOTION.ceremonial}ms`,
    "--ff-whisper": `${FASHION_MOTION.whisper}ms`,
  };
}

const SOLID_COLOR = /^(#|rgb\(|rgba\(|hsl\(|hsla\(|oklch\(|color\()/i;

function asFashionSolidColor(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  if (!trimmed) return fallback;
  if (trimmed.includes("gradient(") || trimmed.includes("url(")) return fallback;
  if (SOLID_COLOR.test(trimmed)) return trimmed;
  return fallback;
}

export function fashionTokenStyleFromColors(
  colors?: { primary?: string; secondary?: string; accent?: string; background?: string; text?: string } | null
): Record<`--${string}`, string> {
  if (!colors) return fashionTokenStyle();
  const defaults = FASHION_TOKEN_VALUES;
  return fashionTokenStyle({
    espresso: asFashionSolidColor(colors.primary, defaults.espresso),
    gold: asFashionSolidColor(colors.secondary, defaults.gold),
    goldDeep: asFashionSolidColor(colors.accent, defaults.goldDeep),
    champagne: asFashionSolidColor(colors.accent, defaults.champagne),
    ivory: asFashionSolidColor(colors.background, defaults.ivory),
    cream: asFashionSolidColor(colors.background, defaults.cream),
    ink: asFashionSolidColor(colors.text, defaults.ink),
  });
}

export function fashionTokenStyleForSilk(
  style?: "ivory-champagne" | "pearl-mocha" | "espresso-gold" | null
): Record<`--${string}`, string> {
  if (style === "espresso-gold") {
    return fashionTokenStyle({
      ivory: "#1C1613",
      cream: "#2C211C",
      pearl: "#3A2E28",
      champagne: "#8A6A3C",
      gold: "#C4A574",
      goldDeep: "#C4A574",
      mocha: "#C4A574",
      espresso: "#F4EFE6",
      ink: "#F4EFE6",
    });
  }
  if (style === "pearl-mocha") {
    return fashionTokenStyle({
      ivory: "#EFE4D6",
      cream: "#E7D8C6",
      champagne: "#C4A574",
      gold: "#A67C52",
      mocha: "#5C4638",
    });
  }
  return fashionTokenStyle();
}
