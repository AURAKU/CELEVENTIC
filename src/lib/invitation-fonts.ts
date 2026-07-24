import {
  Playfair_Display,
  Cinzel,
  Great_Vibes,
  Cormorant_Garamond,
  Marcellus,
  EB_Garamond,
  Jost,
  Alex_Brush,
  Parisienne,
} from "next/font/google";

export const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

export const cinzel = Cinzel({
  subsets: ["latin"],
  variable: "--font-cinzel",
  display: "swap",
});

export const greatVibes = Great_Vibes({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-great-vibes",
  display: "swap",
});

export const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-cormorant",
  display: "swap",
});

/** Editorial serif — heading/eyebrow role for the "Editorial Vow" font preset. */
export const marcellus = Marcellus({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-marcellus",
  display: "swap",
});

/** Refined serif body copy — pairs with Marcellus in the "Editorial Vow" preset. */
export const ebGaramond = EB_Garamond({
  subsets: ["latin"],
  variable: "--font-eb-garamond",
  display: "swap",
});

/** Modern geometric sans — heading/body role for the "Modern Muse" font preset. */
export const jost = Jost({
  subsets: ["latin"],
  variable: "--font-jost",
  display: "swap",
});

/** Flowing modern script — pairs with Jost in the "Modern Muse" preset. */
export const alexBrush = Alex_Brush({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-alex-brush",
  display: "swap",
});

/** Delicate script — pairs with Marcellus/EB Garamond in the "Editorial Vow" preset. */
export const parisienne = Parisienne({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-parisienne",
  display: "swap",
});

export const invitationFontVars = [
  playfair.variable,
  cinzel.variable,
  greatVibes.variable,
  cormorant.variable,
  marcellus.variable,
  ebGaramond.variable,
  jost.variable,
  alexBrush.variable,
  parisienne.variable,
].join(" ");
