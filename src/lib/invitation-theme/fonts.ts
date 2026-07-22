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
};

/** Human-readable family name for legacy `design.fonts` consumers. */
export const FONT_DISPLAY_NAMES: Record<FontId, string> = {
  playfair: "Playfair Display",
  cinzel: "Cinzel",
  "great-vibes": "Great Vibes",
  cormorant: "Cormorant Garamond",
  poppins: "Poppins",
};
