import type { FontId } from "./theme-types";

/**
 * Font stacks reference next/font CSS variables registered in the root layout
 * (src/lib/invitation-fonts.ts + globals.css --font-sans). No new network
 * fetches at invitation render time — WhatsApp/3G budget.
 */
export const FONT_STACKS: Record<FontId, string> = {
  playfair: "var(--font-playfair), 'Playfair Display', serif",
  cinzel: "var(--font-cinzel), 'Cinzel', serif",
  "great-vibes": "var(--font-great-vibes), 'Great Vibes', cursive",
  cormorant: "var(--font-cormorant), 'Cormorant Garamond', serif",
  poppins: "var(--font-sans, 'Poppins'), ui-sans-serif, system-ui, sans-serif",
  marcellus: "var(--font-marcellus), 'Marcellus', serif",
  "eb-garamond": "var(--font-eb-garamond), 'EB Garamond', serif",
  jost: "var(--font-jost), 'Jost', ui-sans-serif, sans-serif",
  "alex-brush": "var(--font-alex-brush), 'Alex Brush', cursive",
  parisienne: "var(--font-parisienne), 'Parisienne', cursive",
};

/** Human-readable family name for legacy `design.fonts` consumers. */
export const FONT_DISPLAY_NAMES: Record<FontId, string> = {
  playfair: "Playfair Display",
  cinzel: "Cinzel",
  "great-vibes": "Great Vibes",
  cormorant: "Cormorant Garamond",
  poppins: "Poppins",
  marcellus: "Marcellus",
  "eb-garamond": "EB Garamond",
  jost: "Jost",
  "alex-brush": "Alex Brush",
  parisienne: "Parisienne",
};

/** Curated font choices for Traditional Marriage / invitation thank-you body copy. */
export const THANK_YOU_FONT_OPTIONS: { id: FontId; label: string }[] = [
  { id: "cormorant", label: "Cormorant Garamond" },
  { id: "great-vibes", label: "Great Vibes" },
  { id: "playfair", label: "Playfair Display" },
  { id: "cinzel", label: "Cinzel" },
  { id: "poppins", label: "Poppins" },
  { id: "marcellus", label: "Marcellus" },
  { id: "eb-garamond", label: "EB Garamond" },
  { id: "jost", label: "Jost" },
  { id: "alex-brush", label: "Alex Brush" },
  { id: "parisienne", label: "Parisienne" },
];

export const DEFAULT_THANK_YOU_FONT: FontId = "cormorant";

export function resolveThankYouFontStack(fontId?: FontId | string | null): string {
  if (fontId && fontId in FONT_STACKS) {
    return FONT_STACKS[fontId as FontId];
  }
  return FONT_STACKS[DEFAULT_THANK_YOU_FONT];
}
