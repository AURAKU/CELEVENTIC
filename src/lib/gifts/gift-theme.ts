import type { CSSProperties } from "react";
import { FA_PALETTE } from "@/components/invitation/templates/forever-afaris-wedding-palette";
import type { InvitationDesignConfig } from "@/types/invitation-design";

/**
 * Theme inheritance for the Gift Experience.
 *
 * A gift page is a continuation of the invitation, not a payment form bolted
 * onto it. We resolve the invitation's design config down to a small set of
 * `--gift-*` custom properties so the gift screens, thank-you and receipt all
 * wear the same colours and type as the invitation the guest just came from.
 * When there is no invitation (printed QR on a card, say) we fall back to the
 * Forever Afaris luxury wedding preset.
 */

export interface GiftTheme {
  id: string;
  name: string;
  colors: {
    primary: string;
    accent: string;
    accentSoft: string;
    surface: string;
    surfaceAlt: string;
    ink: string;
    inkMuted: string;
    border: string;
    onAccent: string;
  };
  fonts: {
    display: string;
    body: string;
    script: string;
  };
  radius: number;
  /** Restrained ornamentation: gift box, ribbon, petals — never confetti spam. */
  ornament: "ribbon" | "petals" | "gilded" | "none";
}

const SERIF_STACK = '"Playfair Display", "Cormorant Garamond", Georgia, serif';
const SCRIPT_STACK = '"Great Vibes", "Alex Brush", "Parisienne", cursive';
const SANS_STACK = '"Jost", "Poppins", system-ui, -apple-system, "Segoe UI", sans-serif';

/** Forever Afaris — the default luxury wedding preset. */
export const FOREVER_AFARIS_GIFT_THEME: GiftTheme = {
  id: "forever-afaris-wedding",
  name: "Forever Afaris",
  colors: {
    primary: FA_PALETTE.ink,
    accent: FA_PALETTE.gold,
    accentSoft: FA_PALETTE.goldSoft,
    surface: FA_PALETTE.ivory,
    surfaceAlt: FA_PALETTE.blush,
    ink: FA_PALETTE.ink,
    inkMuted: FA_PALETTE.cocoa,
    border: FA_PALETTE.border,
    onAccent: "#FFFDFA",
  },
  fonts: { display: SERIF_STACK, body: SANS_STACK, script: SCRIPT_STACK },
  radius: 18,
  ornament: "ribbon",
};

const MEMORIAL_GIFT_THEME: GiftTheme = {
  id: "memorial-candle-tribute",
  name: "Memorial",
  colors: {
    primary: "#22262B",
    accent: "#9C8B62",
    accentSoft: "#DDD2B6",
    surface: "#F6F4F0",
    surfaceAlt: "#EBE7DF",
    ink: "#22262B",
    inkMuted: "#5A5F66",
    border: "#DAD5CB",
    onAccent: "#FFFFFF",
  },
  fonts: { display: SERIF_STACK, body: SANS_STACK, script: SERIF_STACK },
  radius: 12,
  ornament: "none",
};

export const GIFT_THEME_PRESETS: Record<string, GiftTheme> = {
  "forever-afaris-wedding": FOREVER_AFARIS_GIFT_THEME,
  "memorial-candle-tribute": MEMORIAL_GIFT_THEME,
};

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

function safeColor(value: unknown, fallback: string): string {
  return typeof value === "string" && HEX.test(value.trim()) ? value.trim() : fallback;
}

function mix(hex: string, target: number, amount: number): string {
  const full =
    hex.length === 4 ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}` : hex;
  const n = parseInt(full.slice(1), 16);
  const channel = (c: number) =>
    Math.round(c + (target - c) * amount)
      .toString(16)
      .padStart(2, "0");
  return `#${channel((n >> 16) & 255)}${channel((n >> 8) & 255)}${channel(n & 255)}`;
}

function lighten(hex: string, amount: number): string {
  return mix(hex, 255, amount);
}

/** Pick black or white text for a background so the CTA is always readable. */
export function readableInkOn(hex: string): string {
  const full =
    hex.length === 4 ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}` : hex;
  const n = parseInt(full.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.45 ? "#1A1418" : "#FFFDFA";
}

function fontStack(name: string | undefined, fallback: string): string {
  const trimmed = name?.trim();
  if (!trimmed) return fallback;
  // Studio stores friendly family names; wrap and append the safe fallback.
  return trimmed.includes(",") ? trimmed : `"${trimmed}", ${fallback}`;
}

/**
 * Resolve the gift theme from an invitation design config. Anything missing
 * falls back to the Forever Afaris preset so the page is never unstyled.
 */
export function resolveGiftTheme(input?: {
  design?: Partial<InvitationDesignConfig> | null;
  presetId?: string | null;
  templateSlug?: string | null;
}): GiftTheme {
  const preset =
    (input?.presetId && GIFT_THEME_PRESETS[input.presetId]) ||
    (input?.templateSlug && GIFT_THEME_PRESETS[input.templateSlug]) ||
    FOREVER_AFARIS_GIFT_THEME;

  const design = input?.design;
  if (!design) return preset;

  const tokens = design.theme;
  const colors = design.colors;

  const accent = safeColor(tokens?.color.accent ?? colors?.accent, preset.colors.accent);
  const surface = safeColor(tokens?.color.surface ?? colors?.background, preset.colors.surface);
  const ink = safeColor(tokens?.color.ink ?? colors?.text, preset.colors.ink);
  const primary = safeColor(tokens?.color.primary ?? colors?.primary, preset.colors.primary);

  return {
    id: tokens?.id ?? input?.templateSlug ?? preset.id,
    name: tokens?.name ?? preset.name,
    colors: {
      primary,
      accent,
      accentSoft: safeColor(tokens?.color.secondary, lighten(accent, 0.55)),
      surface,
      surfaceAlt: safeColor(tokens?.color.surfaceAlt ?? colors?.secondary, lighten(surface, 0.35)),
      ink,
      inkMuted: safeColor(tokens?.color.inkMuted, lighten(ink, 0.35)),
      border: lighten(ink, 0.82),
      onAccent: readableInkOn(accent),
    },
    fonts: {
      display: fontStack(design.fonts?.heading, preset.fonts.display),
      body: fontStack(design.fonts?.body, preset.fonts.body),
      script: fontStack(design.fonts?.script, preset.fonts.script),
    },
    radius: typeof tokens?.spacing.radius === "number" ? tokens.spacing.radius : preset.radius,
    ornament: design.ornament === "floral" ? "petals" : preset.ornament,
  };
}

export type GiftThemeCssVars = CSSProperties & Record<`--gift-${string}`, string>;

export function giftThemeToCssVars(theme: GiftTheme): GiftThemeCssVars {
  return {
    "--gift-color-primary": theme.colors.primary,
    "--gift-color-accent": theme.colors.accent,
    "--gift-color-accent-soft": theme.colors.accentSoft,
    "--gift-color-surface": theme.colors.surface,
    "--gift-color-surface-alt": theme.colors.surfaceAlt,
    "--gift-color-ink": theme.colors.ink,
    "--gift-color-ink-muted": theme.colors.inkMuted,
    "--gift-color-border": theme.colors.border,
    "--gift-color-on-accent": theme.colors.onAccent,
    "--gift-font-display": theme.fonts.display,
    "--gift-font-body": theme.fonts.body,
    "--gift-font-script": theme.fonts.script,
    "--gift-radius": `${theme.radius}px`,
  };
}
