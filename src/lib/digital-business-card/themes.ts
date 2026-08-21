/**
 * Premium digital business card themes — each maps to a shareable one-stop profile.
 */

export type DigitalCardThemeId =
  | "elegant-frost"
  | "midnight-executive"
  | "gold-folio"
  | "teal-pulse"
  | "charcoal-minimal"
  | "savannah-warm"
  | "glass-noir"
  | "coral-studio";

export type DigitalCardTheme = {
  id: DigitalCardThemeId;
  name: string;
  tagline: string;
  previewLabel: string;
  /** CSS background for the live card stage */
  stageBackground: string;
  cardBackground: string;
  accent: string;
  accentSoft: string;
  text: string;
  muted: string;
  border: string;
  qrInk: string;
  fontHeading: string;
  fontBody: string;
  premium?: boolean;
};

export const DIGITAL_CARD_THEMES: DigitalCardTheme[] = [
  {
    id: "elegant-frost",
    name: "Elegant Frost",
    tagline: "Soft sky frame with gold edge — classic first impression",
    previewLabel: "Elegant",
    stageBackground: "linear-gradient(160deg, #e8f1f8 0%, #f7fafc 55%, #eef4f8 100%)",
    cardBackground: "linear-gradient(145deg, #f4f9fc 0%, #e8f0f6 100%)",
    accent: "#0B8A83",
    accentSoft: "rgba(11,138,131,0.12)",
    text: "#0f172a",
    muted: "#64748b",
    border: "#d4a63a",
    qrInk: "#0B8A83",
    fontHeading: "var(--font-display), Georgia, serif",
    fontBody: "var(--font-sans), system-ui, sans-serif",
  },
  {
    id: "midnight-executive",
    name: "Midnight Executive",
    tagline: "Deep navy boardroom presence for founders and leaders",
    previewLabel: "Executive",
    stageBackground: "linear-gradient(165deg, #0b1220 0%, #152238 50%, #0f172a 100%)",
    cardBackground: "linear-gradient(150deg, #111827 0%, #0f172a 100%)",
    accent: "#38bdf8",
    accentSoft: "rgba(56,189,248,0.14)",
    text: "#f8fafc",
    muted: "#94a3b8",
    border: "#334155",
    qrInk: "#0f172a",
    fontHeading: "var(--font-display), Georgia, serif",
    fontBody: "var(--font-sans), system-ui, sans-serif",
    premium: true,
  },
  {
    id: "gold-folio",
    name: "Gold Folio",
    tagline: "Warm ivory and foil accents for luxury brands",
    previewLabel: "Gold Folio",
    stageBackground: "linear-gradient(160deg, #1a1410 0%, #2a2118 45%, #1c1612 100%)",
    cardBackground: "linear-gradient(145deg, #f7f0e4 0%, #efe2cc 100%)",
    accent: "#b45309",
    accentSoft: "rgba(180,83,9,0.12)",
    text: "#1c1917",
    muted: "#78716c",
    border: "#d4a63a",
    qrInk: "#1c1917",
    fontHeading: "var(--font-display), Georgia, serif",
    fontBody: "var(--font-sans), system-ui, sans-serif",
    premium: true,
  },
  {
    id: "teal-pulse",
    name: "Teal Pulse",
    tagline: "Celeventic signature teal — modern and memorable",
    previewLabel: "Teal Pulse",
    stageBackground: "linear-gradient(155deg, #ecfdf8 0%, #d1fae5 40%, #ccfbf1 100%)",
    cardBackground: "linear-gradient(140deg, #0B8A83 0%, #0f766e 100%)",
    accent: "#fbbf24",
    accentSoft: "rgba(251,191,36,0.18)",
    text: "#f8fafc",
    muted: "#ccfbf1",
    border: "rgba(255,255,255,0.28)",
    qrInk: "#0B8A83",
    fontHeading: "var(--font-display), Georgia, serif",
    fontBody: "var(--font-sans), system-ui, sans-serif",
  },
  {
    id: "charcoal-minimal",
    name: "Charcoal Minimal",
    tagline: "Quiet contrast for designers and consultants",
    previewLabel: "Minimal",
    stageBackground: "linear-gradient(160deg, #f4f4f5 0%, #e4e4e7 100%)",
    cardBackground: "#fafafa",
    accent: "#18181b",
    accentSoft: "rgba(24,24,27,0.08)",
    text: "#18181b",
    muted: "#71717a",
    border: "#e4e4e7",
    qrInk: "#18181b",
    fontHeading: "var(--font-sans), system-ui, sans-serif",
    fontBody: "var(--font-sans), system-ui, sans-serif",
  },
  {
    id: "savannah-warm",
    name: "Savannah Warm",
    tagline: "Earth tones with West African warmth",
    previewLabel: "Savannah",
    stageBackground: "linear-gradient(160deg, #fff7ed 0%, #ffedd5 50%, #fed7aa 100%)",
    cardBackground: "linear-gradient(145deg, #fffbeb 0%, #ffedd5 100%)",
    accent: "#c2410c",
    accentSoft: "rgba(194,65,12,0.12)",
    text: "#431407",
    muted: "#9a3412",
    border: "#fdba74",
    qrInk: "#9a3412",
    fontHeading: "var(--font-display), Georgia, serif",
    fontBody: "var(--font-sans), system-ui, sans-serif",
  },
  {
    id: "glass-noir",
    name: "Glass Noir",
    tagline: "Frosted dark glass for tech and creative studios",
    previewLabel: "Glass Noir",
    stageBackground: "radial-gradient(ellipse at 30% 20%, #1e293b 0%, #020617 55%, #000 100%)",
    cardBackground: "linear-gradient(145deg, rgba(30,41,59,0.92) 0%, rgba(15,23,42,0.96) 100%)",
    accent: "#a78bfa",
    accentSoft: "rgba(167,139,250,0.16)",
    text: "#f1f5f9",
    muted: "#94a3b8",
    border: "rgba(148,163,184,0.35)",
    qrInk: "#0f172a",
    fontHeading: "var(--font-sans), system-ui, sans-serif",
    fontBody: "var(--font-sans), system-ui, sans-serif",
    premium: true,
  },
  {
    id: "coral-studio",
    name: "Coral Studio",
    tagline: "Bright creative energy for agencies and freelancers",
    previewLabel: "Coral",
    stageBackground: "linear-gradient(155deg, #fff1f2 0%, #ffe4e6 45%, #fecdd3 100%)",
    cardBackground: "linear-gradient(140deg, #fff 0%, #fff1f2 100%)",
    accent: "#e11d48",
    accentSoft: "rgba(225,29,72,0.1)",
    text: "#1f2937",
    muted: "#9f1239",
    border: "#fda4af",
    qrInk: "#be123c",
    fontHeading: "var(--font-display), Georgia, serif",
    fontBody: "var(--font-sans), system-ui, sans-serif",
  },
];

export const DIGITAL_CARD_THEME_BY_ID: Record<DigitalCardThemeId, DigitalCardTheme> =
  Object.fromEntries(DIGITAL_CARD_THEMES.map((t) => [t.id, t])) as Record<
    DigitalCardThemeId,
    DigitalCardTheme
  >;

export function resolveDigitalCardTheme(id: string | null | undefined): DigitalCardTheme {
  if (id && id in DIGITAL_CARD_THEME_BY_ID) {
    return DIGITAL_CARD_THEME_BY_ID[id as DigitalCardThemeId];
  }
  return DIGITAL_CARD_THEME_BY_ID["elegant-frost"];
}
