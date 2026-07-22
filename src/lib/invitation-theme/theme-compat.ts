import type { InvitationDesignColors, InvitationDesignConfig } from "@/types/invitation-design";
import { FONT_DISPLAY_NAMES } from "./fonts";
import type { InvitationThemeTokens } from "./theme-types";

/**
 * Compatibility layer: legacy consumers (cinematic spotlight, feature dock,
 * studio hub color pickers…) read the flat `design.colors` / `design.fonts`
 * shape. When a theme is present, those derive from tokens so every existing
 * surface stays consistent with the themed invitation.
 */

export function deriveLegacyColorsFromTheme(theme: InvitationThemeTokens): InvitationDesignColors {
  return {
    primary: theme.color.primary,
    secondary: theme.color.secondary,
    accent: theme.color.accent,
    background: theme.color.surface,
    text: theme.color.ink,
  };
}

export function deriveFontsFromTheme(theme: InvitationThemeTokens): NonNullable<InvitationDesignConfig["fonts"]> {
  return {
    heading: FONT_DISPLAY_NAMES[theme.typography.displayFont],
    script: FONT_DISPLAY_NAMES[theme.typography.scriptFont],
    body: FONT_DISPLAY_NAMES[theme.typography.bodyFont],
  };
}

/** Returns a config whose legacy colors/fonts mirror the theme tokens. */
export function applyThemeToDesign(
  design: InvitationDesignConfig,
  theme: InvitationThemeTokens
): InvitationDesignConfig {
  return {
    ...design,
    theme,
    themeId: theme.id,
    colors: deriveLegacyColorsFromTheme(theme),
    fonts: deriveFontsFromTheme(theme),
  };
}
