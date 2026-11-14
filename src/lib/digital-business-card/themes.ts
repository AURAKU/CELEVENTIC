/**
 * SmartCard theme system. Token-based compositions (not color swaps alone).
 * Legacy IDs remain valid so existing cards keep rendering.
 * elegant-frost is the original CeleYou plate. Do not change its default
 * layout, teal, or gold without explicit brand approval.
 */

import { CELEYOU_ORIGINAL_THEME_ID } from "@/lib/digital-business-card/brand-lock";

export type DigitalCardThemeCategory =
  | "executive"
  | "creator"
  | "business"
  | "luxury"
  | "minimal"
  | "personal"
  | "public-figure"
  | "iconic"
  | "cinematic"
  | "landmark"
  | "atelier";

export type DigitalCardAtmosphere =
  | "none"
  | "film-credits"
  | "silver-screen"
  | "desert-road"
  | "rain-city"
  | "skyline"
  | "arch-monument"
  | "dunes"
  | "mist-peak"
  | "cliff-white"
  | "river-gold"
  | "flat-mountain"
  | "canal"
  | "dawn-peak"
  | "canopy"
  | "lantern-street"
  | "spire"
  | "alpine"
  | "leather"
  | "porcelain"
  | "marble-ink"
  | "chrome"
  | "garden"
  | "salon"
  | "wave-pulse"
  | "coral-fan"
  | "masthead"
  | "motion-bars"
  | "spotlight"
  | "aurora-band"
  | "canvas-frame"
  | "pop-burst"
  | "comic-panel"
  | "deco-fan"
  | "ukiyo-print"
  | "cel-speed"
  | "street-asphalt"
  | "renaissance-arch"
  | "ballroom"
  | "mesa"
  | "starfield"
  | "spy-glass"
  | "fog-bridge"
  | "harbor"
  | "granite-peak"
  | "blossom"
  | "civic-dome"
  | "herringbone"
  | "lacquer"
  | "linen"
  | "grid-panel";

export type DigitalCardComposition =
  | "classic"
  | "portrait-led"
  | "type-first"
  | "media-first"
  | "grid"
  | "iconic";

export type DigitalCardOrnament =
  | "none"
  | "foil"
  | "double"
  | "filigree"
  | "bead"
  | "inset"
  | "ribbon"
  | "halftone"
  | "wave"
  | "grid"
  | "marquee"
  | "cel"
  | "crest"
  | "kente"
  | "sunburst"
  | "neon";

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
  | "signature-type"
  | "pop-art-burst"
  | "comic-halftone"
  | "deco-gilded"
  | "ukiyo-wave"
  | "cyber-neon"
  | "afro-future"
  | "anime-cel"
  | "street-king"
  | "renaissance-foil"
  | "hollywood-marquee"
  | "velvet-credits"
  | "desert-reel"
  | "rain-city"
  | "silent-silver"
  | "accra-horizon"
  | "sahara-dune"
  | "mist-peak"
  | "white-cliff"
  | "nile-gold"
  | "table-cape"
  | "canal-light"
  | "night-skyline"
  | "dawn-peak"
  | "lantern-walk"
  | "glass-spire"
  | "canopy-green"
  | "saddle-atelier"
  | "porcelain-house"
  | "ink-salon"
  | "chrome-hardware"
  | "garden-maison"
  | "ballroom-gold"
  | "mesa-dusk"
  | "star-opera"
  | "spy-night"
  | "fog-span"
  | "harbor-beacon"
  | "granite-bay"
  | "blossom-court"
  | "dome-dusk"
  | "herringbone-cut"
  | "lacquer-case"
  | "linen-loom";

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
  composition: DigitalCardComposition;
  premium?: boolean;
  /** Original art-movement texture (never licensed characters). */
  textureUrl?: string;
  ornament?: DigitalCardOrnament;
  artLabel?: string;
  /** Original landscape, cinema, or house atmosphere. Never a licensed mark. */
  atmosphere?: DigitalCardAtmosphere;
};

/** Guest-page motion family. Every template maps to one so motion complements the room. */
export type CeleCardMotionMood = "atelier" | "cinema" | "pulse" | "earth" | "linen" | "still" | "spotlight";

export function celecardMotionMood(
  theme: DigitalCardTheme,
  override?: CeleCardMotionMood | null
): CeleCardMotionMood {
  if (override) return override;
  const atmo = theme.atmosphere;
  if (
    theme.category === "cinematic" ||
    theme.category === "iconic" ||
    atmo === "film-credits" ||
    atmo === "silver-screen" ||
    atmo === "spotlight" ||
    atmo === "starfield"
  ) {
    return "cinema";
  }
  if (
    theme.category === "creator" ||
    theme.category === "personal" ||
    theme.category === "public-figure" ||
    theme.ornament === "neon" ||
    atmo === "pop-burst" ||
    atmo === "comic-panel" ||
    atmo === "cel-speed"
  ) {
    return "pulse";
  }
  if (
    theme.category === "landmark" ||
    theme.ornament === "kente" ||
    atmo === "dunes" ||
    atmo === "canopy" ||
    atmo === "mesa" ||
    atmo === "desert-road" ||
    atmo === "dawn-peak"
  ) {
    return "earth";
  }
  if (theme.category === "luxury" || theme.category === "atelier" || theme.category === "executive") {
    return "atelier";
  }
  return "linen";
}

const display = "var(--font-card-display), Georgia, 'Times New Roman', serif";
const sans = "var(--font-sans), system-ui, sans-serif";

export const DIGITAL_CARD_THEMES: DigitalCardTheme[] = [
  {
    id: "elegant-frost",
    name: "Elegant Frost",
    tagline: "Soft sky frame with gold edge. Classic first impression",
    previewLabel: "Elegant",
    category: "luxury",
    stageBackground: "radial-gradient(130% 88% at 50% -12%, #f7fbff 0%, #e8eef4 38%, #d7e2ea 72%, #c9d6e0 100%)",
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
    atmosphere: "salon",
    artLabel: "Salon",
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
    atmosphere: "skyline",
    artLabel: "Boardroom",
  },
  {
    id: "gold-folio",
    name: "Gold Folio",
    tagline: "Warm ivory and foil accents for luxury brands",
    previewLabel: "Gold Folio",
    category: "luxury",
    stageBackground: "linear-gradient(160deg, #1a1410 0%, #2a2118 45%, #1c1612 100%)",
    cardBackground:
      "linear-gradient(155deg, #fffaf1 0%, #f6ead0 36%, #ead4a6 68%, #f4e6c4 100%)",
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
    ornament: "foil",
    atmosphere: "leather",
    artLabel: "Maison",
  },
  {
    id: "teal-pulse",
    name: "Teal Pulse",
    tagline: "Celeventic signature teal. Modern and memorable",
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
    atmosphere: "wave-pulse",
    artLabel: "Pulse",
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
    atmosphere: "marble-ink",
    artLabel: "Quiet type",
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
    atmosphere: "dunes",
    artLabel: "Savannah",
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
    atmosphere: "rain-city",
    artLabel: "Noir glass",
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
    atmosphere: "coral-fan",
    artLabel: "Coral",
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
    atmosphere: "film-credits",
    artLabel: "Graphite",
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
    atmosphere: "chrome",
    artLabel: "Titanium",
  },
  {
    id: "ivory-signature",
    name: "Ivory Signature",
    tagline: "Warm ivory, fine gold lines. Luxury professional",
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
    ornament: "foil",
    atmosphere: "porcelain",
    artLabel: "Ivory",
  },
  {
    id: "editorial",
    name: "Editorial",
    tagline: "Magazine hierarchy. Large type, minimal imagery",
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
    atmosphere: "masthead",
    artLabel: "Editorial",
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
    atmosphere: "motion-bars",
    artLabel: "Creator",
  },
  {
    id: "celebrity-spotlight",
    name: "Celebrity Spotlight",
    tagline: "Portrait-led press-kit presence",
    previewLabel: "Spotlight",
    category: "public-figure",
    stageBackground: "radial-gradient(ellipse at 50% -8%, rgba(251,191,36,0.55) 0%, rgba(15,23,42,0.35) 38%, #020617 100%)",
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
    ornament: "marquee",
    atmosphere: "spotlight",
    artLabel: "Spotlight",
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
    ornament: "foil",
    atmosphere: "renaissance-arch",
    artLabel: "Heritage",
  },
  {
    id: "future-gradient",
    name: "Future Gradient",
    tagline: "Controlled gradient field. Modern tech identity",
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
    atmosphere: "aurora-band",
    artLabel: "Future",
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
    atmosphere: "grid-panel",
    artLabel: "Corporate",
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
    atmosphere: "canvas-frame",
    artLabel: "Canvas",
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
    atmosphere: "skyline",
    artLabel: "Founder",
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
    atmosphere: "aurora-band",
    artLabel: "Aurora",
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
    atmosphere: "masthead",
    artLabel: "Signature",
  },
  {
    id: "pop-art-burst",
    name: "Pop Burst",
    tagline: "Bold halftone energy. Original pop-art graphic, not a licensed character",
    previewLabel: "Pop Art",
    category: "iconic",
    stageBackground: "linear-gradient(145deg, #0f172a 0%, #1e1b4b 50%, #be123c 100%)",
    cardBackground: "linear-gradient(145deg, #111827 0%, #0b1220 100%)",
    accent: "#facc15",
    accentSoft: "rgba(250,204,21,0.18)",
    text: "#fff7ed",
    muted: "#fda4af",
    border: "#f43f5e",
    qrInk: "#111827",
    fontHeading: sans,
    fontBody: sans,
    composition: "iconic",
    premium: true,
    textureUrl: "/smartcard/textures/pop.jpg",
    ornament: "halftone",
    atmosphere: "pop-burst",
    artLabel: "Pop Art",
  },
  {
    id: "comic-halftone",
    name: "Panel Ink",
    tagline: "Comic-book composition with original burst frames and ink dots",
    previewLabel: "Comic",
    category: "iconic",
    stageBackground: "linear-gradient(160deg, #f8fafc 0%, #e2e8f0 100%)",
    cardBackground: "linear-gradient(145deg, #fefce8 0%, #fff 100%)",
    accent: "#dc2626",
    accentSoft: "rgba(220,38,38,0.12)",
    text: "#0f172a",
    muted: "#334155",
    border: "#0f172a",
    qrInk: "#0f172a",
    fontHeading: sans,
    fontBody: sans,
    composition: "iconic",
    premium: true,
    textureUrl: "/smartcard/textures/pop.jpg",
    ornament: "halftone",
    atmosphere: "comic-panel",
    artLabel: "Comic",
  },
  {
    id: "deco-gilded",
    name: "Deco Gilded",
    tagline: "Art Deco sunburst and gold lacquer for founders who dress the room",
    previewLabel: "Deco",
    category: "iconic",
    stageBackground: "linear-gradient(165deg, #050505 0%, #1c1410 55%, #0a0a0a 100%)",
    cardBackground: "linear-gradient(150deg, #0b0b0b 0%, #171412 100%)",
    accent: "#e8c872",
    accentSoft: "rgba(232,200,114,0.16)",
    text: "#faf6ef",
    muted: "#d6bc8a",
    border: "#c4a15a",
    qrInk: "#111111",
    fontHeading: display,
    fontBody: sans,
    composition: "iconic",
    premium: true,
    textureUrl: "/smartcard/textures/deco.jpg",
    ornament: "sunburst",
    atmosphere: "deco-fan",
    artLabel: "Art Deco",
  },
  {
    id: "ukiyo-wave",
    name: "Ukiyo Wave",
    tagline: "Woodblock indigo and vermillion. Original wave, public-domain spirit",
    previewLabel: "Ukiyo",
    category: "iconic",
    stageBackground: "linear-gradient(160deg, #0b1d36 0%, #1e3a5f 50%, #7f1d1d 100%)",
    cardBackground: "linear-gradient(145deg, #10233f 0%, #1a365d 100%)",
    accent: "#f4e4c1",
    accentSoft: "rgba(244,228,193,0.16)",
    text: "#fff7ed",
    muted: "#fdba74",
    border: "#c2410c",
    qrInk: "#1a365d",
    fontHeading: display,
    fontBody: display,
    composition: "iconic",
    premium: true,
    textureUrl: "/smartcard/textures/ukiyo.jpg",
    ornament: "wave",
    artLabel: "Ukiyo",
    atmosphere: "ukiyo-print",
  },
  {
    id: "cyber-neon",
    name: "Nightgrid",
    tagline: "Neon rain-slick city identity for tech founders and product leads",
    previewLabel: "Cyber",
    category: "iconic",
    stageBackground: "radial-gradient(ellipse at 20% 0%, #22d3ee33 0%, #020617 50%, #000 100%)",
    cardBackground: "linear-gradient(145deg, #020617 0%, #0f172a 100%)",
    accent: "#22d3ee",
    accentSoft: "rgba(34,211,238,0.16)",
    text: "#ecfeff",
    muted: "#a5f3fc",
    border: "#c026d3",
    qrInk: "#020617",
    fontHeading: sans,
    fontBody: sans,
    composition: "iconic",
    premium: true,
    textureUrl: "/smartcard/textures/cyber.jpg",
    ornament: "neon",
    artLabel: "Cyber",
    atmosphere: "rain-city",
  },
  {
    id: "afro-future",
    name: "Orbit Atelier",
    tagline: "Afrofuturist gold geometry. Original kente-inspired rhythm, not a copy",
    previewLabel: "Afrofuture",
    category: "iconic",
    stageBackground: "linear-gradient(165deg, #1a0a00 0%, #3b1d08 45%, #0c0a09 100%)",
    cardBackground: "linear-gradient(145deg, #1c1008 0%, #0c0a09 100%)",
    accent: "#fbbf24",
    accentSoft: "rgba(251,191,36,0.16)",
    text: "#fffbeb",
    muted: "#fdba74",
    border: "#b45309",
    qrInk: "#1c1008",
    fontHeading: display,
    fontBody: sans,
    composition: "iconic",
    premium: true,
    ornament: "kente",
    artLabel: "Afrofuturism",
    atmosphere: "arch-monument",
  },
  {
    id: "anime-cel",
    name: "Cel Frame",
    tagline: "Original cel-shade energy. Speed lines and ink, never a licensed hero",
    previewLabel: "Cel",
    category: "iconic",
    stageBackground: "linear-gradient(160deg, #e0f2fe 0%, #fae8ff 50%, #fff7ed 100%)",
    cardBackground: "linear-gradient(145deg, #ffffff 0%, #eff6ff 100%)",
    accent: "#db2777",
    accentSoft: "rgba(219,39,119,0.12)",
    text: "#0f172a",
    muted: "#64748b",
    border: "#0f172a",
    qrInk: "#0f172a",
    fontHeading: sans,
    fontBody: sans,
    composition: "iconic",
    premium: true,
    ornament: "cel",
    atmosphere: "cel-speed",
    artLabel: "Cel shade",
  },
  {
    id: "street-king",
    name: "Block & Crown",
    tagline: "Street-luxury type and asphalt grain for personal brands that fill rooms",
    previewLabel: "Street",
    category: "iconic",
    stageBackground: "linear-gradient(160deg, #171717 0%, #404040 50%, #0a0a0a 100%)",
    cardBackground: "linear-gradient(145deg, #18181b 0%, #09090b 100%)",
    accent: "#fafafa",
    accentSoft: "rgba(250,250,250,0.1)",
    text: "#fafafa",
    muted: "#a1a1aa",
    border: "#facc15",
    qrInk: "#09090b",
    fontHeading: sans,
    fontBody: sans,
    composition: "type-first",
    premium: true,
    ornament: "crest",
    atmosphere: "street-asphalt",
    artLabel: "Street luxury",
  },
  {
    id: "renaissance-foil",
    name: "Foil & Form",
    tagline: "Renaissance parchment and gold leaf for galleries, lawyers, ateliers",
    previewLabel: "Renaissance",
    category: "iconic",
    stageBackground: "linear-gradient(165deg, #1c1410 0%, #44403c 50%, #1c1917 100%)",
    cardBackground: "linear-gradient(145deg, #f5ead7 0%, #e8d5b5 100%)",
    accent: "#92400e",
    accentSoft: "rgba(146,64,14,0.12)",
    text: "#1c1917",
    muted: "#78716c",
    border: "#b45309",
    qrInk: "#1c1917",
    fontHeading: display,
    fontBody: display,
    composition: "classic",
    premium: true,
    ornament: "foil",
    atmosphere: "renaissance-arch",
    artLabel: "Renaissance",
  },
  {
    id: "hollywood-marquee",
    name: "Goldlight",
    tagline: "Marquee bulbs and velvet night. Original cinema glamour, not a studio logo",
    previewLabel: "Marquee",
    category: "iconic",
    stageBackground: "radial-gradient(circle at 50% 0%, #fde68a55 0%, #111827 42%, #000 100%)",
    cardBackground: "linear-gradient(160deg, #1c1917 0%, #0c0a09 100%)",
    accent: "#fbbf24",
    accentSoft: "rgba(251,191,36,0.18)",
    text: "#fffbeb",
    muted: "#fde68a",
    border: "#f59e0b",
    qrInk: "#0c0a09",
    fontHeading: display,
    fontBody: sans,
    composition: "portrait-led",
    premium: true,
    ornament: "marquee",
    artLabel: "Marquee",
    atmosphere: "film-credits",
  },
  {
    id: "velvet-credits",
    name: "Velvet Credits",
    tagline: "Letterboxed gold titles on velvet night. Original cinema glamour, not a studio mark",
    previewLabel: "Velvet Credits",
    category: "cinematic",
    stageBackground: "radial-gradient(circle at 50% 0%, #7f1d1d 0%, #1c1917 42%, #0c0a09 100%)",
    cardBackground: "linear-gradient(160deg, #1c1010 0%, #0c0a09 100%)",
    accent: "#e8c872",
    accentSoft: "rgba(232,200,114,0.16)",
    text: "#fff7ed",
    muted: "#fde68a",
    border: "#7f1d1d",
    qrInk: "#0c0a09",
    fontHeading: display,
    fontBody: sans,
    composition: "portrait-led",
    premium: true,
    ornament: "marquee",
    atmosphere: "film-credits",
    artLabel: "Cinema",
  },
  {
    id: "desert-reel",
    name: "Desert Reel",
    tagline: "Amber highway dusk. Original road-movie atmosphere, never a licensed still",
    previewLabel: "Desert Reel",
    category: "cinematic",
    stageBackground: "linear-gradient(180deg, #9a3412 0%, #c2410c 38%, #f59e0b 100%)",
    cardBackground: "linear-gradient(145deg, #9a3412 0%, #7c2d12 100%)",
    accent: "#fde68a",
    accentSoft: "rgba(253,230,138,0.18)",
    text: "#fffbeb",
    muted: "#fed7aa",
    border: "#fdba74",
    qrInk: "#7c2d12",
    fontHeading: display,
    fontBody: sans,
    composition: "iconic",
    premium: true,
    atmosphere: "desert-road",
    artLabel: "Dusk reel",
  },
  {
    id: "rain-city",
    name: "Rain City",
    tagline: "Wet midnight glass and teal reflections. Original night-city frame",
    previewLabel: "Rain City",
    category: "cinematic",
    stageBackground: "radial-gradient(ellipse at 20% 0%, #22d3ee22 0%, #020617 48%, #000 100%)",
    cardBackground: "linear-gradient(145deg, #020617 0%, #0b1220 100%)",
    accent: "#67e8f9",
    accentSoft: "rgba(103,232,249,0.16)",
    text: "#ecfeff",
    muted: "#a5f3fc",
    border: "#155e75",
    qrInk: "#020617",
    fontHeading: sans,
    fontBody: sans,
    composition: "iconic",
    premium: true,
    ornament: "neon",
    atmosphere: "rain-city",
    artLabel: "Night rain",
  },
  {
    id: "silent-silver",
    name: "Silent Silver",
    tagline: "Black and white title cards. Original silver-screen grain",
    previewLabel: "Silent Silver",
    category: "cinematic",
    stageBackground: "linear-gradient(180deg, #111111 0%, #525252 48%, #0a0a0a 100%)",
    cardBackground: "linear-gradient(145deg, #262626 0%, #0a0a0a 100%)",
    accent: "#fafafa",
    accentSoft: "rgba(250,250,250,0.12)",
    text: "#fafafa",
    muted: "#a3a3a3",
    border: "#737373",
    qrInk: "#0a0a0a",
    fontHeading: display,
    fontBody: sans,
    composition: "type-first",
    premium: true,
    atmosphere: "silver-screen",
    artLabel: "Silver screen",
  },
  {
    id: "accra-horizon",
    name: "Accra Horizon",
    tagline: "Civic arch geometry against Atlantic dusk. Original Ghana skyline",
    previewLabel: "Accra Horizon",
    category: "landmark",
    stageBackground: "linear-gradient(180deg, #fb923c 0%, #9a3412 42%, #1c1917 100%)",
    cardBackground: "linear-gradient(145deg, #9a3412 0%, #1c1917 100%)",
    accent: "#fde68a",
    accentSoft: "rgba(253,230,138,0.16)",
    text: "#fffbeb",
    muted: "#fdba74",
    border: "#b45309",
    qrInk: "#1c1917",
    fontHeading: display,
    fontBody: sans,
    composition: "iconic",
    atmosphere: "arch-monument",
    artLabel: "Accra",
  },
  {
    id: "sahara-dune",
    name: "Sahara Dune",
    tagline: "Wind-cut dunes and a high desert sun. Original Sahara study",
    previewLabel: "Sahara Dune",
    category: "landmark",
    stageBackground: "linear-gradient(180deg, #fdba74 0%, #f59e0b 40%, #b45309 100%)",
    cardBackground: "linear-gradient(145deg, #f59e0b 0%, #b45309 100%)",
    accent: "#fff7ed",
    accentSoft: "rgba(255,247,237,0.16)",
    text: "#fffbeb",
    muted: "#ffedd5",
    border: "#fdba74",
    qrInk: "#9a3412",
    fontHeading: display,
    fontBody: sans,
    composition: "iconic",
    atmosphere: "dunes",
    artLabel: "Sahara",
  },
  {
    id: "mist-peak",
    name: "Mist Peak",
    tagline: "Ink mountain in morning vapour. Original East Asian landscape, not a print copy",
    previewLabel: "Mist Peak",
    category: "landmark",
    stageBackground: "linear-gradient(180deg, #e0f2fe 0%, #64748b 48%, #1e293b 100%)",
    cardBackground: "linear-gradient(145deg, #334155 0%, #1e293b 100%)",
    accent: "#f8fafc",
    accentSoft: "rgba(248,250,252,0.14)",
    text: "#f8fafc",
    muted: "#cbd5e1",
    border: "#94a3b8",
    qrInk: "#1e293b",
    fontHeading: display,
    fontBody: display,
    composition: "iconic",
    premium: true,
    atmosphere: "mist-peak",
    artLabel: "Peak mist",
  },
  {
    id: "white-cliff",
    name: "White Cliff",
    tagline: "Caldera whitewash and Aegean blue. Original island cliff study",
    previewLabel: "White Cliff",
    category: "landmark",
    stageBackground: "linear-gradient(180deg, #7dd3fc 0%, #e0f2fe 42%, #f8fafc 100%)",
    cardBackground: "linear-gradient(145deg, #f8fafc 0%, #e2e8f0 100%)",
    accent: "#0369a1",
    accentSoft: "rgba(3,105,161,0.12)",
    text: "#0f172a",
    muted: "#0369a1",
    border: "#7dd3fc",
    qrInk: "#0c4a6e",
    fontHeading: sans,
    fontBody: sans,
    composition: "iconic",
    premium: true,
    atmosphere: "cliff-white",
    artLabel: "Cliff",
  },
  {
    id: "nile-gold",
    name: "Nile Gold",
    tagline: "River ribbon and temple silence. Original Nile evening",
    previewLabel: "Nile Gold",
    category: "landmark",
    stageBackground: "linear-gradient(180deg, #fde68a 0%, #b45309 48%, #1c1917 100%)",
    cardBackground: "linear-gradient(145deg, #78350f 0%, #1c1917 100%)",
    accent: "#fde68a",
    accentSoft: "rgba(253,230,138,0.16)",
    text: "#fffbeb",
    muted: "#fbbf24",
    border: "#b45309",
    qrInk: "#1c1917",
    fontHeading: display,
    fontBody: sans,
    composition: "iconic",
    premium: true,
    atmosphere: "river-gold",
    artLabel: "Nile",
  },
  {
    id: "table-cape",
    name: "Table Cape",
    tagline: "Flat summit over Atlantic cloud. Original Cape silhouette",
    previewLabel: "Table Cape",
    category: "landmark",
    stageBackground: "linear-gradient(180deg, #7dd3fc 0%, #0f766e 50%, #042f2e 100%)",
    cardBackground: "linear-gradient(145deg, #115e59 0%, #042f2e 100%)",
    accent: "#99f6e4",
    accentSoft: "rgba(153,246,228,0.16)",
    text: "#ecfdf5",
    muted: "#5eead4",
    border: "#2dd4bf",
    qrInk: "#042f2e",
    fontHeading: display,
    fontBody: sans,
    composition: "iconic",
    premium: true,
    atmosphere: "flat-mountain",
    artLabel: "Cape",
  },
  {
    id: "canal-light",
    name: "Canal Light",
    tagline: "Water-lane reflections and palazzo dusk. Original canal study",
    previewLabel: "Canal Light",
    category: "landmark",
    stageBackground: "linear-gradient(180deg, #fdba74 0%, #9a3412 40%, #1e1b4b 100%)",
    cardBackground: "linear-gradient(145deg, #9a3412 0%, #1e1b4b 100%)",
    accent: "#fde68a",
    accentSoft: "rgba(253,230,138,0.14)",
    text: "#fff7ed",
    muted: "#fdba74",
    border: "#c2410c",
    qrInk: "#1e1b4b",
    fontHeading: display,
    fontBody: sans,
    composition: "iconic",
    premium: true,
    atmosphere: "canal",
    artLabel: "Canal",
  },
  {
    id: "night-skyline",
    name: "Night Skyline",
    tagline: "Stacked towers after dark. Original city grid, not a brand skyline",
    previewLabel: "Night Skyline",
    category: "landmark",
    stageBackground: "linear-gradient(180deg, #1d4ed8 0%, #0f172a 48%, #020617 100%)",
    cardBackground: "linear-gradient(145deg, #0f172a 0%, #020617 100%)",
    accent: "#93c5fd",
    accentSoft: "rgba(147,197,253,0.16)",
    text: "#f8fafc",
    muted: "#bfdbfe",
    border: "#1e3a8a",
    qrInk: "#020617",
    fontHeading: sans,
    fontBody: sans,
    composition: "iconic",
    premium: true,
    atmosphere: "skyline",
    artLabel: "Skyline",
  },
  {
    id: "dawn-peak",
    name: "Dawn Peak",
    tagline: "First light on a high summit. Original Kilimanjaro hour",
    previewLabel: "Dawn Peak",
    category: "landmark",
    stageBackground: "linear-gradient(180deg, #fda4af 0%, #fb923c 40%, #1c1917 100%)",
    cardBackground: "linear-gradient(145deg, #9a3412 0%, #1c1917 100%)",
    accent: "#fecdd3",
    accentSoft: "rgba(254,205,211,0.16)",
    text: "#fff1f2",
    muted: "#fed7aa",
    border: "#fb7185",
    qrInk: "#1c1917",
    fontHeading: display,
    fontBody: sans,
    composition: "iconic",
    premium: true,
    atmosphere: "dawn-peak",
    artLabel: "Dawn",
  },
  {
    id: "lantern-walk",
    name: "Lantern Walk",
    tagline: "Warm street lamps on limestone. Original evening promenade",
    previewLabel: "Lantern Walk",
    category: "landmark",
    stageBackground: "linear-gradient(180deg, #1e1b4b 0%, #44403c 50%, #1c1917 100%)",
    cardBackground: "linear-gradient(145deg, #292524 0%, #1c1917 100%)",
    accent: "#fde68a",
    accentSoft: "rgba(253,230,138,0.16)",
    text: "#fafaf9",
    muted: "#e7e5e4",
    border: "#a8a29e",
    qrInk: "#1c1917",
    fontHeading: display,
    fontBody: sans,
    composition: "iconic",
    premium: true,
    atmosphere: "lantern-street",
    artLabel: "Lanterns",
  },
  {
    id: "glass-spire",
    name: "Glass Spire",
    tagline: "Tapered night tower in desert air. Original spire geometry",
    previewLabel: "Glass Spire",
    category: "landmark",
    stageBackground: "linear-gradient(180deg, #0c4a6e 0%, #0f172a 50%, #020617 100%)",
    cardBackground: "linear-gradient(145deg, #0f172a 0%, #020617 100%)",
    accent: "#7dd3fc",
    accentSoft: "rgba(125,211,252,0.16)",
    text: "#f0f9ff",
    muted: "#bae6fd",
    border: "#0369a1",
    qrInk: "#020617",
    fontHeading: sans,
    fontBody: sans,
    composition: "iconic",
    premium: true,
    atmosphere: "spire",
    artLabel: "Spire",
  },
  {
    id: "canopy-green",
    name: "Canopy Green",
    tagline: "Layered rainforest light. Original Amazon canopy study",
    previewLabel: "Canopy Green",
    category: "landmark",
    stageBackground: "linear-gradient(180deg, #166534 0%, #14532d 48%, #052e16 100%)",
    cardBackground: "linear-gradient(145deg, #166534 0%, #052e16 100%)",
    accent: "#bbf7d0",
    accentSoft: "rgba(187,247,208,0.16)",
    text: "#f0fdf4",
    muted: "#86efac",
    border: "#4ade80",
    qrInk: "#052e16",
    fontHeading: display,
    fontBody: sans,
    composition: "iconic",
    premium: true,
    atmosphere: "canopy",
    artLabel: "Canopy",
  },
  {
    id: "saddle-atelier",
    name: "Saddle Atelier",
    tagline: "Saddle leather, cream stitch, quiet hardware. Original house craft, not a brand",
    previewLabel: "Saddle Atelier",
    category: "atelier",
    stageBackground: "linear-gradient(160deg, #1c1917 0%, #44403c 50%, #1c1917 100%)",
    cardBackground: "linear-gradient(145deg, #78716c 0%, #44403c 100%)",
    accent: "#fef3c7",
    accentSoft: "rgba(254,243,199,0.14)",
    text: "#fffbeb",
    muted: "#e7e5e4",
    border: "#a8a29e",
    qrInk: "#1c1917",
    fontHeading: display,
    fontBody: sans,
    composition: "classic",
    premium: true,
    ornament: "foil",
    atmosphere: "leather",
    artLabel: "Saddle",
  },
  {
    id: "porcelain-house",
    name: "Porcelain House",
    tagline: "Bone china, a single black bloom. Original couture quiet",
    previewLabel: "Porcelain House",
    category: "atelier",
    stageBackground: "linear-gradient(160deg, #fafafa 0%, #e4e4e7 55%, #d4d4d8 100%)",
    cardBackground: "linear-gradient(145deg, #fafafa 0%, #f4f4f5 100%)",
    accent: "#18181b",
    accentSoft: "rgba(24,24,27,0.08)",
    text: "#09090b",
    muted: "#52525b",
    border: "#27272a",
    qrInk: "#09090b",
    fontHeading: display,
    fontBody: sans,
    composition: "type-first",
    premium: true,
    atmosphere: "porcelain",
    artLabel: "Porcelain",
  },
  {
    id: "ink-salon",
    name: "Ink Salon",
    tagline: "Editorial black with a single cream rule. Original fashion house page",
    previewLabel: "Ink Salon",
    category: "atelier",
    stageBackground: "linear-gradient(180deg, #0a0a0a 0%, #171717 100%)",
    cardBackground: "linear-gradient(145deg, #0a0a0a 0%, #171717 100%)",
    accent: "#fafaf9",
    accentSoft: "rgba(250,250,249,0.1)",
    text: "#fafaf9",
    muted: "#a8a29e",
    border: "#292524",
    qrInk: "#0a0a0a",
    fontHeading: display,
    fontBody: sans,
    composition: "type-first",
    premium: true,
    atmosphere: "marble-ink",
    artLabel: "Ink",
  },
  {
    id: "chrome-hardware",
    name: "Chrome Hardware",
    tagline: "Brushed metal, precision radius. Original industrial luxury",
    previewLabel: "Chrome Hardware",
    category: "atelier",
    stageBackground: "linear-gradient(145deg, #e2e8f0 0%, #94a3b8 50%, #475569 100%)",
    cardBackground: "linear-gradient(145deg, #cbd5e1 0%, #64748b 100%)",
    accent: "#f8fafc",
    accentSoft: "rgba(248,250,252,0.16)",
    text: "#0f172a",
    muted: "#1e293b",
    border: "#e2e8f0",
    qrInk: "#334155",
    fontHeading: sans,
    fontBody: sans,
    composition: "classic",
    premium: true,
    atmosphere: "chrome",
    artLabel: "Chrome",
  },
  {
    id: "garden-maison",
    name: "Garden Maison",
    tagline: "Botanical cream and leaf shadow. Original garden house",
    previewLabel: "Garden Maison",
    category: "atelier",
    stageBackground: "linear-gradient(160deg, #ecfccb 0%, #d9f99d 40%, #365314 100%)",
    cardBackground: "linear-gradient(145deg, #f7fee7 0%, #ecfccb 100%)",
    accent: "#3f6212",
    accentSoft: "rgba(63,98,18,0.12)",
    text: "#1a2e05",
    muted: "#4d7c0f",
    border: "#a3e635",
    qrInk: "#3f6212",
    fontHeading: display,
    fontBody: sans,
    composition: "classic",
    premium: true,
    atmosphere: "garden",
    artLabel: "Garden",
  },
  {
    id: "ballroom-gold",
    name: "Ballroom Gold",
    tagline: "Chandelier light on a gold floor. Original period-romance atmosphere, never a licensed film",
    previewLabel: "Ballroom Gold",
    category: "cinematic",
    stageBackground: "radial-gradient(circle at 50% 0%, #fde68a 0%, #78350f 48%, #1c1917 100%)",
    cardBackground: "linear-gradient(160deg, #44403c 0%, #1c1917 100%)",
    accent: "#fde68a",
    accentSoft: "rgba(253,230,138,0.16)",
    text: "#fffbeb",
    muted: "#fde68a",
    border: "#b45309",
    qrInk: "#1c1917",
    fontHeading: display,
    fontBody: sans,
    composition: "portrait-led",
    premium: true,
    atmosphere: "ballroom",
    artLabel: "Ballroom",
  },
  {
    id: "mesa-dusk",
    name: "Mesa Dusk",
    tagline: "Mesa silhouettes at last light. Original western dusk, never a studio still",
    previewLabel: "Mesa Dusk",
    category: "cinematic",
    stageBackground: "linear-gradient(180deg, #fb7185 0%, #c2410c 42%, #1c1917 100%)",
    cardBackground: "linear-gradient(145deg, #9a3412 0%, #1c1917 100%)",
    accent: "#fed7aa",
    accentSoft: "rgba(254,215,170,0.16)",
    text: "#fff7ed",
    muted: "#fdba74",
    border: "#fb923c",
    qrInk: "#1c1917",
    fontHeading: display,
    fontBody: sans,
    composition: "iconic",
    premium: true,
    atmosphere: "mesa",
    artLabel: "Mesa",
  },
  {
    id: "star-opera",
    name: "Star Opera",
    tagline: "Deep space opera light. Original starfield, never a franchise mark",
    previewLabel: "Star Opera",
    category: "cinematic",
    stageBackground: "radial-gradient(ellipse at 70% 20%, #4f46e533 0%, #020617 50%, #000 100%)",
    cardBackground: "linear-gradient(145deg, #020617 0%, #0b1220 100%)",
    accent: "#c4b5fd",
    accentSoft: "rgba(196,181,253,0.16)",
    text: "#eef2ff",
    muted: "#a5b4fc",
    border: "#4338ca",
    qrInk: "#020617",
    fontHeading: sans,
    fontBody: sans,
    composition: "iconic",
    premium: true,
    atmosphere: "starfield",
    artLabel: "Starfield",
  },
  {
    id: "spy-night",
    name: "Spy Night",
    tagline: "Rain on glass and city blur. Original night-thriller frame",
    previewLabel: "Spy Night",
    category: "cinematic",
    stageBackground: "linear-gradient(180deg, #111827 0%, #1e293b 48%, #020617 100%)",
    cardBackground: "linear-gradient(145deg, #0f172a 0%, #020617 100%)",
    accent: "#67e8f9",
    accentSoft: "rgba(103,232,249,0.14)",
    text: "#ecfeff",
    muted: "#94a3b8",
    border: "#334155",
    qrInk: "#020617",
    fontHeading: sans,
    fontBody: sans,
    composition: "type-first",
    premium: true,
    atmosphere: "spy-glass",
    artLabel: "Thriller",
  },
  {
    id: "fog-span",
    name: "Fog Span",
    tagline: "Cables over morning fog. Original river crossing study",
    previewLabel: "Fog Span",
    category: "landmark",
    stageBackground: "linear-gradient(180deg, #fdba74 0%, #94a3b8 45%, #1e293b 100%)",
    cardBackground: "linear-gradient(145deg, #64748b 0%, #1e293b 100%)",
    accent: "#fff7ed",
    accentSoft: "rgba(255,247,237,0.14)",
    text: "#f8fafc",
    muted: "#e2e8f0",
    border: "#cbd5e1",
    qrInk: "#1e293b",
    fontHeading: sans,
    fontBody: sans,
    composition: "iconic",
    premium: true,
    atmosphere: "fog-bridge",
    artLabel: "Span",
  },
  {
    id: "harbor-beacon",
    name: "Harbor Beacon",
    tagline: "A lighthouse beam on dark water. Original harbor night",
    previewLabel: "Harbor Beacon",
    category: "landmark",
    stageBackground: "linear-gradient(180deg, #1e3a8a 0%, #0f172a 50%, #020617 100%)",
    cardBackground: "linear-gradient(145deg, #0f172a 0%, #020617 100%)",
    accent: "#fde68a",
    accentSoft: "rgba(253,230,138,0.16)",
    text: "#fffbeb",
    muted: "#bfdbfe",
    border: "#1d4ed8",
    qrInk: "#020617",
    fontHeading: display,
    fontBody: sans,
    composition: "iconic",
    premium: true,
    atmosphere: "harbor",
    artLabel: "Beacon",
  },
  {
    id: "granite-bay",
    name: "Granite Bay",
    tagline: "Granite cone over a bright bay. Original coastal peak study",
    previewLabel: "Granite Bay",
    category: "landmark",
    stageBackground: "linear-gradient(180deg, #38bdf8 0%, #0369a1 48%, #0c4a6e 100%)",
    cardBackground: "linear-gradient(145deg, #0369a1 0%, #0c4a6e 100%)",
    accent: "#fef3c7",
    accentSoft: "rgba(254,243,199,0.16)",
    text: "#f0f9ff",
    muted: "#bae6fd",
    border: "#7dd3fc",
    qrInk: "#0c4a6e",
    fontHeading: display,
    fontBody: sans,
    composition: "iconic",
    premium: true,
    atmosphere: "granite-peak",
    artLabel: "Granite",
  },
  {
    id: "blossom-court",
    name: "Blossom Court",
    tagline: "Night petals on a quiet court. Original blossom walk",
    previewLabel: "Blossom Court",
    category: "landmark",
    stageBackground: "linear-gradient(180deg, #4c1d95 0%, #9f1239 50%, #1c1917 100%)",
    cardBackground: "linear-gradient(145deg, #4c1d95 0%, #1c1917 100%)",
    accent: "#fecdd3",
    accentSoft: "rgba(254,205,211,0.16)",
    text: "#fff1f2",
    muted: "#e9d5ff",
    border: "#f9a8d4",
    qrInk: "#1c1917",
    fontHeading: display,
    fontBody: sans,
    composition: "iconic",
    premium: true,
    atmosphere: "blossom",
    artLabel: "Blossom",
  },
  {
    id: "dome-dusk",
    name: "Dome Dusk",
    tagline: "A civic dome at copper hour. Original monument study",
    previewLabel: "Dome Dusk",
    category: "landmark",
    stageBackground: "linear-gradient(180deg, #fdba74 0%, #9a3412 42%, #1c1917 100%)",
    cardBackground: "linear-gradient(145deg, #9a3412 0%, #1c1917 100%)",
    accent: "#fde68a",
    accentSoft: "rgba(253,230,138,0.16)",
    text: "#fffbeb",
    muted: "#fed7aa",
    border: "#f59e0b",
    qrInk: "#1c1917",
    fontHeading: display,
    fontBody: sans,
    composition: "iconic",
    premium: true,
    atmosphere: "civic-dome",
    artLabel: "Dome",
  },
  {
    id: "herringbone-cut",
    name: "Herringbone Cut",
    tagline: "Tailoring wool and chalk line. Original house cut, not a brand",
    previewLabel: "Herringbone Cut",
    category: "atelier",
    stageBackground: "linear-gradient(160deg, #1c1917 0%, #44403c 50%, #292524 100%)",
    cardBackground: "linear-gradient(145deg, #44403c 0%, #1c1917 100%)",
    accent: "#e7e5e4",
    accentSoft: "rgba(231,229,228,0.14)",
    text: "#fafaf9",
    muted: "#d6d3d1",
    border: "#a8a29e",
    qrInk: "#1c1917",
    fontHeading: display,
    fontBody: sans,
    composition: "classic",
    premium: true,
    atmosphere: "herringbone",
    artLabel: "Twill",
  },
  {
    id: "lacquer-case",
    name: "Lacquer Case",
    tagline: "Black lacquer with a gold inlay. Original case craft",
    previewLabel: "Lacquer Case",
    category: "atelier",
    stageBackground: "linear-gradient(160deg, #0a0a0a 0%, #171717 55%, #0c0a09 100%)",
    cardBackground: "linear-gradient(145deg, #171717 0%, #0a0a0a 100%)",
    accent: "#e8c872",
    accentSoft: "rgba(232,200,114,0.16)",
    text: "#faf6ef",
    muted: "#d6bc8a",
    border: "#c4a15a",
    qrInk: "#0a0a0a",
    fontHeading: display,
    fontBody: sans,
    composition: "classic",
    premium: true,
    atmosphere: "lacquer",
    artLabel: "Lacquer",
  },
  {
    id: "linen-loom",
    name: "Linen Loom",
    tagline: "Sun-washed linen and loom grain. Original atelier cloth",
    previewLabel: "Linen Loom",
    category: "atelier",
    stageBackground: "linear-gradient(160deg, #faf6f0 0%, #e7e5e4 50%, #d6d3d1 100%)",
    cardBackground: "linear-gradient(145deg, #fafaf9 0%, #f5f5f4 100%)",
    accent: "#78716c",
    accentSoft: "rgba(120,113,108,0.12)",
    text: "#1c1917",
    muted: "#57534e",
    border: "#d6d3d1",
    qrInk: "#44403c",
    fontHeading: display,
    fontBody: sans,
    composition: "classic",
    premium: true,
    atmosphere: "linen",
    artLabel: "Linen",
  },
];

export const DIGITAL_CARD_THEME_BY_ID: Record<DigitalCardThemeId, DigitalCardTheme> =
  Object.fromEntries(DIGITAL_CARD_THEMES.map((t) => [t.id, t])) as Record<
    DigitalCardThemeId,
    DigitalCardTheme
  >;

export const DIGITAL_CARD_THEME_FILTERS: { id: "all" | DigitalCardThemeCategory; label: string }[] = [
  { id: "all", label: "All" },
  { id: "cinematic", label: "Cinema" },
  { id: "landmark", label: "Landmarks" },
  { id: "atelier", label: "Atelier" },
  { id: "iconic", label: "World Art" },
  { id: "executive", label: "Executive" },
  { id: "creator", label: "Creator" },
  { id: "business", label: "Business" },
  { id: "luxury", label: "Luxury" },
  { id: "minimal", label: "Minimal" },
  { id: "personal", label: "Personal" },
  { id: "public-figure", label: "Public Figure" },
];

export function resolveDigitalCardTheme(id: string | null | undefined): DigitalCardTheme {
  const theme =
    id && id in DIGITAL_CARD_THEME_BY_ID
      ? DIGITAL_CARD_THEME_BY_ID[id as DigitalCardThemeId]
      : DIGITAL_CARD_THEME_BY_ID[CELEYOU_ORIGINAL_THEME_ID as DigitalCardThemeId];
  return {
    ...theme,
    ornament: theme.ornament && theme.ornament !== "none" ? theme.ornament : "foil",
  };
}
