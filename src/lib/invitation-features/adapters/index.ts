import type { InvitationDesignConfig } from "@/types/invitation-design";

/**
 * Shared Invitation Feature Layer — template presentation adapter.
 *
 * The feature layer owns business logic + visibility/order; templates supply
 * only presentation tokens. Every template resolves through here, and templates
 * that define nothing fall back to a polished default derived from their design
 * colours — so no invitation (including legacy/static ones) can break because it
 * predates a feature.
 */
export interface FeatureThemeTokens {
  background: string;
  surface: string;
  primary: string;
  secondary: string;
  accent: string;
  text: string;
  border: string;
  fontHeading: string;
  fontBody: string;
  radius: string;
  /** Motion intensity hint for feature sections. */
  motion: "full" | "restrained" | "none";
}

export interface InvitationTemplateFeatureAdapter {
  layout: string | "default";
  themeTokens(design: InvitationDesignConfig): FeatureThemeTokens;
}

function withAlpha(hex: string, alpha: string) {
  // Accepts #rrggbb; returns #rrggbbAA. Non-hex passes through untouched.
  return /^#[0-9a-fA-F]{6}$/.test(hex) ? `${hex}${alpha}` : hex;
}

/** Polished default — works for any template with a `design.colors` block. */
export const defaultFeatureAdapter: InvitationTemplateFeatureAdapter = {
  layout: "default",
  themeTokens(design) {
    const c = design.colors;
    return {
      background: c.background,
      surface: withAlpha(c.secondary, "14"),
      primary: c.primary,
      secondary: c.secondary,
      accent: c.accent,
      text: c.text,
      border: withAlpha(c.secondary, "55"),
      fontHeading: design.fonts?.heading ?? "Cinzel",
      fontBody: design.fonts?.body ?? "Cormorant Garamond",
      radius: "1rem",
      motion: design.animation === "none" ? "none" : "restrained",
    };
  },
};

/** Forever Afaris — blush / ivory / champagne, restrained shimmer. */
const foreverAfarisAdapter: InvitationTemplateFeatureAdapter = {
  layout: "forever-afaris-wedding",
  themeTokens(design) {
    const base = defaultFeatureAdapter.themeTokens(design);
    return { ...base, radius: "1.25rem", motion: "full" };
  },
};

/** Traditional Marriage — peach / bronze. */
const traditionalMarriageAdapter: InvitationTemplateFeatureAdapter = {
  layout: "traditional-marriage-ceremony",
  themeTokens(design) {
    const base = defaultFeatureAdapter.themeTokens(design);
    return { ...base, radius: "0.5rem" };
  },
};

const ADAPTERS: Record<string, InvitationTemplateFeatureAdapter> = {
  [foreverAfarisAdapter.layout]: foreverAfarisAdapter,
  [traditionalMarriageAdapter.layout]: traditionalMarriageAdapter,
};

/** Resolve the adapter for a layout, always falling back to the default. */
export function getTemplateFeatureAdapter(
  layout: string | undefined | null
): InvitationTemplateFeatureAdapter {
  return (layout && ADAPTERS[layout]) || defaultFeatureAdapter;
}

export function resolveFeatureThemeTokens(design: InvitationDesignConfig): FeatureThemeTokens {
  return getTemplateFeatureAdapter(design.layout).themeTokens(design);
}
