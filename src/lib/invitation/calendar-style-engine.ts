import type { InvitationLayoutSlug } from "@/types/invitation-design";
import type { ExperienceCollectionId } from "@/lib/experience/experience-engine-v2";
import { getTemplateExperienceDNA } from "@/lib/experience/experience-engine-v2";

export type CalendarStyleId =
  | "luxury-foil"
  | "garden-arch"
  | "vintage-lace"
  | "hex-prism"
  | "rings-orbit"
  | "boarding-pass"
  | "glass-prism"
  | "petal-bloom"
  | "emerald-palace"
  | "velvet-night"
  | "kente-weave"
  | "neon-grid"
  | "summit-ticket"
  | "memorial-soft"
  | "islamic-ornate"
  | "crystal-shimmer"
  | "classic-3d";

const LAYOUT_CALENDAR_STYLE: Partial<Record<InvitationLayoutSlug, CalendarStyleId>> = {
  "classic-gold": "luxury-foil",
  "arch-green": "garden-arch",
  "rustic-lace": "vintage-lace",
  "boho-hexagon": "hex-prism",
  "luxury-rings": "rings-orbit",
  "custom-media": "glass-prism",
  "passport-luxe": "boarding-pass",
  "glass-acrylic": "crystal-shimmer",
  "floral-garden": "petal-bloom",
  "royal-emerald-wedding": "emerald-palace",
  "midnight-velvet-reception": "velvet-night",
  "kente-heritage-union": "kente-weave",
  "floral-garden-romance": "petal-bloom",
  "passport-destination-wedding": "boarding-pass",
  "crystal-acrylic-luxury": "crystal-shimmer",
  "golden-islamic-nikkah": "islamic-ornate",
  "memorial-candle-tribute": "memorial-soft",
  "neon-celebration-party": "neon-grid",
  "corporate-prestige-summit": "summit-ticket",
};

const COLLECTION_FALLBACK: Partial<Record<ExperienceCollectionId, CalendarStyleId>> = {
  "luxury-gold": "luxury-foil",
  garden: "garden-arch",
  vintage: "vintage-lace",
  modern: "hex-prism",
  passport: "boarding-pass",
  glass: "glass-prism",
  floral: "petal-bloom",
  royal: "emerald-palace",
  night: "velvet-night",
  "african-heritage": "kente-weave",
  neon: "neon-grid",
  corporate: "summit-ticket",
  funeral: "memorial-soft",
  islamic: "islamic-ornate",
};

export function getCalendarStyleForLayout(
  layout: InvitationLayoutSlug | string,
  collectionId?: ExperienceCollectionId
): CalendarStyleId {
  const fromLayout = LAYOUT_CALENDAR_STYLE[layout as InvitationLayoutSlug];
  if (fromLayout) return fromLayout;

  const dna = getTemplateExperienceDNA(layout);
  const fromCollection = COLLECTION_FALLBACK[collectionId ?? dna.collectionId];
  if (fromCollection) return fromCollection;

  return "classic-3d";
}

export const CALENDAR_STYLE_LABELS: Record<CalendarStyleId, string> = {
  "luxury-foil": "Luxury foil date card",
  "garden-arch": "Garden arch save-the-date",
  "vintage-lace": "Vintage lace calendar",
  "hex-prism": "Hexagonal prism date",
  "rings-orbit": "Orbiting rings date",
  "boarding-pass": "Boarding pass reminder",
  "glass-prism": "Glass prism date",
  "petal-bloom": "Floating petal calendar",
  "emerald-palace": "Emerald palace date",
  "velvet-night": "Velvet night save-the-date",
  "kente-weave": "Kente heritage date",
  "neon-grid": "Neon pulse reminder",
  "summit-ticket": "Summit ticket date",
  "memorial-soft": "Memorial remembrance date",
  "islamic-ornate": "Ornamental nikkah date",
  "crystal-shimmer": "Crystal shimmer date",
  "classic-3d": "Classic elevated date",
};
