/**
 * SmartCard theme system — token-based compositions (not color swaps alone).
 * Legacy IDs remain valid so existing cards keep rendering.
 */

export type DigitalCardThemeCategory =
  | "executive"
  | "creator"
  | "business"
  | "luxury"
  | "minimal"
  | "personal"
  | "public-figure";

export type DigitalCardThemeId =
  | "elegant-frost"
  | "midnight-executive"
  | "gold-folio"
  | "teal-pulse"
  | "charcoal-minimal"
  | "savannah-warm"
  | "glass-noir"
  | "coral-studio"
  | "executive-noir"
  | "titanium-glass"
  | "ivory-signature"
  | "editorial"
  | "creator-pulse"
  | "celebrity-spotlight"
  | "heritage-luxe"
  | "future-gradient"
  | "corporate-grid"
  | "artist-canvas"
  | "founder"
  | "aurora"
  | "signature-type";

export type DigitalCardTheme = {
  id: DigitalCardThemeId;
  name: string;
  tagline: string;
  previewLabel: string;
  category: DigitalCardThemeCategory;
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
  /** Composition hint for face renderer */
  composition: "classic" | "portrait-led" | "type-first" | "media-first" | "grid";
  premium?: boolean;
};

const display = "var(--font-display), Georgia, serif";
const sans = "var(--font-sans), system-ui, sans-serif";

export const DIGITAL_CARD_THEMES: DigitalCardTheme[] = [
  {
    id: "elegant-frost",
    name: "Elegant Frost",
    tagline: "Soft sky frame with gold edge — classic first impression",
    previewLabel: "Elegant",
    category: "luxury",
    stageBackground: "linear-gradient(160deg, #e8f1f8 0%, #f7fafc 55%, #eef4f8 100%)",
    cardBackground: "linear-gradient(145deg, #f4f9fc 0%, #e8f0f6 100%)",
    accent: "#0B8A83",
    accentSoft: "rgba(11,138,131,0.12)",
    text: "#0f172a",
    muted: "#64748b",
    border: "#d4a63a",
    qrInk: "#0B8A83",
    fontHeading: display,
    fontBody: sans,
    composition: "classic",
  },
  {
    id: "midnight-executive",
    name: "Midnight Executive",
    tagline: "Deep navy boardroom presence for founders and leaders",
    previewLabel: "Executive",
    category: "executive",
    stageBackground: "linear-gradient(165deg, #0b1220 0%, #152238 50%, #0f172a 100%)",
    cardBackground: "linear-gradient(150deg, #111827 0%, #0f172a 100%)",
    accent: "#38bdf8",
    accentSoft: "rgba(56,189,248,0.14)",
    text: "#f8fafc",
    muted: "#94a3b8",
    border: "#334155",
    qrInk: "#0f172a",
    fontHeading: display,
    fontBody: sans,
    composition: "classic",
    premium: true,
  },
  {
    id: "gold-folio",
    name: "Gold Folio",
    tagline: "Warm ivory and foil accents for luxury brands",
    previewLabel: "Gold Folio",
    category: "luxury",
    stageBackground: "linear-gradient(160deg, #1a1410 0%, #2a2118 45%, #1c1612 100%)",
    cardBackground: "linear-gradient(145deg, #f7f0e4 0%, #efe2cc 100%)",
    accent: "#b45309",
    accentSoft: "rgba(180,83,9,0.12)",
    text: "#1c1917",
    muted: "#78716c",
    border: "#d4a63a",
    qrInk: "#1c1917",
    fontHeading: display,
    fontBody: sans,
    composition: "classic",
    premium: true,
  },
  {
    id: "teal-pulse",
    name: "Teal Pulse",
    tagline: "Celeventic signature teal — modern and memorable",
    previewLabel: "Teal Pulse",
    category: "business",
    stageBackground: "linear-gradient(155deg, #ecfdf8 0%, #d1fae5 40%, #ccfbf1 100%)",
    cardBackground: "linear-gradient(140deg, #0B8A83 0%, #0f766e 100%)",
    accent: "#fbbf24",
    accentSoft: "rgba(251,191,36,0.18)",
    text: "#f8fafc",
    muted: "#ccfbf1",
    border: "rgba(255,255,255,0.28)",
    qrInk: "#0B8A83",
    fontHeading: display,
    fontBody: sans,
    composition: "classic",
  },
  {
    id: "charcoal-minimal",
    name: "Charcoal Minimal",
    tagline: "Quiet contrast for designers and consultants",
    previewLabel: "Minimal",
    category: "minimal",
    stageBackground: "linear-gradient(160deg, #f4f4f5 0%, #e4e4e7 100%)",
    cardBackground: "#fafafa",
    accent: "#18181b",
    accentSoft: "rgba(24,24,27,0.08)",
    text: "#18181b",
    muted: "#71717a",
    border: "#e4e4e7",
    qrInk: "#18181b",
    fontHeading: sans,
    fontBody: sans,
    composition: "type-first",
  },
  {
    id: "savannah-warm",
    name: "Savannah Warm",
    tagline: "Earth tones with West African warmth",
    previewLabel: "Savannah",
    category: "personal",
    stageBackground: "linear-gradient(160deg, #fff7ed 0%, #ffedd5 50%, #fed7aa 100%)",
    cardBackground: "linear-gradient(145deg, #fffbeb 0%, #ffedd5 100%)",
    accent: "#c2410c",
    accentSoft: "rgba(194,65,12,0.12)",
    text: "#431407",
    muted: "#9a3412",
    border: "#fdba74",
    qrInk: "#9a3412",
    fontHeading: display,
    fontBody: sans,
    composition: "classic",
  },
  {
    id: "glass-noir",
    name: "Glass Noir",
    tagline: "Frosted dark glass for tech and creative studios",
    previewLabel: "Glass Noir",
    category: "creator",
    stageBackground: "radial-gradient(ellipse at 30% 20%, #1e293b 0%, #020617 55%, #000 100%)",
    cardBackground: "linear-gradient(145deg, rgba(30,41,59,0.92) 0%, rgba(15,23,42,0.96) 100%)",
    accent: "#a78bfa",
    accentSoft: "rgba(167,139,250,0.16)",
    text: "#f1f5f9",
    muted: "#94a3b8",
    border: "rgba(148,163,184,0.35)",
    qrInk: "#0f172a",
    fontHeading: sans,
    fontBody: sans,
    composition: "media-first",
    premium: true,
  },
  {
    id: "coral-studio",
    name: "Coral Studio",
    tagline: "Bright creative energy for agencies and freelancers",
    previewLabel: "Coral",
    category: "creator",
    stageBackground: "linear-gradient(155deg, #fff1f2 0%, #ffe4e6 45%, #fecdd3 100%)",
    cardBackground: "linear-gradient(140deg, #fff 0%, #fff1f2 100%)",
    accent: "#e11d48",
    accentSoft: "rgba(225,29,72,0.1)",
    text: "#1f2937",
    muted: "#9f1239",
    border: "#fda4af",
    qrInk: "#be123c",
    fontHeading: display,
    fontBody: sans,
    composition: "classic",
  },
  {
    id: "executive-noir",
    name: "Executive Noir",
    tagline: "Graphite authority with restrained metallic edge",
    previewLabel: "Noir",
    category: "executive",
    stageBackground: "linear-gradient(168deg, #0a0a0a 0%, #171717 48%, #0c0c0c 100%)",
    cardBackground: "linear-gradient(150deg, #141414 0%, #0a0a0a 100%)",
    accent: "#c4b5a0",
    accentSoft: "rgba(196,181,160,0.14)",
    text: "#fafaf9",
    muted: "#a8a29e",
    border: "#292524",
    qrInk: "#0a0a0a",
    fontHeading: display,
    fontBody: sans,
    composition: "type-first",
    premium: true,
  },
  {
    id: "titanium-glass",
    name: "Titanium Glass",
    tagline: "Silver layers for modern executive technology",
    previewLabel: "Titanium",
    category: "executive",
    stageBackground: "linear-gradient(155deg, #e2e8f0 0%, #cbd5e1 45%, #94a3b8 100%)",
    cardBackground: "linear-gradient(145deg, rgba(248,250,252,0.92) 0%, rgba(226,232,240,0.95) 100%)",
    accent: "#475569",
    accentSoft: "rgba(71,85,105,0.12)",
    text: "#0f172a",
    muted: "#64748b",
    border: "rgba(148,163,184,0.55)",
    qrInk: "#334155",
    fontHeading: sans,
    fontBody: sans,
    composition: "classic",
    premium: true,
  },
  {
    id: "ivory-signature",
    name: "Ivory Signature",
    tagline: "Warm ivory, fine gold lines — luxury professional",
    previewLabel: "Ivory",
    category: "luxury",
    stageBackground: "linear-gradient(160deg, #faf6f0 0%, #f3ebe0 55%, #ebe1d2 100%)",
    cardBackground: "linear-gradient(145deg, #fffcf7 0%, #f7f0e6 100%)",
    accent: "#a16207",
    accentSoft: "rgba(161,98,7,0.1)",
    text: "#1c1917",
    muted: "#78716c",
    border: "#d6bc8a",
    qrInk: "#713f12",
    fontHeading: display,
    fontBody: sans,
    composition: "classic",
    premium: true,
  },
  {
    id: "editorial",
    name: "Editorial",
    tagline: "Magazine hierarchy — large type, minimal imagery",
    previewLabel: "Editorial",
    category: "minimal",
    stageBackground: "linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)",
    cardBackground: "#ffffff",
    accent: "#0f172a",
    accentSoft: "rgba(15,23,42,0.06)",
    text: "#020617",
    muted: "#64748b",
    border: "#0f172a",
    qrInk: "#020617",
    fontHeading: display,
    fontBody: sans,
    composition: "type-first",
  },
  {
    id: "creator-pulse",
    name: "Creator Pulse",
    tagline: "Color-rich, media-first, motion-forward",
    previewLabel: "Creator",
    category: "creator",
    stageBackground: "radial-gradient(ellipse at 20% 0%, #7c3aed33 0%, #0f172a 45%, #020617 100%)",
    cardBackground: "linear-gradient(145deg, #1e1b4b 0%, #312e81 55%, #4c1d95 100%)",
    accent: "#f472b6",
    accentSoft: "rgba(244,114,182,0.18)",
    text: "#fdf4ff",
    muted: "#e9d5ff",
    border: "rgba(244,114,182,0.35)",
    qrInk: "#1e1b4b",
    fontHeading: sans,
    fontBody: sans,
    composition: "media-first",
    premium: true,
  },
  {
    id: "celebrity-spotlight",
    name: "Celebrity Spotlight",
    tagline: "Portrait-led press-kit presence",
    previewLabel: "Spotlight",
    category: "public-figure",
    stageBackground: "radial-gradient(circle at 50% 0%, #fef3c7 0%, #111827 42%, #000 100%)",
    cardBackground: "linear-gradient(160deg, #18181b 0%, #09090b 100%)",
    accent: "#fbbf24",
    accentSoft: "rgba(251,191,36,0.16)",
    text: "#fafafa",
    muted: "#a1a1aa",
    border: "#3f3f46",
    qrInk: "#09090b",
    fontHeading: display,
    fontBody: sans,
    composition: "portrait-led",
    premium: true,
  },
  {
    id: "heritage-luxe",
    name: "Heritage Luxe",
    tagline: "Elegant serif identity with cultural texture",
    previewLabel: "Heritage",
    category: "luxury",
    stageBackground: "linear-gradient(165deg, #1c1410 0%, #3b2a1e 50%, #1a120e 100%)",
    cardBackground: "linear-gradient(145deg, #2a1d14 0%, #1a120e 100%)",
    accent: "#e7c07a",
    accentSoft: "rgba(231,192,122,0.14)",
    text: "#faf6ef",
    muted: "#c4a574",
    border: "#5c4030",
    qrInk: "#1a120e",
    fontHeading: display,
    fontBody: display,
    composition: "classic",
    premium: true,
  },
  {
    id: "future-gradient",
    name: "Future Gradient",
    tagline: "Controlled gradient field — modern tech identity",
    previewLabel: "Future",
    category: "business",
    stageBackground: "linear-gradient(135deg, #0ea5e9 0%, #6366f1 48%, #a855f7 100%)",
    cardBackground: "linear-gradient(145deg, rgba(255,255,255,0.18) 0%, rgba(15,23,42,0.55) 100%)",
    accent: "#ffffff",
    accentSoft: "rgba(255,255,255,0.16)",
    text: "#f8fafc",
    muted: "#e0e7ff",
    border: "rgba(255,255,255,0.35)",
    qrInk: "#312e81",
    fontHeading: sans,
    fontBody: sans,
    composition: "classic",
  },
  {
    id: "corporate-grid",
    name: "Corporate Grid",
    tagline: "Structured, brand-safe, enterprise-ready",
    previewLabel: "Corporate",
    category: "business",
    stageBackground: "linear-gradient(180deg, #f1f5f9 0%, #e2e8f0 100%)",
    cardBackground: "#ffffff",
    accent: "#0B8A83",
    accentSoft: "rgba(11,138,131,0.1)",
    text: "#0f172a",
    muted: "#64748b",
    border: "#cbd5e1",
    qrInk: "#0B8A83",
    fontHeading: sans,
    fontBody: sans,
    composition: "grid",
  },
  {
    id: "artist-canvas",
    name: "Artist Canvas",
    tagline: "Portfolio-first layout for makers",
    previewLabel: "Canvas",
    category: "creator",
    stageBackground: "linear-gradient(160deg, #fafaf9 0%, #e7e5e4 100%)",
    cardBackground: "linear-gradient(145deg, #ffffff 0%, #f5f5f4 100%)",
    accent: "#ea580c",
    accentSoft: "rgba(234,88,12,0.1)",
    text: "#1c1917",
    muted: "#78716c",
    border: "#d6d3d1",
    qrInk: "#9a3412",
    fontHeading: display,
    fontBody: sans,
    composition: "media-first",
  },
  {
    id: "founder",
    name: "Founder",
    tagline: "Strong personal brand with company presence",
    previewLabel: "Founder",
    category: "executive",
    stageBackground: "linear-gradient(165deg, #042f2e 0%, #0f766e 50%, #134e4a 100%)",
    cardBackground: "linear-gradient(145deg, #115e59 0%, #134e4a 100%)",
    accent: "#fde68a",
    accentSoft: "rgba(253,230,138,0.16)",
    text: "#ecfdf5",
    muted: "#99f6e4",
    border: "rgba(253,230,138,0.35)",
    qrInk: "#134e4a",
    fontHeading: display,
    fontBody: sans,
    composition: "portrait-led",
    premium: true,
  },
  {
    id: "aurora",
    name: "Aurora",
    tagline: "Soft luminous gradients and atmospheric calm",
    previewLabel: "Aurora",
    category: "personal",
    stageBackground: "radial-gradient(ellipse at 30% 20%, #a5f3fc66 0%, #fce7f366 40%, #e0e7ff 100%)",
    cardBackground: "linear-gradient(145deg, rgba(255,255,255,0.85) 0%, rgba(224,242,254,0.9) 100%)",
    accent: "#6366f1",
    accentSoft: "rgba(99,102,241,0.12)",
    text: "#1e1b4b",
    muted: "#6366f1",
    border: "rgba(99,102,241,0.25)",
    qrInk: "#4338ca",
    fontHeading: sans,
    fontBody: sans,
    composition: "classic",
  },
  {
    id: "signature-type",
    name: "Signature",
    tagline: "Typography-first personal identity",
    previewLabel: "Signature",
    category: "minimal",
    stageBackground: "linear-gradient(180deg, #fafafa 0%, #f4f4f5 100%)",
    cardBackground: "#ffffff",
    accent: "#18181b",
    accentSoft: "rgba(24,24,27,0.06)",
    text: "#09090b",
    muted: "#71717a",
    border: "#e4e4e7",
    qrInk: "#09090b",
    fontHeading: display,
    fontBody: sans,
    composition: "type-first",
  },
];

export const DIGITAL_CARD_THEME_BY_ID: Record<DigitalCardThemeId, DigitalCardTheme> =
  Object.fromEntries(DIGITAL_CARD_THEMES.map((t) => [t.id, t])) as Record<
    DigitalCardThemeId,
    DigitalCardTheme
  >;

export const DIGITAL_CARD_THEME_FILTERS: { id: "all" | DigitalCardThemeCategory; label: string }[] = [
  { id: "all", label: "All" },
  { id: "executive", label: "Executive" },
  { id: "creator", label: "Creator" },
  { id: "business", label: "Business" },
  { id: "luxury", label: "Luxury" },
  { id: "minimal", label: "Minimal" },
  { id: "personal", label: "Personal" },
  { id: "public-figure", label: "Public Figure" },
];

export function resolveDigitalCardTheme(id: string | null | undefined): DigitalCardTheme {
  if (id && id in DIGITAL_CARD_THEME_BY_ID) {
    return DIGITAL_CARD_THEME_BY_ID[id as DigitalCardThemeId];
  }
  return DIGITAL_CARD_THEME_BY_ID["elegant-frost"];
}
