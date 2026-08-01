/**
 * Curated thank-you font pairings — maps to invitation FontId registry.
 */

import { FONT_STACKS, resolveThankYouFontStack } from "@/lib/invitation-theme/fonts";
import type { FontId } from "@/lib/invitation-theme/theme-types";

export interface ThankYouFontPairing {
  id: string;
  label: string;
  description: string;
  eyebrowFont: FontId;
  displayFont: FontId;
  scriptFont: FontId;
  bodyFont: FontId;
  buttonFont: FontId;
  displayWeight: number;
  bodySizePx: number;
  bodyLineHeight: number;
  letterSpacingEm: number;
}

export const THANK_YOU_FONT_PAIRINGS: ThankYouFontPairing[] = [
  {
    id: "cormorant-jost",
    label: "Cormorant + Jost",
    description: "Editorial wedding elegance",
    eyebrowFont: "jost",
    displayFont: "cormorant",
    scriptFont: "parisienne",
    bodyFont: "jost",
    buttonFont: "jost",
    displayWeight: 600,
    bodySizePx: 18,
    bodyLineHeight: 1.7,
    letterSpacingEm: 0.02,
  },
  {
    id: "cormorant-inter",
    label: "Cormorant + Poppins",
    description: "Ivory keepsake readability",
    eyebrowFont: "poppins",
    displayFont: "cormorant",
    scriptFont: "parisienne",
    bodyFont: "poppins",
    buttonFont: "poppins",
    displayWeight: 600,
    bodySizePx: 18,
    bodyLineHeight: 1.68,
    letterSpacingEm: 0.01,
  },
  {
    id: "marcellus-jost",
    label: "Marcellus + Jost",
    description: "Heritage celebration clarity",
    eyebrowFont: "jost",
    displayFont: "marcellus",
    scriptFont: "alex-brush",
    bodyFont: "jost",
    buttonFont: "jost",
    displayWeight: 400,
    bodySizePx: 17,
    bodyLineHeight: 1.65,
    letterSpacingEm: 0.03,
  },
  {
    id: "eb-garamond-manrope",
    label: "EB Garamond + Poppins",
    description: "Dignified remembrance",
    eyebrowFont: "poppins",
    displayFont: "eb-garamond",
    scriptFont: "great-vibes",
    bodyFont: "poppins",
    buttonFont: "poppins",
    displayWeight: 500,
    bodySizePx: 18,
    bodyLineHeight: 1.72,
    letterSpacingEm: 0.01,
  },
  {
    id: "playfair-source",
    label: "Playfair + Poppins",
    description: "Modern editorial magazine",
    eyebrowFont: "poppins",
    displayFont: "playfair",
    scriptFont: "great-vibes",
    bodyFont: "poppins",
    buttonFont: "poppins",
    displayWeight: 700,
    bodySizePx: 17,
    bodyLineHeight: 1.65,
    letterSpacingEm: 0,
  },
  {
    id: "cinzel-jost",
    label: "Cinzel + Jost",
    description: "Royal evening formality",
    eyebrowFont: "jost",
    displayFont: "cinzel",
    scriptFont: "parisienne",
    bodyFont: "jost",
    buttonFont: "jost",
    displayWeight: 600,
    bodySizePx: 17,
    bodyLineHeight: 1.66,
    letterSpacingEm: 0.04,
  },
];

export function getThankYouFontPairing(id?: string | null): ThankYouFontPairing {
  return (
    THANK_YOU_FONT_PAIRINGS.find((pairing) => pairing.id === id) ??
    THANK_YOU_FONT_PAIRINGS[0]!
  );
}

export function resolvePairingStacks(pairing: ThankYouFontPairing) {
  return {
    eyebrowFontStack: FONT_STACKS[pairing.eyebrowFont] ?? resolveThankYouFontStack(pairing.eyebrowFont),
    displayFontStack: FONT_STACKS[pairing.displayFont] ?? resolveThankYouFontStack(pairing.displayFont),
    scriptFontStack: FONT_STACKS[pairing.scriptFont] ?? resolveThankYouFontStack(pairing.scriptFont),
    bodyFontStack: FONT_STACKS[pairing.bodyFont] ?? resolveThankYouFontStack(pairing.bodyFont),
    buttonFontStack: FONT_STACKS[pairing.buttonFont] ?? resolveThankYouFontStack(pairing.buttonFont),
  };
}
