/**
 * Invitation Studio 2.0 theme tokens.
 *
 * A theme is a pure JSON document resolved to CSS custom properties at render
 * time (see theme-resolver.ts). Page components under
 * src/components/invitation-pages/ may only consume `var(--inv-*)` values —
 * never raw colors or fonts (lint-enforced).
 */

export type MotionProfileId = "still" | "gentle-drift" | "layered-drift" | "solemn";

/** Registered next/font ids only — arbitrary families would trigger runtime font fetches. */
export type FontId = "playfair" | "cinzel" | "great-vibes" | "cormorant" | "poppins";

export type LetterSpacingToken = "tight" | "normal" | "wide" | "grand";
export type BackgroundTextureToken = "none" | "paper" | "linen" | "velvet-vignette";
export type DividerStyleToken = "none" | "hairline" | "flourish" | "double-rule";
export type FrameStyleToken = "none" | "hairline" | "gilded" | "arch";
export type FoilEffectToken = "none" | "gold" | "silver";
export type PagePaddingToken = "compact" | "regular" | "grand";
export type BlockGapToken = "tight" | "regular" | "airy";
export type ShadowToken = "none" | "soft" | "lifted";

export type MotifPlacementSlot =
  | "coverTop"
  | "coverBottom"
  | "pageHeader"
  | "pageFooter"
  | "divider";

export interface ThemeColorTokens {
  primary: string;
  secondary: string;
  accent: string;
  surface: string;
  surfaceAlt: string;
  ink: string;
  inkMuted: string;
  /** rgba() overlay laid over hero media for text readability */
  overlay: string;
}

export interface ThemeTypographyTokens {
  displayFont: FontId;
  bodyFont: FontId;
  scriptFont: FontId;
  /** Global type-scale multiplier, 0.85–1.2 */
  scale: number;
  letterSpacing: LetterSpacingToken;
}

export interface ThemeTextureTokens {
  backgroundTexture: BackgroundTextureToken;
  dividerStyle: DividerStyleToken;
  frameStyle: FrameStyleToken;
  foilEffect: FoilEffectToken;
}

export interface ThemeMotifTokens {
  packId: string;
  /** Slot → asset id within the pack (resolved by page components) */
  placements: Partial<Record<MotifPlacementSlot, string>>;
}

export interface ThemeMotionTokens {
  profileId: MotionProfileId;
  /** 0–1; scales drift distances inside the active profile */
  intensity: number;
}

export interface ThemeSpacingTokens {
  pagePadding: PagePaddingToken;
  blockGap: BlockGapToken;
  /** px */
  radius: number;
  shadow: ShadowToken;
}

export interface InvitationThemeTokens {
  id: string;
  name: string;
  color: ThemeColorTokens;
  typography: ThemeTypographyTokens;
  texture: ThemeTextureTokens;
  motif: ThemeMotifTokens;
  motion: ThemeMotionTokens;
  spacing: ThemeSpacingTokens;
}
