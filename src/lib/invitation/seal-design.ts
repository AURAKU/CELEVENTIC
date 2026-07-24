/**
 * Wax-seal visual design system — additive layer on top of `sealInitials`.
 * Lets hosts pick a designed seal (color/material) plus font, size, and text
 * color for the monogram/word shown on the envelope wax seal. Consumed by
 * `EmbroideredEnvelopeFace` (photoreal Traditional Marriage seal) and the
 * CSS circular seal in `EnvelopeCollectionReveal` for every other envelope.
 *
 * All fields are optional and additive — invites saved before this feature
 * shipped resolve to `classic-peach-pearl` / auto font / medium size, which
 * reproduces the original look pixel-for-pixel.
 */

export type SealDesignId =
  | "classic-peach-pearl"
  | "burgundy-wax"
  | "gold-foil-rim"
  | "cream-linen"
  | "forest-green"
  | "charcoal";

/** "auto" keeps the smart default (Cinzel for monograms, Great Vibes for words). */
export type SealFontChoice =
  | "auto"
  | "great-vibes"
  | "cinzel"
  | "playfair"
  | "cormorant"
  | "poppins";

export type SealSizeId = "sm" | "md" | "lg";

export interface SealGradientStop {
  offset: string;
  color: string;
}

export interface SealDesignPreset {
  id: SealDesignId;
  label: string;
  description: string;
  /** CSS background for the small swatch chip in the Studio picker. */
  swatch: string;
  /** True when the wax face reads dark — flips ink highlight/stroke to light tones. */
  dark?: boolean;
  deep: SealGradientStop[];
  face: SealGradientStop[];
  rim: SealGradientStop[];
  well: SealGradientStop[];
  bead: SealGradientStop[];
  /** Default ink color for 1–3 letter monograms on this seal. */
  monogramColor: string;
  /** Default ink color for short words/phrases on this seal. */
  wordColor: string;
}

/** Six designed seals — real wax/foil materials, never a flat generic hue. */
export const SEAL_DESIGN_PRESETS: SealDesignPreset[] = [
  {
    id: "classic-peach-pearl",
    label: "Classic Peach Pearl",
    description: "The original TM embroidered envelope seal — pearlescent peach with a beaded rim.",
    swatch: "linear-gradient(135deg, #fbe4d6 0%, #e8b49a 55%, #c07860 100%)",
    deep: [
      { offset: "0%", color: "#e8b49a" },
      { offset: "55%", color: "#d49278" },
      { offset: "100%", color: "#c07860" },
    ],
    face: [
      { offset: "0%", color: "#fff6f0" },
      { offset: "16%", color: "#fbe4d6" },
      { offset: "38%", color: "#f0cbb8" },
      { offset: "62%", color: "#e8b49a" },
      { offset: "88%", color: "#d9a088" },
      { offset: "100%", color: "#c98a72" },
    ],
    rim: [
      { offset: "0%", color: "#fff0e6" },
      { offset: "32%", color: "#f0cbb8" },
      { offset: "68%", color: "#d9a088" },
      { offset: "100%", color: "#c08a70" },
    ],
    well: [
      { offset: "0%", color: "#f2c4ae" },
      { offset: "45%", color: "#e0a888" },
      { offset: "100%", color: "#c88870" },
    ],
    bead: [
      { offset: "0%", color: "#ffffff" },
      { offset: "40%", color: "#f8eee6" },
      { offset: "100%", color: "#e0c8b8" },
    ],
    monogramColor: "#E8C96A",
    wordColor: "#D4A63A",
  },
  {
    id: "burgundy-wax",
    label: "Deep Burgundy Wax",
    description: "Poured-wine sealing wax with a gold bead ring — timeless invitation stamp.",
    swatch: "linear-gradient(135deg, #c96a7a 0%, #7c1f30 55%, #4a1220 100%)",
    deep: [
      { offset: "0%", color: "#8a2436" },
      { offset: "55%", color: "#6c1c2b" },
      { offset: "100%", color: "#4a1220" },
    ],
    face: [
      { offset: "0%", color: "#f7dde0" },
      { offset: "16%", color: "#e9b4bd" },
      { offset: "38%", color: "#c96a7a" },
      { offset: "62%", color: "#a13246" },
      { offset: "88%", color: "#7c1f30" },
      { offset: "100%", color: "#5c1522" },
    ],
    rim: [
      { offset: "0%", color: "#f2c9c9" },
      { offset: "32%", color: "#b34a56" },
      { offset: "68%", color: "#7c2030" },
      { offset: "100%", color: "#4a1220" },
    ],
    well: [
      { offset: "0%", color: "#9c3244" },
      { offset: "45%", color: "#7a2030" },
      { offset: "100%", color: "#551423" },
    ],
    bead: [
      { offset: "0%", color: "#fff3d6" },
      { offset: "40%", color: "#eccb85" },
      { offset: "100%", color: "#b9903f" },
    ],
    monogramColor: "#F3D98B",
    wordColor: "#E8C570",
  },
  {
    id: "gold-foil-rim",
    label: "Gold Foil Rim",
    description: "Bright antique-gold foil with espresso ink — luxe metallic finish.",
    swatch: "linear-gradient(135deg, #f7e7ad 0%, #dcb84f 55%, #8a6a14 100%)",
    deep: [
      { offset: "0%", color: "#e8c877" },
      { offset: "55%", color: "#c9a227" },
      { offset: "100%", color: "#8a6a14" },
    ],
    face: [
      { offset: "0%", color: "#fff8e0" },
      { offset: "16%", color: "#f7e7ad" },
      { offset: "38%", color: "#eed37f" },
      { offset: "62%", color: "#dcb84f" },
      { offset: "88%", color: "#c39c34" },
      { offset: "100%", color: "#a17f22" },
    ],
    rim: [
      { offset: "0%", color: "#fff6d8" },
      { offset: "32%", color: "#f2d98a" },
      { offset: "68%", color: "#c9a227" },
      { offset: "100%", color: "#8a6a14" },
    ],
    well: [
      { offset: "0%", color: "#e2c066" },
      { offset: "45%", color: "#c9a227" },
      { offset: "100%", color: "#8f7419" },
    ],
    bead: [
      { offset: "0%", color: "#fffdf2" },
      { offset: "40%", color: "#f6e7ad" },
      { offset: "100%", color: "#c9a227" },
    ],
    monogramColor: "#3B2A14",
    wordColor: "#4A3419",
  },
  {
    id: "cream-linen",
    label: "Cream Linen",
    description: "Tone-on-tone ivory wax that reads as an extension of the embroidered linen.",
    swatch: "linear-gradient(135deg, #fbf5e8 0%, #ecdfc2 55%, #c3af8a 100%)",
    deep: [
      { offset: "0%", color: "#e7dcc7" },
      { offset: "55%", color: "#d8c8a9" },
      { offset: "100%", color: "#c3af8a" },
    ],
    face: [
      { offset: "0%", color: "#fffdf7" },
      { offset: "16%", color: "#fbf5e8" },
      { offset: "38%", color: "#f5ecd8" },
      { offset: "62%", color: "#ecdfc2" },
      { offset: "88%", color: "#e0cfab" },
      { offset: "100%", color: "#d0bb90" },
    ],
    rim: [
      { offset: "0%", color: "#fffef9" },
      { offset: "32%", color: "#f6ecd6" },
      { offset: "68%", color: "#e0cfab" },
      { offset: "100%", color: "#c3af8a" },
    ],
    well: [
      { offset: "0%", color: "#f0e4c9" },
      { offset: "45%", color: "#e0cfab" },
      { offset: "100%", color: "#c9b689" },
    ],
    bead: [
      { offset: "0%", color: "#ffffff" },
      { offset: "40%", color: "#f8f2e4" },
      { offset: "100%", color: "#e3d3b3" },
    ],
    monogramColor: "#7A5C3A",
    wordColor: "#8A6B45",
  },
  {
    id: "forest-green",
    label: "Forest Green",
    description: "Deep emerald wax with a gold bead ring — rich botanical contrast.",
    swatch: "linear-gradient(135deg, #6cb98e 0%, #256b4a 55%, #123324 100%)",
    deep: [
      { offset: "0%", color: "#2f6b4c" },
      { offset: "55%", color: "#1f5c42" },
      { offset: "100%", color: "#123324" },
    ],
    face: [
      { offset: "0%", color: "#dff2e6" },
      { offset: "16%", color: "#a8d9be" },
      { offset: "38%", color: "#6cb98e" },
      { offset: "62%", color: "#3f8f68" },
      { offset: "88%", color: "#256b4a" },
      { offset: "100%", color: "#154a33" },
    ],
    rim: [
      { offset: "0%", color: "#c9ecd6" },
      { offset: "32%", color: "#5ea87e" },
      { offset: "68%", color: "#256b4a" },
      { offset: "100%", color: "#123324" },
    ],
    well: [
      { offset: "0%", color: "#3f8f68" },
      { offset: "45%", color: "#256b4a" },
      { offset: "100%", color: "#123324" },
    ],
    bead: [
      { offset: "0%", color: "#fff3d6" },
      { offset: "40%", color: "#e8c570" },
      { offset: "100%", color: "#b9903f" },
    ],
    monogramColor: "#F0D98B",
    wordColor: "#E3C670",
  },
  {
    id: "charcoal",
    label: "Charcoal",
    description: "Modern graphite wax with pale gold ink — editorial, low-glare finish.",
    swatch: "linear-gradient(135deg, #8f8f8f 0%, #3a3a3a 55%, #181818 100%)",
    dark: true,
    deep: [
      { offset: "0%", color: "#4a4a4a" },
      { offset: "55%", color: "#333333" },
      { offset: "100%", color: "#181818" },
    ],
    face: [
      { offset: "0%", color: "#e7e7e7" },
      { offset: "16%", color: "#bdbdbd" },
      { offset: "38%", color: "#8f8f8f" },
      { offset: "62%", color: "#5f5f5f" },
      { offset: "88%", color: "#3a3a3a" },
      { offset: "100%", color: "#212121" },
    ],
    rim: [
      { offset: "0%", color: "#dcdcdc" },
      { offset: "32%", color: "#7a7a7a" },
      { offset: "68%", color: "#3a3a3a" },
      { offset: "100%", color: "#181818" },
    ],
    well: [
      { offset: "0%", color: "#6b6b6b" },
      { offset: "45%", color: "#3f3f3f" },
      { offset: "100%", color: "#1c1c1c" },
    ],
    bead: [
      { offset: "0%", color: "#f5f0e3" },
      { offset: "40%", color: "#d8c793" },
      { offset: "100%", color: "#a68a4a" },
    ],
    monogramColor: "#E7D9A8",
    wordColor: "#D9C685",
  },
];

export const DEFAULT_SEAL_DESIGN: SealDesignId = "classic-peach-pearl";

export function getSealDesignPreset(id?: string | null): SealDesignPreset {
  return SEAL_DESIGN_PRESETS.find((p) => p.id === id) ?? SEAL_DESIGN_PRESETS[0];
}

/** Curated seal fonts — pulled from the brand's existing script / serif / sans stack. */
export const SEAL_FONT_OPTIONS: {
  id: SealFontChoice;
  label: string;
  group: "Auto" | "Script" | "Serif" | "Sans";
}[] = [
  { id: "auto", label: "Auto (smart default)", group: "Auto" },
  { id: "great-vibes", label: "Great Vibes", group: "Script" },
  { id: "cinzel", label: "Cinzel", group: "Serif" },
  { id: "playfair", label: "Playfair Display", group: "Serif" },
  { id: "cormorant", label: "Cormorant Garamond", group: "Serif" },
  { id: "poppins", label: "Poppins", group: "Sans" },
];

export const SEAL_FONT_WEIGHTS: Record<Exclude<SealFontChoice, "auto">, number> = {
  "great-vibes": 400,
  cinzel: 600,
  playfair: 600,
  cormorant: 500,
  poppins: 600,
};

export const SEAL_FONT_STACKS: Record<Exclude<SealFontChoice, "auto">, string> = {
  "great-vibes": "var(--font-great-vibes), 'Great Vibes', cursive",
  cinzel: "var(--font-cinzel), Cinzel, 'Times New Roman', serif",
  playfair: "var(--font-playfair), 'Playfair Display', serif",
  cormorant: "var(--font-cormorant), 'Cormorant Garamond', serif",
  poppins: "var(--font-sans, 'Poppins'), ui-sans-serif, system-ui, sans-serif",
};

export const SEAL_SIZE_IDS: SealSizeId[] = ["sm", "md", "lg"];
export const SEAL_SIZE_LABELS: Record<SealSizeId, string> = {
  sm: "Small",
  md: "Medium",
  lg: "Large",
};
/** Uniform scale multiplier applied to the seal text — keeps every seal's
 * carefully-tuned clamp() sizing intact while giving a visible S/M/L step. */
export const SEAL_SIZE_SCALE: Record<SealSizeId, number> = {
  sm: 0.86,
  md: 1,
  lg: 1.16,
};

/** Curated ink colors that read cleanly against every seal preset above. */
export const SEAL_TEXT_COLOR_PRESETS: { value: string; label: string }[] = [
  { value: "", label: "Auto" },
  { value: "#E8C96A", label: "Antique gold" },
  { value: "#F3D98B", label: "Champagne gold" },
  { value: "#FFFFFF", label: "White" },
  { value: "#FFF8EF", label: "Ivory" },
  { value: "#3B2A14", label: "Espresso" },
  { value: "#154A33", label: "Deep green" },
];

/**
 * Field names mirror `VisionBoardContent` (`sealDesign` / `sealFontFamily` / `sealSize` /
 * `sealTextColor`) so the vision-board object can be passed straight through the whole
 * reveal chain without remapping.
 */
export interface SealStyleConfig {
  sealDesign?: SealDesignId | string;
  sealFontFamily?: SealFontChoice | string;
  sealSize?: SealSizeId | string;
  /** Hex override; empty/undefined keeps the preset's monogram/word default. */
  sealTextColor?: string;
}

export interface ResolvedSealStyle {
  design: SealDesignId;
  fontFamily: SealFontChoice;
  size: SealSizeId;
  textColor: string;
}

/** Normalize a loosely-typed seal style (from saved JSON) into safe enum values. */
export function resolveSealStyle(raw?: SealStyleConfig | null): ResolvedSealStyle {
  const design = SEAL_DESIGN_PRESETS.some((p) => p.id === raw?.sealDesign)
    ? (raw!.sealDesign as SealDesignId)
    : DEFAULT_SEAL_DESIGN;
  const fontFamily = SEAL_FONT_OPTIONS.some((f) => f.id === raw?.sealFontFamily)
    ? (raw!.sealFontFamily as SealFontChoice)
    : "auto";
  const size = SEAL_SIZE_IDS.includes(raw?.sealSize as SealSizeId)
    ? (raw!.sealSize as SealSizeId)
    : "md";
  const textColor = raw?.sealTextColor?.trim() || "";
  return { design, fontFamily, size, textColor };
}

/** Convert a resolved seal style back into the persisted `SealStyleConfig` shape. */
export function sealStyleToConfig(resolved: ResolvedSealStyle): Required<SealStyleConfig> {
  return {
    sealDesign: resolved.design,
    sealFontFamily: resolved.fontFamily,
    sealSize: resolved.size,
    sealTextColor: resolved.textColor,
  };
}

/** Safe fallback used by every render-time consumer when no seal style was resolved yet. */
export const DEFAULT_RESOLVED_SEAL_STYLE: ResolvedSealStyle = {
  design: DEFAULT_SEAL_DESIGN,
  fontFamily: "auto",
  size: "md",
  textColor: "",
};

/** Hex → rgba, tolerant of shorthand/invalid input (falls back to warm gold). */
export function sealHexToRgba(hex: string, alpha: number): string {
  const clean = hex.trim().replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return `rgba(212,166,58,${alpha})`;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Engraved-ink shadow/stroke treatment for seal lettering — adapts to light/dark wax. */
export function sealInkStyle(
  color: string,
  dark: boolean,
  bold: boolean
): { textShadow: string; webkitTextStroke: string } {
  const highlight = dark ? "rgba(255,255,255,0.5)" : "rgba(255,248,230,0.9)";
  const shadow = dark ? "rgba(0,0,0,0.6)" : "rgba(70,30,12,0.5)";
  const glow = sealHexToRgba(color, dark ? 0.5 : 0.42);
  const strokeAlpha = bold ? 0.4 : 0.32;
  const strokeColor = dark
    ? `rgba(255,255,255,${(strokeAlpha * 0.7).toFixed(2)})`
    : `rgba(120,70,20,${strokeAlpha})`;
  return {
    textShadow: `0 1px 0 ${highlight}, ${bold ? "0 1.5px 3px" : "0 1px 3px"} ${shadow}, 0 0 12px ${glow}`,
    webkitTextStroke: `${bold ? "0.4px" : "0.3px"} ${strokeColor}`,
  };
}
