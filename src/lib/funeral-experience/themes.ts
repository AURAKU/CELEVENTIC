/**
 * Celeventic Funeral Experience — design tokens & flagship themes.
 * Honour the deceased; technology stays behind the memorial.
 */

export type FuneralThemeId =
  | "eternal-rose"
  | "golden-legacy"
  | "heavenly-peace"
  | "ghana-heritage"
  | "burgundy-honour"
  | "royal-purple"
  | "peaceful-garden"
  | "midnight-memorial"
  | "pure-white-farewell"
  | "celebration-of-life"
  | "black-red-tradition"
  | "church-memorial";

export type FuneralMotionLevel = "none" | "minimal" | "gentle" | "ceremonial" | "cinematic";

export type FuneralIntroId =
  | "candle-remembrance"
  | "heavenly-reveal"
  | "ghanaian-regal"
  | "floral-reveal"
  | "memory-journey"
  | "minimal-memorial"
  | "instant";

export type FuneralThemeTokens = {
  id: FuneralThemeId;
  name: string;
  tagline: string;
  mood: string[];
  introDefault: FuneralIntroId;
  motionDefault: FuneralMotionLevel;
  /** CSS custom properties applied to FuneralExperienceShell */
  css: {
    bg: string;
    surface: string;
    text: string;
    muted: string;
    primary: string;
    secondary: string;
    gold: string;
    border: string;
    overlay: string;
    frame: string;
    headingFont: string;
    bodyFont: string;
    scriptFont: string;
  };
};

export const FUNERAL_EXPERIENCE_THEMES: FuneralThemeTokens[] = [
  {
    id: "eternal-rose",
    name: "Eternal Rose",
    tagline: "Ivory, blush and champagne — warm celebration of life",
    mood: ["Grace", "Love", "Family", "Warmth"],
    introDefault: "floral-reveal",
    motionDefault: "ceremonial",
    css: {
      bg: "#FAF6F1",
      surface: "#FFF9F5",
      text: "#4A1C2A",
      muted: "#8B5A6B",
      primary: "#7A1F3D",
      secondary: "#C97B84",
      gold: "#C9A227",
      border: "rgba(201,162,39,0.45)",
      overlay: "rgba(74,28,42,0.55)",
      frame: "#C9A227",
      headingFont: "var(--font-display), Georgia, serif",
      bodyFont: "var(--font-sans), system-ui, sans-serif",
      scriptFont: "var(--font-script), 'Great Vibes', cursive",
    },
  },
  {
    id: "golden-legacy",
    name: "Golden Legacy",
    tagline: "Charcoal, gold and ivory — formal honour",
    mood: ["Legacy", "Honour", "Respect"],
    introDefault: "ghanaian-regal",
    motionDefault: "ceremonial",
    css: {
      bg: "#0c0c0c",
      surface: "#161616",
      text: "#F5F0E8",
      muted: "#A8A29E",
      primary: "#D4AF37",
      secondary: "#F5F0E8",
      gold: "#D4AF37",
      border: "rgba(212,175,55,0.4)",
      overlay: "rgba(0,0,0,0.65)",
      frame: "#D4AF37",
      headingFont: "var(--font-display), Georgia, serif",
      bodyFont: "var(--font-sans), system-ui, sans-serif",
      scriptFont: "var(--font-script), 'Great Vibes', cursive",
    },
  },
  {
    id: "heavenly-peace",
    name: "Heavenly Peace",
    tagline: "Clouds, cream and soft gold — serene farewell",
    mood: ["Peace", "Serenity", "Remembrance"],
    introDefault: "heavenly-reveal",
    motionDefault: "gentle",
    css: {
      bg: "#F7F4EE",
      surface: "#FFFEFB",
      text: "#3D2B1F",
      muted: "#7A6A5A",
      primary: "#5C4033",
      secondary: "#C9A227",
      gold: "#C9A227",
      border: "rgba(201,162,39,0.35)",
      overlay: "rgba(61,43,31,0.4)",
      frame: "#C9A227",
      headingFont: "var(--font-display), Georgia, serif",
      bodyFont: "var(--font-sans), system-ui, sans-serif",
      scriptFont: "var(--font-script), 'Great Vibes', cursive",
    },
  },
  {
    id: "ghana-heritage",
    name: "Ghana Heritage",
    tagline: "Black, red and gold — ceremonial tradition",
    mood: ["Tradition", "Heritage", "Family"],
    introDefault: "ghanaian-regal",
    motionDefault: "ceremonial",
    css: {
      bg: "#0a0a0a",
      surface: "#141414",
      text: "#FAFAFA",
      muted: "#A1A1AA",
      primary: "#B91C1C",
      secondary: "#D4AF37",
      gold: "#D4AF37",
      border: "rgba(212,175,55,0.45)",
      overlay: "rgba(0,0,0,0.7)",
      frame: "#D4AF37",
      headingFont: "var(--font-display), Georgia, serif",
      bodyFont: "var(--font-sans), system-ui, sans-serif",
      scriptFont: "var(--font-script), 'Great Vibes', cursive",
    },
  },
  {
    id: "burgundy-honour",
    name: "Burgundy Honour",
    tagline: "Burgundy, ivory and gold — distinguished",
    mood: ["Mature", "Formal", "Distinguished"],
    introDefault: "candle-remembrance",
    motionDefault: "gentle",
    css: {
      bg: "#F8F1EB",
      surface: "#FFFCF8",
      text: "#4A1020",
      muted: "#7C4A58",
      primary: "#6B1D32",
      secondary: "#C9A227",
      gold: "#C9A227",
      border: "rgba(107,29,50,0.25)",
      overlay: "rgba(74,16,32,0.5)",
      frame: "#C9A227",
      headingFont: "var(--font-display), Georgia, serif",
      bodyFont: "var(--font-sans), system-ui, sans-serif",
      scriptFont: "var(--font-script), 'Great Vibes', cursive",
    },
  },
  {
    id: "royal-purple",
    name: "Royal Purple Remembrance",
    tagline: "Plum, lavender and champagne",
    mood: ["Dignity", "Faith", "Quiet honour"],
    introDefault: "candle-remembrance",
    motionDefault: "gentle",
    css: {
      bg: "#F5F0F8",
      surface: "#FCFAFD",
      text: "#2E1A47",
      muted: "#6B5B7A",
      primary: "#5B2C6F",
      secondary: "#C9A227",
      gold: "#C9A227",
      border: "rgba(91,44,111,0.25)",
      overlay: "rgba(46,26,71,0.5)",
      frame: "#C9A227",
      headingFont: "var(--font-display), Georgia, serif",
      bodyFont: "var(--font-sans), system-ui, sans-serif",
      scriptFont: "var(--font-script), 'Great Vibes', cursive",
    },
  },
  {
    id: "peaceful-garden",
    name: "Peaceful Garden",
    tagline: "Sage, ivory and soft blush",
    mood: ["Calm", "Nature", "Gentle"],
    introDefault: "floral-reveal",
    motionDefault: "minimal",
    css: {
      bg: "#F4F7F2",
      surface: "#FBFCFA",
      text: "#1F2A1C",
      muted: "#5C6B58",
      primary: "#4A6B4A",
      secondary: "#C97B84",
      gold: "#A18373",
      border: "rgba(74,107,74,0.25)",
      overlay: "rgba(31,42,28,0.4)",
      frame: "#A18373",
      headingFont: "var(--font-display), Georgia, serif",
      bodyFont: "var(--font-sans), system-ui, sans-serif",
      scriptFont: "var(--font-script), 'Great Vibes', cursive",
    },
  },
  {
    id: "midnight-memorial",
    name: "Midnight Memorial",
    tagline: "Navy, silver and muted gold — modern luxury",
    mood: ["Modern", "Quiet luxury"],
    introDefault: "minimal-memorial",
    motionDefault: "gentle",
    css: {
      bg: "#0B1220",
      surface: "#121A2B",
      text: "#F1F5F9",
      muted: "#94A3B8",
      primary: "#C0C7D1",
      secondary: "#C9A227",
      gold: "#C9A227",
      border: "rgba(192,199,209,0.3)",
      overlay: "rgba(11,18,32,0.7)",
      frame: "#C0C7D1",
      headingFont: "var(--font-display), Georgia, serif",
      bodyFont: "var(--font-sans), system-ui, sans-serif",
      scriptFont: "var(--font-script), 'Great Vibes', cursive",
    },
  },
  {
    id: "pure-white-farewell",
    name: "Pure White Farewell",
    tagline: "White, ivory and soft grey — minimal",
    mood: ["Restraint", "Clarity", "Peace"],
    introDefault: "minimal-memorial",
    motionDefault: "minimal",
    css: {
      bg: "#FFFFFF",
      surface: "#FAFAFA",
      text: "#1C1917",
      muted: "#78716C",
      primary: "#44403C",
      secondary: "#C9A227",
      gold: "#C9A227",
      border: "rgba(28,25,23,0.12)",
      overlay: "rgba(28,25,23,0.35)",
      frame: "#C9A227",
      headingFont: "var(--font-display), Georgia, serif",
      bodyFont: "var(--font-sans), system-ui, sans-serif",
      scriptFont: "var(--font-script), 'Great Vibes', cursive",
    },
  },
  {
    id: "celebration-of-life",
    name: "Celebration of Life",
    tagline: "Warm neutrals — photography-led remembrance",
    mood: ["Gratitude", "Story", "Warmth"],
    introDefault: "memory-journey",
    motionDefault: "gentle",
    css: {
      bg: "#F5EFE6",
      surface: "#FFFBF5",
      text: "#292524",
      muted: "#78716C",
      primary: "#57534E",
      secondary: "#A18373",
      gold: "#B45309",
      border: "rgba(168,162,158,0.4)",
      overlay: "rgba(41,37,36,0.45)",
      frame: "#A18373",
      headingFont: "var(--font-display), Georgia, serif",
      bodyFont: "var(--font-sans), system-ui, sans-serif",
      scriptFont: "var(--font-script), 'Great Vibes', cursive",
    },
  },
  {
    id: "black-red-tradition",
    name: "Black & Red Tradition",
    tagline: "Deep black, traditional red, gold highlights",
    mood: ["Tradition", "Respect"],
    introDefault: "ghanaian-regal",
    motionDefault: "ceremonial",
    css: {
      bg: "#050505",
      surface: "#121212",
      text: "#FAFAFA",
      muted: "#A1A1AA",
      primary: "#DC2626",
      secondary: "#D4AF37",
      gold: "#D4AF37",
      border: "rgba(220,38,38,0.35)",
      overlay: "rgba(0,0,0,0.75)",
      frame: "#D4AF37",
      headingFont: "var(--font-display), Georgia, serif",
      bodyFont: "var(--font-sans), system-ui, sans-serif",
      scriptFont: "var(--font-script), 'Great Vibes', cursive",
    },
  },
  {
    id: "church-memorial",
    name: "Church Memorial",
    tagline: "Elegant Christian memorial — optional cross & scripture",
    mood: ["Faith", "Hope", "Comfort"],
    introDefault: "candle-remembrance",
    motionDefault: "gentle",
    css: {
      bg: "#F7F3EC",
      surface: "#FFFEFB",
      text: "#2C1810",
      muted: "#6B5344",
      primary: "#4A3728",
      secondary: "#D4AF37",
      gold: "#D4AF37",
      border: "rgba(212,175,55,0.4)",
      overlay: "rgba(44,24,16,0.45)",
      frame: "#D4AF37",
      headingFont: "var(--font-display), Georgia, serif",
      bodyFont: "var(--font-sans), system-ui, sans-serif",
      scriptFont: "var(--font-script), 'Great Vibes', cursive",
    },
  },
];

export const FUNERAL_THEME_BY_ID = Object.fromEntries(
  FUNERAL_EXPERIENCE_THEMES.map((t) => [t.id, t])
) as Record<FuneralThemeId, FuneralThemeTokens>;

export function resolveFuneralTheme(id: string | null | undefined): FuneralThemeTokens {
  if (id && id in FUNERAL_THEME_BY_ID) return FUNERAL_THEME_BY_ID[id as FuneralThemeId];
  return FUNERAL_THEME_BY_ID["eternal-rose"];
}

export function funeralThemeCssVars(theme: FuneralThemeTokens): Record<string, string> {
  const c = theme.css;
  return {
    ["--funeral-bg"]: c.bg,
    ["--funeral-surface"]: c.surface,
    ["--funeral-text"]: c.text,
    ["--funeral-muted"]: c.muted,
    ["--funeral-primary"]: c.primary,
    ["--funeral-secondary"]: c.secondary,
    ["--funeral-gold"]: c.gold,
    ["--funeral-border"]: c.border,
    ["--funeral-overlay"]: c.overlay,
    ["--funeral-frame"]: c.frame,
    ["--funeral-heading-font"]: c.headingFont,
    ["--funeral-body-font"]: c.bodyFont,
    ["--funeral-script-font"]: c.scriptFont,
  };
}
