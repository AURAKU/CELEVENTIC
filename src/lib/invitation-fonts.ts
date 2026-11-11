import localFont from "next/font/local";

/**
 * Self-hosted Latin cuts (SIL OFL via Fontsource 5.3.0).
 * Production builds must not fetch Google Fonts.
 */

export const poppins = localFont({
  src: [
    { path: "../fonts/poppins-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../fonts/poppins-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../fonts/poppins-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "../fonts/poppins-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-sans",
  display: "swap",
});

export const playfair = localFont({
  src: [
    { path: "../fonts/playfair-display-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../fonts/playfair-display-latin-400-italic.woff2", weight: "400", style: "italic" },
    { path: "../fonts/playfair-display-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../fonts/playfair-display-latin-500-italic.woff2", weight: "500", style: "italic" },
    { path: "../fonts/playfair-display-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "../fonts/playfair-display-latin-600-italic.woff2", weight: "600", style: "italic" },
    { path: "../fonts/playfair-display-latin-700-normal.woff2", weight: "700", style: "normal" },
    { path: "../fonts/playfair-display-latin-700-italic.woff2", weight: "700", style: "italic" },
  ],
  variable: "--font-playfair",
  display: "swap",
});

export const cinzel = localFont({
  src: [
    { path: "../fonts/cinzel-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../fonts/cinzel-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../fonts/cinzel-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "../fonts/cinzel-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-cinzel",
  display: "swap",
});

export const greatVibes = localFont({
  src: [{ path: "../fonts/great-vibes-latin-400-normal.woff2", weight: "400", style: "normal" }],
  variable: "--font-great-vibes",
  display: "swap",
});

export const cormorant = localFont({
  src: [
    { path: "../fonts/cormorant-garamond-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../fonts/cormorant-garamond-latin-400-italic.woff2", weight: "400", style: "italic" },
    { path: "../fonts/cormorant-garamond-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../fonts/cormorant-garamond-latin-500-italic.woff2", weight: "500", style: "italic" },
    { path: "../fonts/cormorant-garamond-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "../fonts/cormorant-garamond-latin-600-italic.woff2", weight: "600", style: "italic" },
    { path: "../fonts/cormorant-garamond-latin-700-normal.woff2", weight: "700", style: "normal" },
    { path: "../fonts/cormorant-garamond-latin-700-italic.woff2", weight: "700", style: "italic" },
  ],
  variable: "--font-cormorant",
  display: "swap",
});

/** Editorial serif. Heading/eyebrow role for the "Editorial Vow" font preset. */
export const marcellus = localFont({
  src: [{ path: "../fonts/marcellus-latin-400-normal.woff2", weight: "400", style: "normal" }],
  variable: "--font-marcellus",
  display: "swap",
});

/** Refined serif body copy. Pairs with Marcellus in the "Editorial Vow" preset. */
export const ebGaramond = localFont({
  src: [
    { path: "../fonts/eb-garamond-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../fonts/eb-garamond-latin-400-italic.woff2", weight: "400", style: "italic" },
    { path: "../fonts/eb-garamond-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../fonts/eb-garamond-latin-500-italic.woff2", weight: "500", style: "italic" },
    { path: "../fonts/eb-garamond-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "../fonts/eb-garamond-latin-600-italic.woff2", weight: "600", style: "italic" },
    { path: "../fonts/eb-garamond-latin-700-normal.woff2", weight: "700", style: "normal" },
    { path: "../fonts/eb-garamond-latin-700-italic.woff2", weight: "700", style: "italic" },
  ],
  variable: "--font-eb-garamond",
  display: "swap",
});

/** Modern geometric sans. Heading/body role for the "Modern Muse" font preset. */
export const jost = localFont({
  src: [
    { path: "../fonts/jost-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../fonts/jost-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../fonts/jost-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "../fonts/jost-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-jost",
  display: "swap",
});

/** Flowing modern script. Pairs with Jost in the "Modern Muse" preset. */
export const alexBrush = localFont({
  src: [{ path: "../fonts/alex-brush-latin-400-normal.woff2", weight: "400", style: "normal" }],
  variable: "--font-alex-brush",
  display: "swap",
});

/** Delicate script. Pairs with Marcellus/EB Garamond in the "Editorial Vow" preset. */
export const parisienne = localFont({
  src: [{ path: "../fonts/parisienne-latin-400-normal.woff2", weight: "400", style: "normal" }],
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
