import type { CSSProperties } from "react";
import { FONT_STACKS } from "./fonts";
import type {
  BlockGapToken,
  InvitationThemeTokens,
  LetterSpacingToken,
  PagePaddingToken,
  ShadowToken,
} from "./theme-types";

/**
 * Theme JSON → CSS custom properties.
 *
 * The resolver is the ONLY place enum tokens become concrete CSS values, and
 * (with theme-registry) the only place literal colors are permitted. Page
 * components consume `var(--inv-*)` exclusively.
 *
 * The returned object is applied as a server-rendered inline `style` on the
 * paged-viewer root, so tokens are present in the initial HTML (no hydration
 * flash) and a client-side theme switch is a single style-object swap.
 */

const LETTER_SPACING: Record<LetterSpacingToken, string> = {
  tight: "-0.01em",
  normal: "0em",
  wide: "0.08em",
  grand: "0.18em",
};

const PAGE_PADDING: Record<PagePaddingToken, string> = {
  compact: "clamp(1.25rem, 5vw, 2rem)",
  regular: "clamp(1.5rem, 6vw, 3rem)",
  grand: "clamp(2rem, 8vw, 4rem)",
};

const BLOCK_GAP: Record<BlockGapToken, string> = {
  tight: "0.75rem",
  regular: "1.25rem",
  airy: "2rem",
};

const SHADOW: Record<ShadowToken, string> = {
  none: "none",
  soft: "0 8px 24px rgba(10, 10, 10, 0.12)",
  lifted: "0 16px 40px rgba(10, 10, 10, 0.22)",
};

const FOIL_GRADIENT: Record<InvitationThemeTokens["texture"]["foilEffect"], string> = {
  none: "none",
  gold: "linear-gradient(120deg, #8f6b29 0%, #fde08d 45%, #df9f28 100%)",
  silver: "linear-gradient(120deg, #9c9c9c 0%, #f5f5f5 45%, #b3b3b3 100%)",
};

export type InvitationThemeCssVars = CSSProperties & Record<`--inv-${string}`, string>;

export function themeToCssVars(theme: InvitationThemeTokens): InvitationThemeCssVars {
  return {
    "--inv-color-primary": theme.color.primary,
    "--inv-color-secondary": theme.color.secondary,
    "--inv-color-accent": theme.color.accent,
    "--inv-color-surface": theme.color.surface,
    "--inv-color-surface-alt": theme.color.surfaceAlt,
    "--inv-color-ink": theme.color.ink,
    "--inv-color-ink-muted": theme.color.inkMuted,
    "--inv-color-overlay": theme.color.overlay,
    "--inv-font-display": FONT_STACKS[theme.typography.displayFont],
    "--inv-font-body": FONT_STACKS[theme.typography.bodyFont],
    "--inv-font-script": FONT_STACKS[theme.typography.scriptFont],
    "--inv-type-scale": String(theme.typography.scale),
    "--inv-type-letter-spacing": LETTER_SPACING[theme.typography.letterSpacing],
    "--inv-space-page-padding": PAGE_PADDING[theme.spacing.pagePadding],
    "--inv-space-block-gap": BLOCK_GAP[theme.spacing.blockGap],
    "--inv-radius": `${theme.spacing.radius}px`,
    "--inv-shadow": SHADOW[theme.spacing.shadow],
    "--inv-foil-gradient": FOIL_GRADIENT[theme.texture.foilEffect],
    "--inv-motion-intensity": String(theme.motion.intensity),
  };
}

/** Structural tokens rendered as data attributes so invitation-pages.css can style them. */
export function themeToDataAttrs(theme: InvitationThemeTokens): Record<string, string> {
  return {
    "data-inv-texture": theme.texture.backgroundTexture,
    "data-inv-divider": theme.texture.dividerStyle,
    "data-inv-frame": theme.texture.frameStyle,
    "data-inv-foil": theme.texture.foilEffect,
  };
}
