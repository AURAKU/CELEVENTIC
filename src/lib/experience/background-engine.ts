/** Background Engine — unique atmospheric layers per template */
export type BackgroundTypeId =
  | "static"
  | "video"
  | "particles"
  | "animated-gradient"
  | "aurora"
  | "clouds"
  | "floating-flowers"
  | "fireflies"
  | "snow"
  | "rain"
  | "stars"
  | "galaxy"
  | "ocean"
  | "parallax"
  | "glass"
  | "blur"
  | "luxury-texture"
  | "marble"
  | "velvet"
  | "fabric"
  | "paper"
  | "canvas"
  | "gold-foil"
  | "kente"
  | "wood"
  | "stone";

export interface BackgroundPack {
  id: BackgroundTypeId;
  label: string;
  description: string;
  preview: string;
  motion: "none" | "subtle" | "medium" | "cinematic";
}

export const BACKGROUND_PACKS: BackgroundPack[] = [
  { id: "static", label: "Static", description: "Solid or gradient still backdrop", preview: "linear-gradient(135deg, #1e293b, #0f172a)", motion: "none" },
  { id: "video", label: "Video", description: "Cinematic loop or hero reel", preview: "linear-gradient(135deg, #0f172a, #334155)", motion: "cinematic" },
  { id: "particles", label: "Particles", description: "Floating light particles", preview: "radial-gradient(circle, #1e1b4b, #0a0a0a)", motion: "medium" },
  { id: "animated-gradient", label: "Animated Gradient", description: "Slow color morph", preview: "linear-gradient(135deg, #581c87, #1e1b4b, #0f766e)", motion: "subtle" },
  { id: "aurora", label: "Aurora", description: "Northern lights shimmer", preview: "linear-gradient(160deg, #064e3b, #1e1b4b, #7c3aed)", motion: "cinematic" },
  { id: "clouds", label: "Clouds", description: "Soft drifting cloud layers", preview: "linear-gradient(180deg, #e2e8f0, #cbd5e1)", motion: "subtle" },
  { id: "floating-flowers", label: "Floating Flowers", description: "Botanical petal drift", preview: "linear-gradient(180deg, #fff1f2, #ecfdf5)", motion: "medium" },
  { id: "fireflies", label: "Fireflies", description: "Warm glowing specks", preview: "linear-gradient(180deg, #022c22, #0a0a0a)", motion: "subtle" },
  { id: "snow", label: "Snow", description: "Gentle snowfall overlay", preview: "linear-gradient(180deg, #f8fafc, #e2e8f0)", motion: "medium" },
  { id: "rain", label: "Rain", description: "Moody rainfall streaks", preview: "linear-gradient(180deg, #1e293b, #0f172a)", motion: "medium" },
  { id: "stars", label: "Stars", description: "Twinkling night sky", preview: "radial-gradient(ellipse at top, #1e1b4b, #020617)", motion: "subtle" },
  { id: "galaxy", label: "Galaxy", description: "Deep space nebula", preview: "radial-gradient(circle, #581c87, #0a0a0a)", motion: "cinematic" },
  { id: "ocean", label: "Ocean", description: "Wave motion and teal depth", preview: "linear-gradient(180deg, #0f766e, #134e4a)", motion: "medium" },
  { id: "parallax", label: "Parallax", description: "Layered depth scroll", preview: "linear-gradient(135deg, #451a03, #14532d)", motion: "cinematic" },
  { id: "glass", label: "Glass", description: "Frosted acrylic shimmer", preview: "linear-gradient(135deg, rgba(255,255,255,0.9), rgba(254,243,199,0.7))", motion: "subtle" },
  { id: "blur", label: "Blur", description: "Soft bokeh backdrop", preview: "linear-gradient(135deg, #fce7f3, #fdf4ff)", motion: "none" },
  { id: "luxury-texture", label: "Luxury Texture", description: "Embossed foil pattern", preview: "linear-gradient(145deg, #1a1a2e, #16213e)", motion: "subtle" },
  { id: "marble", label: "Marble", description: "White marble veins", preview: "linear-gradient(135deg, #f8fafc, #e2e8f0)", motion: "none" },
  { id: "velvet", label: "Velvet", description: "Deep velvet curtain texture", preview: "linear-gradient(165deg, #0f172a, #1e1b4b)", motion: "subtle" },
  { id: "fabric", label: "Fabric", description: "Silk cloth drape", preview: "linear-gradient(135deg, #fff1f2, #fce7f3)", motion: "subtle" },
  { id: "paper", label: "Paper", description: "Cotton paper grain", preview: "linear-gradient(180deg, #fafaf9, #f5f5f4)", motion: "none" },
  { id: "canvas", label: "Canvas", description: "Artist canvas texture", preview: "linear-gradient(180deg, #fef3c7, #fde68a)", motion: "none" },
  { id: "gold-foil", label: "Gold Foil", description: "Metallic gold shimmer", preview: "linear-gradient(145deg, #D4AF37, #8B6914)", motion: "subtle" },
  { id: "kente", label: "Kente", description: "African heritage weave", preview: "linear-gradient(135deg, #92400e, #7f1d1d, #14532d)", motion: "medium" },
  { id: "wood", label: "Wood", description: "Warm timber grain", preview: "linear-gradient(135deg, #78350f, #451a03)", motion: "none" },
  { id: "stone", label: "Stone", description: "Slate and granite texture", preview: "linear-gradient(135deg, #44403c, #1c1917)", motion: "none" },
];

export function getBackgroundPack(id: BackgroundTypeId): BackgroundPack | undefined {
  return BACKGROUND_PACKS.find((p) => p.id === id);
}
