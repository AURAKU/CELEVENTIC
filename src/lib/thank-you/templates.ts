/**
 * Premium Thank You design templates.
 * Legacy template IDs are preserved as aliases so published pages keep working.
 */

import type { ThankYouDesignConfig, ResolvedThankYouDesign } from "./types";
import { getThankYouFontPairing, resolvePairingStacks } from "./font-pairings";

export interface ThankYouTemplate {
  id: string;
  name: string;
  description: string;
  /** Legacy CSS gradient — still used by intro chrome / older consumers */
  accentColor: string;
  background: string;
  /** Legacy coarse font hint */
  fontFamily: string;
  /** Full design system defaults */
  design: Required<
    Pick<
      ThankYouDesignConfig,
      | "fontPairingId"
      | "backgroundColor"
      | "surfaceColor"
      | "textColor"
      | "mutedTextColor"
      | "accentColor"
      | "secondaryAccentColor"
      | "overlayOpacity"
      | "cardStyle"
      | "cornerStyle"
      | "motionStyle"
      | "contentWidth"
    >
  > & {
    bestFor: string[];
    isMemorial?: boolean;
    isDark?: boolean;
  };
  /** Maps legacy ids onto the canonical premium id */
  aliases?: string[];
}

export const THANK_YOU_TEMPLATES: ThankYouTemplate[] = [
  {
    id: "eternal-ivory",
    name: "Eternal Ivory",
    description: "Ivory, champagne and soft blush keepsake",
    accentColor: "#B89255",
    background: "linear-gradient(165deg, #FCFAF6 0%, #F7F1E8 45%, #EADCC8 100%)",
    fontFamily: "serif",
    aliases: ["luxury-wedding", "minimal-white-gold"],
    design: {
      fontPairingId: "cormorant-inter",
      backgroundColor: "#FCFAF6",
      surfaceColor: "#FFFFFF",
      textColor: "#27211E",
      mutedTextColor: "#746A64",
      accentColor: "#B89255",
      secondaryAccentColor: "#EADCC8",
      overlayOpacity: 0.28,
      cardStyle: "soft",
      cornerStyle: "rounded",
      motionStyle: "gentle",
      contentWidth: "comfortable",
      bestFor: ["weddings", "anniversaries", "engagements"],
      isDark: false,
    },
  },
  {
    id: "heritage-celebration",
    name: "Heritage Celebration",
    description: "Forest, burgundy and gold cultural warmth",
    accentColor: "#E9C46A",
    background: "linear-gradient(165deg, #1B4332 0%, #2D6A4F 50%, #40916C 100%)",
    fontFamily: "serif",
    aliases: ["ghanaian-traditional", "kente"],
    design: {
      fontPairingId: "marcellus-jost",
      backgroundColor: "#14261C",
      surfaceColor: "#1F3A2B",
      textColor: "#F8F4EC",
      mutedTextColor: "#C9D5CC",
      accentColor: "#E9C46A",
      secondaryAccentColor: "#C41E3A",
      overlayOpacity: 0.4,
      cardStyle: "editorial",
      cornerStyle: "soft",
      motionStyle: "gentle",
      contentWidth: "comfortable",
      bestFor: ["traditional marriage", "naming", "cultural celebrations"],
      isDark: true,
    },
  },
  {
    id: "modern-editorial",
    name: "Modern Editorial",
    description: "Magazine whitespace with bold photography",
    accentColor: "#FF6B6B",
    background: "linear-gradient(165deg, #F8FAFC 0%, #EEF2FF 50%, #FCE7F3 100%)",
    fontFamily: "sans-serif",
    aliases: ["birthday"],
    design: {
      fontPairingId: "playfair-source",
      backgroundColor: "#F8FAFC",
      surfaceColor: "#FFFFFF",
      textColor: "#0F172A",
      mutedTextColor: "#64748B",
      accentColor: "#E11D48",
      secondaryAccentColor: "#FCE7F3",
      overlayOpacity: 0.22,
      cardStyle: "flat",
      cornerStyle: "sharp",
      motionStyle: "gentle",
      contentWidth: "wide",
      bestFor: ["birthdays", "launches", "private events"],
      isDark: false,
    },
  },
  {
    id: "corporate-minimal",
    name: "Corporate Minimal",
    description: "Structured, brand-ready professionalism",
    accentColor: "#0B8A83",
    background: "linear-gradient(165deg, #0F172A 0%, #1E293B 50%, #334155 100%)",
    fontFamily: "sans-serif",
    aliases: ["corporate"],
    design: {
      fontPairingId: "playfair-source",
      backgroundColor: "#0F172A",
      surfaceColor: "#1E293B",
      textColor: "#F8FAFC",
      mutedTextColor: "#94A3B8",
      accentColor: "#0B8A83",
      secondaryAccentColor: "#334155",
      overlayOpacity: 0.45,
      cardStyle: "flat",
      cornerStyle: "soft",
      motionStyle: "none",
      contentWidth: "comfortable",
      bestFor: ["conferences", "company events", "product launches"],
      isDark: true,
    },
  },
  {
    id: "dignified-remembrance",
    name: "Dignified Remembrance",
    description: "Charcoal, cream and muted gold calm",
    accentColor: "#C4A35A",
    background: "linear-gradient(165deg, #1a1a1a 0%, #2d2d2d 50%, #3d3d3d 100%)",
    fontFamily: "serif",
    aliases: ["funeral-appreciation"],
    design: {
      fontPairingId: "eb-garamond-manrope",
      backgroundColor: "#1C1B1A",
      surfaceColor: "#2A2826",
      textColor: "#F5F0E8",
      mutedTextColor: "#B7AFA4",
      accentColor: "#C4A35A",
      secondaryAccentColor: "#4A433C",
      overlayOpacity: 0.5,
      cardStyle: "soft",
      cornerStyle: "soft",
      motionStyle: "none",
      contentWidth: "narrow",
      bestFor: ["funerals", "memorials", "remembrance"],
      isMemorial: true,
      isDark: true,
    },
  },
  {
    id: "floral-letter",
    name: "Floral Letter",
    description: "Botanical framing with blush and sage",
    accentColor: "#E07A5F",
    background: "linear-gradient(165deg, #F4E4D4 0%, #FFE8D6 50%, #FFF8F0 100%)",
    fontFamily: "serif",
    aliases: ["floral"],
    design: {
      fontPairingId: "cormorant-jost",
      backgroundColor: "#FFF8F0",
      surfaceColor: "#FFFFFF",
      textColor: "#3D2C29",
      mutedTextColor: "#8A6E66",
      accentColor: "#E07A5F",
      secondaryAccentColor: "#A7C4A0",
      overlayOpacity: 0.2,
      cardStyle: "soft",
      cornerStyle: "rounded",
      motionStyle: "gentle",
      contentWidth: "comfortable",
      bestFor: ["bridal showers", "weddings", "baby celebrations"],
      isDark: false,
    },
  },
  {
    id: "royal-evening",
    name: "Royal Evening",
    description: "Deep navy, plum and cinematic gold",
    accentColor: "#D4A63A",
    background: "linear-gradient(165deg, #1a0a2e 0%, #3d1a6e 50%, #5c2d91 100%)",
    fontFamily: "serif",
    aliases: ["royal"],
    design: {
      fontPairingId: "cinzel-jost",
      backgroundColor: "#12081F",
      surfaceColor: "#1F1233",
      textColor: "#F8F4EC",
      mutedTextColor: "#C4B8D6",
      accentColor: "#D4A63A",
      secondaryAccentColor: "#5c2d91",
      overlayOpacity: 0.48,
      cardStyle: "glass",
      cornerStyle: "rounded",
      motionStyle: "cinematic",
      contentWidth: "comfortable",
      bestFor: ["galas", "formal weddings", "luxury celebrations"],
      isDark: true,
    },
  },
];

const LEGACY_ALIAS_MAP = new Map<string, string>();
for (const template of THANK_YOU_TEMPLATES) {
  LEGACY_ALIAS_MAP.set(template.id, template.id);
  for (const alias of template.aliases ?? []) {
    LEGACY_ALIAS_MAP.set(alias, template.id);
  }
}

export function resolveThankYouTemplateId(id?: string | null): string {
  if (!id) return THANK_YOU_TEMPLATES[0]!.id;
  return LEGACY_ALIAS_MAP.get(id) ?? id;
}

export function getThankYouTemplate(id: string): ThankYouTemplate {
  const canonical = resolveThankYouTemplateId(id);
  return (
    THANK_YOU_TEMPLATES.find((template) => template.id === canonical) ??
    THANK_YOU_TEMPLATES[0]!
  );
}

/** Legacy-compatible list that still exposes old IDs for the editor picker. */
export function listThankYouTemplatesForEditor(): ThankYouTemplate[] {
  return THANK_YOU_TEMPLATES;
}

export function templateToResolvedDesign(
  template: ThankYouTemplate,
  overrides?: Partial<ThankYouDesignConfig>
): ResolvedThankYouDesign {
  const pairing = getThankYouFontPairing(
    overrides?.fontPairingId ?? template.design.fontPairingId
  );
  const stacks = resolvePairingStacks(pairing);
  const backgroundColor =
    overrides?.backgroundColor ?? template.design.backgroundColor;
  const textColor = overrides?.textColor ?? template.design.textColor;
  const isLight = luminance(backgroundColor) > 0.55;

  return {
    themeSource: overrides?.themeSource ?? "PRESET",
    templateId: template.id,
    fontPairingId: pairing.id,
    displayFontStack: stacks.displayFontStack,
    bodyFontStack: stacks.bodyFontStack,
    scriptFontStack: stacks.scriptFontStack,
    eyebrowFontStack: stacks.eyebrowFontStack,
    backgroundColor,
    surfaceColor: overrides?.surfaceColor ?? template.design.surfaceColor,
    textColor,
    mutedTextColor: overrides?.mutedTextColor ?? template.design.mutedTextColor,
    accentColor: overrides?.accentColor ?? template.design.accentColor,
    secondaryAccentColor:
      overrides?.secondaryAccentColor ?? template.design.secondaryAccentColor,
    backgroundImageUrl: overrides?.backgroundImageUrl ?? null,
    backgroundVideoUrl: overrides?.backgroundVideoUrl ?? null,
    overlayOpacity: overrides?.overlayOpacity ?? template.design.overlayOpacity,
    cardStyle: overrides?.cardStyle ?? template.design.cardStyle,
    cornerStyle: overrides?.cornerStyle ?? template.design.cornerStyle,
    motionStyle: overrides?.motionStyle ?? template.design.motionStyle,
    contentWidth: overrides?.contentWidth ?? template.design.contentWidth,
    isLight,
    background: template.background,
    name: template.name,
    description: template.description,
  };
}

function luminance(hex: string): number {
  const cleaned = hex.replace("#", "");
  if (cleaned.length < 6) return 0.5;
  const r = Number.parseInt(cleaned.slice(0, 2), 16) / 255;
  const g = Number.parseInt(cleaned.slice(2, 4), 16) / 255;
  const b = Number.parseInt(cleaned.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
