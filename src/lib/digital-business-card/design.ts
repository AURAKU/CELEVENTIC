import type {
  CeleCardMotionMood,
  DigitalCardAtmosphere,
  DigitalCardComposition,
  DigitalCardOrnament,
  DigitalCardTheme,
} from "@/lib/digital-business-card/themes";
import { stripIdentityFromDesign } from "@/lib/digital-business-card/brand-lock";

export type CeleCardPaperWeight = "subtle" | "balanced" | "rich";
export type CeleCardPaperTone = "light" | "dark";
export type CeleCardNameScale = "quiet" | "balanced" | "statement";
export type CeleCardFaceLead = "photo" | "name" | "code";
export type CeleCardLettering = "letterhead" | "credit" | "stamp" | "neon" | "masthead" | "carved" | "script" | "mono";
export type CeleCardInk = "light" | "dark";
export type CeleCardAccent = "teal" | "gold" | "ivory" | "rose" | "sky" | "ink" | "copper" | "emerald" | "wine" | "sand";
export type CeleCardQrFinish = "foil" | "quiet" | "inset" | "stamp";
export type CeleCardGrain = "paper" | "linen" | "silk" | "speckle" | "canvas" | "none";
export type CeleCardMotion = CeleCardMotionMood;

export type CeleCardDesign = {
  composition?: DigitalCardComposition;
  atmosphere?: DigitalCardAtmosphere;
  ornament?: DigitalCardOrnament;
  paperUrl?: string;
  paperWeight?: CeleCardPaperWeight;
  paperTone?: CeleCardPaperTone;
  /** Quiet, balanced, or statement name on the plate. */
  nameScale?: CeleCardNameScale;
  /** What leads the face row. Portrait templates keep the photo panel. */
  faceLead?: CeleCardFaceLead;
  /** Lettering voice used by the house templates. */
  lettering?: CeleCardLettering;
  /** Dark type on a lighter plate, or light type on a deeper plate. */
  ink?: CeleCardInk;
  /** House accent inks already used across templates. */
  accent?: CeleCardAccent;
  /** QR tile: foil edge or a quiet white well. */
  qrFinish?: CeleCardQrFinish;
  /** Paper grain over the plate, including a custom background. */
  grain?: CeleCardGrain;
  /** Guest-page motion family. */
  motion?: CeleCardMotion;
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
  { id: "double", label: "Double foil" },
  { id: "filigree", label: "Filigree" },
  { id: "bead", label: "Pearl" },
  { id: "inset", label: "Inset" },
  { id: "ribbon", label: "Ribbon" },
  { id: "crest", label: "Crest" },
  { id: "halftone", label: "Halftone" },
  { id: "wave", label: "Wave" },
  { id: "grid", label: "Grid" },
  { id: "marquee", label: "Marquee" },
  { id: "cel", label: "Cel" },
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

export const CELECARD_NAME_SCALES: { id: CeleCardNameScale; label: string; hint: string }[] = [
  { id: "quiet", label: "Quiet", hint: "A smaller name, more room around it" },
  { id: "balanced", label: "Balanced", hint: "The size this look already uses" },
  { id: "statement", label: "Statement", hint: "The name takes the plate" },
];

export const CELECARD_FACE_LEADS: { id: CeleCardFaceLead; label: string; hint: string }[] = [
  { id: "photo", label: "Photo", hint: "Portrait sits first in the row" },
  { id: "name", label: "Name", hint: "The name leads, photo stays quiet" },
  { id: "code", label: "Code", hint: "QR sits beside the name" },
];

export const CELECARD_LETTERING: { id: CeleCardLettering; label: string; hint: string }[] = [
  { id: "letterhead", label: "Letterhead", hint: "Serif name, foil rule, stacked given name" },
  { id: "credit", label: "Credits", hint: "Cinema tracking, a title-card bar" },
  { id: "stamp", label: "Stamp", hint: "Clean sans, boardroom quiet" },
  { id: "masthead", label: "Masthead", hint: "Editorial bold, magazine type" },
  { id: "carved", label: "Carved", hint: "Inscribed serif for landmarks and earth" },
  { id: "script", label: "Script", hint: "Italic editorial for houses and studios" },
  { id: "mono", label: "Mono", hint: "Technical type for founders and labs" },
  { id: "neon", label: "Neon", hint: "Wide tracking, night type" },
];

export const CELECARD_INKS: { id: CeleCardInk; label: string; hint: string }[] = [
  { id: "light", label: "Dark on light", hint: "Ink on a brighter plate" },
  { id: "dark", label: "Light on dark", hint: "Ivory type on a deeper plate" },
];

export const CELECARD_ACCENTS: { id: CeleCardAccent; label: string; swatch: string }[] = [
  { id: "teal", label: "CeleYou teal", swatch: "#0B8A83" },
  { id: "gold", label: "Foil gold", swatch: "#d4a63a" },
  { id: "copper", label: "Copper", swatch: "#b45309" },
  { id: "sand", label: "Sand", swatch: "#c4a574" },
  { id: "ivory", label: "Ivory", swatch: "#e8d5b5" },
  { id: "emerald", label: "Emerald", swatch: "#047857" },
  { id: "wine", label: "Wine", swatch: "#9f1239" },
  { id: "rose", label: "Rose", swatch: "#e11d48" },
  { id: "sky", label: "Sky", swatch: "#38bdf8" },
  { id: "ink", label: "Ink", swatch: "#0f172a" },
];

export const CELECARD_QR_FINISHES: { id: CeleCardQrFinish; label: string; hint: string }[] = [
  { id: "foil", label: "Foil edge", hint: "Accent ring around the code" },
  { id: "quiet", label: "Quiet well", hint: "A simple white tile" },
  { id: "inset", label: "Inset well", hint: "A recessed square on the plate" },
  { id: "stamp", label: "Stamp", hint: "A round well around the code" },
];

export const CELECARD_GRAINS: { id: CeleCardGrain; label: string; hint: string }[] = [
  { id: "paper", label: "Paper", hint: "Fine laid grain over the plate" },
  { id: "linen", label: "Linen", hint: "A stronger cloth tooth" },
  { id: "silk", label: "Silk", hint: "A fine diagonal sheen" },
  { id: "speckle", label: "Speckle", hint: "A light film grain" },
  { id: "canvas", label: "Canvas", hint: "A painted cloth weave" },
  { id: "none", label: "Smooth", hint: "No extra grain" },
];

export const CELECARD_MOTIONS: { id: CeleCardMotion; label: string; hint: string }[] = [
  { id: "atelier", label: "Atelier", hint: "Slow, house-quiet motion" },
  { id: "cinema", label: "Cinema", hint: "Title-card motion" },
  { id: "spotlight", label: "Spotlight", hint: "A brighter title-card sheen" },
  { id: "pulse", label: "Pulse", hint: "Live, creator energy" },
  { id: "earth", label: "Earth", hint: "Warm landmark drift" },
  { id: "linen", label: "Linen", hint: "Soft, even motion" },
  { id: "still", label: "Still", hint: "No guest-page motion" },
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
  { id: "bauhaus", label: "Bauhaus", url: "/smartcard/textures/bauhaus.jpg", tone: "light" },
  { id: "memphis", label: "Memphis", url: "/smartcard/textures/memphis.jpg", tone: "light" },
  { id: "batik", label: "Batik", url: "/smartcard/textures/batik.jpg", tone: "dark" },
  { id: "paisley", label: "Paisley", url: "/smartcard/textures/paisley.jpg", tone: "dark" },
  { id: "chevron", label: "Chevron", url: "/smartcard/textures/chevron.jpg", tone: "dark" },
  { id: "stencil", label: "Stencil", url: "/smartcard/textures/stencil.jpg", tone: "light" },
  { id: "ikat", label: "Ikat", url: "/smartcard/textures/ikat.jpg", tone: "light" },
  { id: "opart", label: "Op art", url: "/smartcard/textures/opart.jpg", tone: "light" },
  { id: "linen", label: "Linen", url: "/smartcard/textures/linen.jpg", tone: "light" },
  { id: "marble", label: "Marble", url: "/smartcard/textures/marble.jpg", tone: "light" },
  { id: "kente", label: "Kente", url: "/smartcard/textures/kente.jpg", tone: "dark" },
  { id: "terrazzo", label: "Terrazzo", url: "/smartcard/textures/terrazzo.jpg", tone: "light" },
  { id: "damask", label: "Damask", url: "/smartcard/textures/damask.jpg", tone: "dark" },
  { id: "indigo", label: "Indigo", url: "/smartcard/textures/indigo.jpg", tone: "dark" },
  { id: "sand", label: "Sand", url: "/smartcard/textures/sand.jpg", tone: "light" },
  { id: "moss", label: "Moss", url: "/smartcard/textures/moss.jpg", tone: "dark" },
  { id: "coral", label: "Coral", url: "/smartcard/textures/coral.jpg", tone: "light" },
  { id: "parchment", label: "Parchment", url: "/smartcard/textures/parchment.jpg", tone: "light" },
  { id: "lacquer", label: "Lacquer", url: "/smartcard/textures/lacquer.jpg", tone: "dark" },
  { id: "mosaic", label: "Mosaic", url: "/smartcard/textures/mosaic.jpg", tone: "light" },
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
const NAME_SCALES = new Set(CELECARD_NAME_SCALES.map((item) => item.id));
const FACE_LEADS = new Set(CELECARD_FACE_LEADS.map((item) => item.id));
const LETTERING_IDS = new Set(CELECARD_LETTERING.map((item) => item.id));
const INK_IDS = new Set(CELECARD_INKS.map((item) => item.id));
const ACCENT_IDS = new Set(CELECARD_ACCENTS.map((item) => item.id));
const QR_FINISH_IDS = new Set(CELECARD_QR_FINISHES.map((item) => item.id));
const GRAIN_IDS = new Set(CELECARD_GRAINS.map((item) => item.id));
const MOTION_IDS = new Set(CELECARD_MOTIONS.map((item) => item.id));

function pickToken<T extends string>(raw: unknown, allowed: Set<T>): T | undefined {
  const value = String(raw ?? "").trim() as T;
  return allowed.has(value) ? value : undefined;
}

export function compactCeleCardDesign(raw: unknown): CeleCardDesign | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const record = raw as Record<string, unknown>;
  const out: CeleCardDesign = {};
  const composition = pickToken(record.composition, COMPOSITION_IDS);
  if (composition) out.composition = composition;
  const atmosphere = pickToken(record.atmosphere, ATMOSPHERE_IDS);
  if (atmosphere) out.atmosphere = atmosphere;
  const ornament = pickToken(record.ornament, ORNAMENT_IDS);
  if (ornament) out.ornament = ornament;
  const paperUrl = persistPaperUrl(record.paperUrl);
  if (paperUrl) out.paperUrl = paperUrl;
  const paperWeight = pickToken(record.paperWeight, PAPER_WEIGHTS);
  if (paperWeight) out.paperWeight = paperWeight;
  const paperTone = String(record.paperTone ?? "").trim();
  if (paperTone === "light" || paperTone === "dark") out.paperTone = paperTone;
  const nameScale = pickToken(record.nameScale, NAME_SCALES);
  if (nameScale) out.nameScale = nameScale;
  const faceLead = pickToken(record.faceLead, FACE_LEADS);
  if (faceLead) out.faceLead = faceLead;
  const lettering = pickToken(record.lettering, LETTERING_IDS);
  if (lettering) out.lettering = lettering;
  const ink = pickToken(record.ink, INK_IDS);
  if (ink) out.ink = ink;
  const accent = pickToken(record.accent, ACCENT_IDS);
  if (accent) out.accent = accent;
  const qrFinish = pickToken(record.qrFinish, QR_FINISH_IDS);
  if (qrFinish) out.qrFinish = qrFinish;
  const grain = pickToken(record.grain, GRAIN_IDS);
  if (grain) out.grain = grain;
  const motion = pickToken(record.motion, MOTION_IDS);
  if (motion) out.motion = motion;
  if (!Object.keys(out).length) return undefined;
  return stripIdentityFromDesign(out);
}

function textIsDark(color: string) {
  const hex = color.replace("#", "");
  if (hex.length < 6) return true;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 < 148;
}

function accentPair(id: CeleCardAccent, theme: DigitalCardTheme) {
  if (id === "teal") return { accent: "#0B8A83", accentSoft: "rgba(11,138,131,0.14)" };
  if (id === "gold") return { accent: "#d4a63a", accentSoft: "rgba(212,166,58,0.16)" };
  if (id === "copper") return { accent: "#b45309", accentSoft: "rgba(180,83,9,0.16)" };
  if (id === "sand") return { accent: "#c4a574", accentSoft: "rgba(196,165,116,0.18)" };
  if (id === "ivory") return { accent: "#e8d5b5", accentSoft: "rgba(232,213,181,0.16)" };
  if (id === "emerald") return { accent: "#047857", accentSoft: "rgba(4,120,87,0.14)" };
  if (id === "wine") return { accent: "#9f1239", accentSoft: "rgba(159,18,57,0.14)" };
  if (id === "rose") return { accent: "#e11d48", accentSoft: "rgba(225,29,72,0.12)" };
  if (id === "sky") return { accent: "#38bdf8", accentSoft: "rgba(56,189,248,0.14)" };
  const darkPlate = !textIsDark(theme.text);
  return darkPlate
    ? { accent: "#f8fafc", accentSoft: "rgba(248,250,252,0.14)" }
    : { accent: "#0f172a", accentSoft: "rgba(15,23,42,0.1)" };
}

export function applyCeleCardDesign(
  theme: DigitalCardTheme,
  design?: CeleCardDesign | null
): DigitalCardTheme {
  if (!design) return theme;
  const next: DigitalCardTheme = {
    ...theme,
    composition: design.composition ?? theme.composition,
    atmosphere: design.atmosphere ?? theme.atmosphere,
    ornament: design.ornament ?? theme.ornament,
    textureUrl: design.paperUrl || theme.textureUrl,
  };
  if (design.accent) {
    const pair = accentPair(design.accent, next);
    next.accent = pair.accent;
    next.accentSoft = pair.accentSoft;
  }
  if (design.ink === "light" && !textIsDark(next.text)) {
    next.text = "#1c1917";
    next.muted = "#57534e";
    next.qrInk = "#1c1917";
    next.cardBackground = `linear-gradient(180deg, rgba(255,252,247,0.88) 0%, rgba(255,252,247,0.7) 100%), ${theme.cardBackground}`;
  } else if (design.ink === "dark" && textIsDark(next.text)) {
    next.text = "#faf6ef";
    next.muted = "#d6bc8a";
    next.qrInk = "#0c0a09";
    next.cardBackground = `linear-gradient(180deg, rgba(8,10,16,0.74) 0%, rgba(8,10,16,0.58) 100%), ${theme.cardBackground}`;
  }
  return next;
}

export function celeCardNameScaleFactor(scale?: CeleCardNameScale | null) {
  if (scale === "quiet") return 0.84;
  if (scale === "statement") return 1.18;
  return 1;
}

export function celeCardFaceLead(
  composition: DigitalCardComposition,
  lead?: CeleCardFaceLead | null
): CeleCardFaceLead {
  if (lead) return lead;
  if (composition === "type-first") return "name";
  if (composition === "grid") return "name";
  return "photo";
}

/**
 * Keep paper always. Keep the current layout and finish unless the owner
 * asked to take the next look. Identity (name, photo, company, QR, logo)
 * is never stored here and is stripped if it appears.
 */
export function designAfterThemeChange(
  previous: CeleCardDesign,
  nextTheme: DigitalCardTheme,
  keepFinish = true,
  previousTheme?: DigitalCardTheme
): CeleCardDesign {
  const safePrevious = stripIdentityFromDesign(previous);
  const paper: CeleCardDesign = {
    paperUrl: safePrevious.paperUrl,
    paperTone: safePrevious.paperTone,
    paperWeight: safePrevious.paperWeight,
  };
  if (!keepFinish) {
    return stripIdentityFromDesign({
      ...paper,
      composition: nextTheme.composition,
      atmosphere: nextTheme.atmosphere ?? "none",
      ornament: nextTheme.ornament ?? "foil",
    });
  }
  return stripIdentityFromDesign({
    ...safePrevious,
    ...paper,
    composition: safePrevious.composition ?? previousTheme?.composition,
    atmosphere: safePrevious.atmosphere ?? previousTheme?.atmosphere ?? "none",
    ornament: safePrevious.ornament ?? previousTheme?.ornament ?? "foil",
  });
}

export function celeCardPaperStyle(theme: DigitalCardTheme, design?: CeleCardDesign | null) {
  const src = design?.paperUrl || theme.textureUrl;
  if (!src) return null;
  const lightCard = textIsDark(theme.text);
  const weight = design?.paperWeight ?? "balanced";
  const tone = design?.paperTone;
  const paperIsDark = tone === "dark" || (!tone && !lightCard);
  const custom = Boolean(design?.paperUrl);
  if (!custom) {
    return {
      src,
      opacity: theme.composition === "iconic" ? 0.22 : 0.16,
      mixBlendMode: "luminosity" as const,
      custom: false,
      veil: "transparent",
      mask: "none",
      copyVeil: "transparent",
      edge: "transparent",
    };
  }
  const opacity =
    weight === "subtle" ? 0.22 : weight === "rich" ? 0.5 : 0.34;
  let mixBlendMode: "multiply" | "soft-light" | "luminosity" | "overlay" = "luminosity";
  if (lightCard && !paperIsDark) mixBlendMode = "multiply";
  else if (lightCard && paperIsDark) mixBlendMode = "overlay";
  else if (!lightCard && paperIsDark) mixBlendMode = "soft-light";
  else mixBlendMode = "overlay";
  const veilOpacity = custom
    ? weight === "rich"
      ? 0.5
      : weight === "subtle"
        ? 0.28
        : 0.38
    : weight === "rich"
      ? 0.42
      : weight === "subtle"
        ? 0.22
        : 0.32;
  const cream = lightCard ? "255,252,247" : "8,10,16";
  const identity = lightCard ? "255,252,247" : "12,14,20";
  return {
    src,
    opacity,
    mixBlendMode,
    custom,
    veil: `linear-gradient(180deg, rgba(${cream},${veilOpacity}) 0%, rgba(${cream},${veilOpacity * 0.42}) 42%, rgba(${cream},${veilOpacity * 0.55}) 100%)`,
    /** Fades the photo under the origin mark and the CeleYou wordmark. */
    mask: "linear-gradient(180deg, transparent 0%, #000 18%, #000 78%, transparent 100%)",
    /** Soft band so the name, title, and company stay readable. */
    copyVeil: `linear-gradient(90deg, rgba(${identity},0) 0%, rgba(${identity},${custom ? 0.46 : 0.28}) 22%, rgba(${identity},${custom ? 0.5 : 0.3}) 78%, rgba(${identity},0) 100%)`,
    edge: lightCard
      ? "radial-gradient(ellipse at center, transparent 42%, rgba(120,70,20,0.16) 100%)"
      : "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.28) 100%)",
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
