/**
 * Event Guide theming.
 *
 * "Use Invitation Theme" is `resolveCompanionTheme` — the same resolver the
 * Event Companion uses, so the guide is a visual continuation of the invite
 * rather than a second design system. Overrides are a validated, narrow layer
 * on top, and publishing is gated on WCAG contrast so an organizer cannot ship
 * gold-on-cream body text that nobody can read at a dim reception.
 */

import { resolveCompanionTheme, companionFontStyles } from "@/lib/admission/event-companion-theme";
import type { GuideThemeTokens } from "./types";
import { safePublicUrl } from "./content";

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

export type GuideThemeOverrides = {
  colors?: Partial<GuideThemeTokens["colors"]>;
  fonts?: Partial<GuideThemeTokens["fonts"]>;
  backgroundImageUrl?: string | null;
};

const COLOR_KEYS = ["primary", "secondary", "accent", "background", "text"] as const;
const FONT_KEYS = ["heading", "script", "body", "eyebrow"] as const;

/** Fonts are rendered into a CSS font stack, so only safe name characters pass. */
function safeFontName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, 48);
  if (!trimmed) return null;
  return /^[A-Za-z0-9 ’'&+-]+$/.test(trimmed) ? trimmed : null;
}

export function parseThemeOverrides(raw: unknown): GuideThemeOverrides {
  if (!raw || typeof raw !== "object") return {};
  const src = raw as Record<string, unknown>;
  const out: GuideThemeOverrides = {};

  const colorsRaw = src.colors;
  if (colorsRaw && typeof colorsRaw === "object") {
    const colors: Partial<GuideThemeTokens["colors"]> = {};
    for (const key of COLOR_KEYS) {
      const value = (colorsRaw as Record<string, unknown>)[key];
      if (typeof value === "string" && HEX.test(value.trim())) {
        colors[key] = value.trim().toLowerCase();
      }
    }
    if (Object.keys(colors).length > 0) out.colors = colors;
  }

  const fontsRaw = src.fonts;
  if (fontsRaw && typeof fontsRaw === "object") {
    const fonts: Partial<GuideThemeTokens["fonts"]> = {};
    for (const key of FONT_KEYS) {
      const name = safeFontName((fontsRaw as Record<string, unknown>)[key]);
      if (name) fonts[key] = name;
    }
    if (Object.keys(fonts).length > 0) out.fonts = fonts;
  }

  if ("backgroundImageUrl" in src) {
    out.backgroundImageUrl = safePublicUrl(src.backgroundImageUrl);
  }

  return out;
}

const NEUTRAL_THEME: GuideThemeTokens = {
  colors: {
    primary: "#0b3b39",
    secondary: "#c7a35a",
    accent: "#0b8a83",
    background: "#fbf8f3",
    text: "#1f2933",
  },
  fonts: {
    heading: "Playfair Display",
    script: "Great Vibes",
    body: "Cormorant Garamond",
    eyebrow: "Cinzel",
  },
  layout: "classic-gold",
  backgroundImageUrl: null,
  accentWash: "rgba(199, 163, 90, 0.14)",
  paperWash: "rgba(251, 248, 243, 0.82)",
  labelColor: "#6b5320",
};

type ThemeInvitationInput = Parameters<typeof resolveCompanionTheme>[0];

export function resolveGuideTheme(input: {
  useInvitationTheme: boolean;
  overrides: unknown;
  invitation: ThemeInvitationInput | null;
}): GuideThemeTokens {
  // `labelColor` is derived from the final colours, so the base layer omits it.
  const base: Omit<GuideThemeTokens, "labelColor"> =
    input.useInvitationTheme && input.invitation
      ? (() => {
          try {
            const theme = resolveCompanionTheme(input.invitation);
            // Invitation fonts are all optional; the guide's contract is not,
            // so each slot falls back rather than emitting `undefined` into a
            // CSS font stack.
            const heading = theme.fonts.heading ?? NEUTRAL_THEME.fonts.heading;
            return {
              colors: { ...NEUTRAL_THEME.colors, ...theme.colors },
              fonts: {
                heading,
                script: theme.fonts.script ?? NEUTRAL_THEME.fonts.script,
                body: theme.fonts.body ?? NEUTRAL_THEME.fonts.body,
                eyebrow: theme.fonts.eyebrow ?? heading,
              },
              layout: theme.layout,
              backgroundImageUrl: theme.backgroundImageUrl,
              accentWash: theme.accentWash,
              paperWash: theme.paperWash,
            };
          } catch {
            return NEUTRAL_THEME;
          }
        })()
      : NEUTRAL_THEME;

  const overrides = parseThemeOverrides(input.overrides);
  const colors = { ...base.colors, ...overrides.colors };

  return {
    colors,
    labelColor: ensureReadable(colors.secondary, colors.background).color,
    fonts: { ...base.fonts, ...overrides.fonts },
    layout: base.layout,
    backgroundImageUrl:
      overrides.backgroundImageUrl !== undefined
        ? overrides.backgroundImageUrl
        : base.backgroundImageUrl,
    accentWash: overrides.colors?.secondary
      ? withAlpha(overrides.colors.secondary, 0.14)
      : base.accentWash,
    paperWash: overrides.colors?.background
      ? withAlpha(overrides.colors.background, 0.82)
      : base.paperWash,
  };
}

export function guideFontStyles(fonts: GuideThemeTokens["fonts"]) {
  return companionFontStyles(fonts);
}

function withAlpha(hex: string, alpha: number): string {
  const parsed = parseHex(hex);
  if (!parsed) return hex;
  return `rgba(${parsed[0]}, ${parsed[1]}, ${parsed[2]}, ${alpha})`;
}

function parseHex(value: string): [number, number, number] | null {
  if (typeof value !== "string") return null;
  const raw = value.trim().replace("#", "");
  if (raw.length !== 3 && raw.length !== 6) return null;
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if ([r, g, b].some(Number.isNaN)) return null;
  return [r, g, b];
}

function channelLuminance(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** WCAG 2.1 relative luminance. Returns null for non-hex tokens (gradients). */
export function relativeLuminance(color: string): number | null {
  const rgb = parseHex(color);
  if (!rgb) return null;
  const [r, g, b] = rgb.map(channelLuminance) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function toHex(rgb: [number, number, number]): string {
  return `#${rgb.map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, "0")).join("")}`;
}

function mix(color: [number, number, number], target: [number, number, number], amount: number): [number, number, number] {
  return [
    color[0] + (target[0] - color[0]) * amount,
    color[1] + (target[1] - color[1]) * amount,
    color[2] + (target[2] - color[2]) * amount,
  ];
}

/**
 * Nudge `color` toward black or white — whichever direction the background
 * allows — until it clears `required` against it.
 *
 * Used for small label type. Stepping in small increments keeps as much of the
 * organizer's hue as the ratio permits, so a champagne gold becomes a deeper
 * antique gold rather than collapsing to grey.
 */
export function ensureReadable(
  color: string,
  background: string,
  required = 4.5
): { color: string; adjusted: boolean } {
  const start = parseHex(color);
  const bgLuminance = relativeLuminance(background);
  if (!start || bgLuminance === null) return { color, adjusted: false };

  const current = contrastRatio(color, background);
  if (current !== null && current >= required) return { color, adjusted: false };

  const target: [number, number, number] = bgLuminance > 0.5 ? [0, 0, 0] : [255, 255, 255];
  for (let step = 1; step <= 20; step += 1) {
    const candidate = toHex(mix(start, target, step / 20));
    const ratio = contrastRatio(candidate, background);
    if (ratio !== null && ratio >= required) return { color: candidate, adjusted: true };
  }

  return { color: toHex(target), adjusted: true };
}

/** WCAG 2.1 contrast ratio, 1–21. Null when either token is not a plain hex. */
export function contrastRatio(a: string, b: string): number | null {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  if (la === null || lb === null) return null;
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return Math.round(((lighter + 0.05) / (darker + 0.05)) * 100) / 100;
}

export interface ContrastFinding {
  pair: string;
  ratio: number;
  required: number;
  passes: boolean;
}

export interface ContrastAssessment {
  passes: boolean;
  findings: ContrastFinding[];
  /** Pairs we could not measure because the token is a gradient or named colour. */
  unmeasured: string[];
  /** Tokens we darkened or lightened for readability, phrased for the organizer. */
  adjustments: string[];
}

/**
 * Publish gate. Text needs 4.5:1; large display text and the primary action
 * need 3:1. Unmeasurable tokens (gradients) are reported, not failed — failing
 * them would block legitimate designs we cannot evaluate numerically.
 *
 * Small labels are checked against the derived `labelColor`, not the raw
 * decorative token, because that is what actually renders. A gold that is
 * lovely as a rule but unreadable as 11px type is adjusted rather than
 * rejected — the organizer keeps their palette and the guest can still read it.
 */
export function assessGuideContrast(theme: GuideThemeTokens): ContrastAssessment {
  const labelColor =
    theme.labelColor ?? ensureReadable(theme.colors.secondary, theme.colors.background).color;

  const checks: Array<{ pair: string; fg: string; bg: string; required: number }> = [
    { pair: "Body text on background", fg: theme.colors.text, bg: theme.colors.background, required: 4.5 },
    { pair: "Heading on background", fg: theme.colors.primary, bg: theme.colors.background, required: 3 },
    { pair: "Section labels on background", fg: labelColor, bg: theme.colors.background, required: 4.5 },
    { pair: "Primary action label", fg: theme.colors.background, bg: theme.colors.accent, required: 3 },
  ];

  const findings: ContrastFinding[] = [];
  const unmeasured: string[] = [];

  for (const check of checks) {
    const ratio = contrastRatio(check.fg, check.bg);
    if (ratio === null) {
      unmeasured.push(check.pair);
      continue;
    }
    findings.push({
      pair: check.pair,
      ratio,
      required: check.required,
      passes: ratio >= check.required,
    });
  }

  const adjustments: string[] = [];
  if (labelColor.toLowerCase() !== theme.colors.secondary.toLowerCase()) {
    adjustments.push(
      `Small labels use a deeper shade of your accent (${labelColor}) so they stay readable on ${theme.colors.background}. Your accent is unchanged everywhere else.`
    );
  }

  return {
    passes: findings.every((f) => f.passes),
    findings,
    unmeasured,
    adjustments,
  };
}
