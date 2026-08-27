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
  };
}
