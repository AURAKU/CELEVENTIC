import type {
  DigitalCardAtmosphere,
  DigitalCardComposition,
  DigitalCardOrnament,
  DigitalCardTheme,
} from "@/lib/digital-business-card/themes";

export type CeleCardPaperWeight = "subtle" | "balanced" | "rich";
export type CeleCardPaperTone = "light" | "dark";

export type CeleCardDesign = {
  composition?: DigitalCardComposition;
  atmosphere?: DigitalCardAtmosphere;
  ornament?: DigitalCardOrnament;
  paperUrl?: string;
  paperWeight?: CeleCardPaperWeight;
  paperTone?: CeleCardPaperTone;
};

export const CELECARD_COMPOSITIONS: { id: DigitalCardComposition; label: string; hint: string }[] = [
  { id: "classic", label: "Classic", hint: "Photo, name, and QR on one plate" },
  { id: "portrait-led", label: "Portrait led", hint: "A tall photo panel beside the name" },
  { id: "type-first", label: "Type first", hint: "The name leads. Photo stays quiet" },
  { id: "media-first", label: "Media first", hint: "The picture carries the first look" },
  { id: "grid", label: "Grid", hint: "A structured studio layout" },
  { id: "iconic", label: "Iconic", hint: "Poster lockup for a public figure" },
];

export const CELECARD_ORNAMENTS: { id: DigitalCardOrnament; label: string }[] = [
  { id: "foil", label: "Foil frame" },
  { id: "halftone", label: "Halftone" },
  { id: "wave", label: "Wave" },
  { id: "grid", label: "Grid" },
  { id: "marquee", label: "Marquee" },
  { id: "cel", label: "Cel" },
  { id: "crest", label: "Crest" },
  { id: "kente", label: "Kente" },
  { id: "sunburst", label: "Sunburst" },
  { id: "neon", label: "Neon" },
  { id: "none", label: "Quiet" },
];

export const CELECARD_ATMOSPHERE_GROUPS: {
  id: string;
  label: string;
  items: { id: DigitalCardAtmosphere; label: string }[];
}[] = [
  {
    id: "house",
    label: "House",
    items: [
      { id: "salon", label: "Salon" },
      { id: "leather", label: "Leather" },
      { id: "porcelain", label: "Porcelain" },
      { id: "linen", label: "Linen" },
      { id: "marble-ink", label: "Marble ink" },
      { id: "chrome", label: "Chrome" },
      { id: "garden", label: "Garden" },
      { id: "wave-pulse", label: "Wave pulse" },
      { id: "coral-fan", label: "Coral fan" },
      { id: "none", label: "Quiet" },
    ],
  },
  {
    id: "cinema",
    label: "Cinema",
    items: [
      { id: "film-credits", label: "Film credits" },
      { id: "silver-screen", label: "Silver screen" },
      { id: "spotlight", label: "Spotlight" },
      { id: "starfield", label: "Starfield" },
      { id: "desert-road", label: "Desert road" },
      { id: "rain-city", label: "Rain city" },
      { id: "motion-bars", label: "Motion bars" },
    ],
  },
  {
    id: "place",
    label: "Place",
    items: [
      { id: "skyline", label: "Skyline" },
      { id: "dunes", label: "Dunes" },
      { id: "mist-peak", label: "Mist peak" },
      { id: "cliff-white", label: "White cliff" },
      { id: "river-gold", label: "River gold" },
      { id: "dawn-peak", label: "Dawn peak" },
      { id: "canopy", label: "Canopy" },
      { id: "lantern-street", label: "Lantern street" },
      { id: "harbor", label: "Harbor" },
      { id: "mesa", label: "Mesa" },
      { id: "fog-bridge", label: "Fog bridge" },
      { id: "arch-monument", label: "Monument" },
    ],
  },
  {
    id: "art",
    label: "Art",
    items: [
      { id: "pop-burst", label: "Pop burst" },
      { id: "comic-panel", label: "Comic" },
      { id: "deco-fan", label: "Deco fan" },
      { id: "ukiyo-print", label: "Ukiyo" },
      { id: "cel-speed", label: "Cel speed" },
      { id: "canvas-frame", label: "Canvas" },
      { id: "renaissance-arch", label: "Renaissance" },
      { id: "ballroom", label: "Ballroom" },
      { id: "masthead", label: "Masthead" },
      { id: "grid-panel", label: "Grid panel" },
    ],
  },
  {
    id: "more",
    label: "More",
    items: [
      { id: "aurora-band", label: "Aurora" },
      { id: "alpine", label: "Alpine" },
      { id: "spire", label: "Spire" },
      { id: "canal", label: "Canal" },
      { id: "flat-mountain", label: "Flat mountain" },
      { id: "granite-peak", label: "Granite" },
      { id: "blossom", label: "Blossom" },
      { id: "civic-dome", label: "Civic dome" },
      { id: "herringbone", label: "Herringbone" },
      { id: "lacquer", label: "Lacquer" },
      { id: "spy-glass", label: "Spy glass" },
      { id: "street-asphalt", label: "Street" },
    ],
  },
];

export const CELECARD_PAPER_WEIGHTS: { id: CeleCardPaperWeight; label: string; hint: string }[] = [
  { id: "subtle", label: "Subtle", hint: "A whisper of the photo" },
  { id: "balanced", label: "Balanced", hint: "Present, still readable" },
  { id: "rich", label: "Rich", hint: "The paper leads the room" },
];

export const CELECARD_HOUSE_PAPERS: {
  id: string;
  label: string;
  url: string;
  tone: CeleCardPaperTone;
}[] = [
  { id: "pop", label: "Pop grain", url: "/smartcard/textures/pop.jpg", tone: "light" },
  { id: "deco", label: "Deco gold", url: "/smartcard/textures/deco.jpg", tone: "dark" },
  { id: "ukiyo", label: "Ukiyo wave", url: "/smartcard/textures/ukiyo.jpg", tone: "dark" },
  { id: "cyber", label: "Night rain", url: "/smartcard/textures/cyber.jpg", tone: "dark" },
];

export function atmosphereGroupId(atmosphere: DigitalCardAtmosphere | undefined) {
  if (!atmosphere) return CELECARD_ATMOSPHERE_GROUPS[0]?.id ?? "house";
  return (
    CELECARD_ATMOSPHERE_GROUPS.find((group) => group.items.some((item) => item.id === atmosphere))?.id ??
    CELECARD_ATMOSPHERE_GROUPS[0]?.id ??
    "house"
  );
}

const COMPOSITION_IDS = new Set(CELECARD_COMPOSITIONS.map((item) => item.id));
const ORNAMENT_IDS = new Set(CELECARD_ORNAMENTS.map((item) => item.id));
const ATMOSPHERE_IDS = new Set(
  CELECARD_ATMOSPHERE_GROUPS.flatMap((group) => group.items.map((item) => item.id))
);
const PAPER_WEIGHTS = new Set(CELECARD_PAPER_WEIGHTS.map((item) => item.id));

export function compactCeleCardDesign(raw: unknown): CeleCardDesign | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const record = raw as Record<string, unknown>;
  const out: CeleCardDesign = {};
  const composition = String(record.composition ?? "").trim();
  if (COMPOSITION_IDS.has(composition as DigitalCardComposition)) {
    out.composition = composition as DigitalCardComposition;
  }
  const atmosphere = String(record.atmosphere ?? "").trim();
  if (ATMOSPHERE_IDS.has(atmosphere as DigitalCardAtmosphere)) {
    out.atmosphere = atmosphere as DigitalCardAtmosphere;
  }
  const ornament = String(record.ornament ?? "").trim();
  if (ORNAMENT_IDS.has(ornament as DigitalCardOrnament)) {
    out.ornament = ornament as DigitalCardOrnament;
  }
  const paperUrl = persistPaperUrl(record.paperUrl);
  if (paperUrl) out.paperUrl = paperUrl;
  const paperWeight = String(record.paperWeight ?? "").trim();
  if (PAPER_WEIGHTS.has(paperWeight as CeleCardPaperWeight)) {
    out.paperWeight = paperWeight as CeleCardPaperWeight;
  }
  const paperTone = String(record.paperTone ?? "").trim();
  if (paperTone === "light" || paperTone === "dark") out.paperTone = paperTone;
  return Object.keys(out).length ? out : undefined;
}

export function applyCeleCardDesign(
  theme: DigitalCardTheme,
  design?: CeleCardDesign | null
): DigitalCardTheme {
  if (!design) return theme;
  return {
    ...theme,
    composition: design.composition ?? theme.composition,
    atmosphere: design.atmosphere ?? theme.atmosphere,
    ornament: design.ornament ?? theme.ornament,
    textureUrl: design.paperUrl || theme.textureUrl,
  };
}

function textIsDark(color: string) {
  const hex = color.replace("#", "");
  if (hex.length < 6) return true;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 < 148;
}

export function celeCardPaperStyle(theme: DigitalCardTheme, design?: CeleCardDesign | null) {
  const src = design?.paperUrl || theme.textureUrl;
  if (!src) return null;
  const lightCard = textIsDark(theme.text);
  const weight = design?.paperWeight ?? "balanced";
  const tone = design?.paperTone;
  const paperIsDark = tone === "dark" || (!tone && !lightCard);
  const opacity =
    weight === "subtle" ? 0.16 : weight === "rich" ? 0.38 : 0.24;
  let mixBlendMode: "multiply" | "soft-light" | "luminosity" | "overlay" = "luminosity";
  if (lightCard && !paperIsDark) mixBlendMode = "multiply";
  else if (lightCard && paperIsDark) mixBlendMode = "overlay";
  else if (!lightCard && paperIsDark) mixBlendMode = "soft-light";
  else mixBlendMode = "overlay";
  const veilOpacity = weight === "rich" ? 0.42 : weight === "subtle" ? 0.22 : 0.32;
  return {
    src,
    opacity,
    mixBlendMode,
    veil: lightCard
      ? `linear-gradient(180deg, rgba(255,252,247,${veilOpacity}) 0%, rgba(255,252,247,${veilOpacity * 0.45}) 100%)`
      : `linear-gradient(180deg, rgba(8,10,16,${veilOpacity}) 0%, rgba(8,10,16,${veilOpacity * 0.4}) 100%)`,
  };
}

export function paperToneFromBrightness(brightness: number): CeleCardPaperTone {
  return brightness < 0.46 ? "dark" : "light";
}

function persistPaperUrl(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const url = raw.trim();
  if (!url || url.length > 2000) return undefined;
  if (url.startsWith("blob:") || url.startsWith("data:")) return undefined;
  if (url.startsWith("/") && !url.startsWith("//")) {
    if (url.includes("..") || url.includes("\\") || url.includes("%")) return undefined;
    if (url.startsWith("/uploads/") || url.startsWith("/digital-cards/")) return url;
    if (/^\/smartcard\/textures\/[a-z0-9._-]+\.(jpe?g|png|webp)$/i.test(url)) return url;
    return undefined;
  }
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return undefined;
    return parsed.toString();
  } catch {
    return undefined;
  }
}
