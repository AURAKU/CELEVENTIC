/** Design tokens for luxury fashion flagship experiences. */

export const FASHION_TOKEN_VALUES = {
  ivory: "#FBF7F0",
  cream: "#F4EDE1",
  pearl: "#EFE7DA",
  champagne: "#D9C4A0",
  gold: "#C4A574",
  goldDeep: "#9A7A48",
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
