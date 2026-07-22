import type { IntroVariantId } from "./experience-types";

/**
 * Branded Celeventic intro variants. Every invitation opens with the official
 * logo, but the choreography around it belongs to the template's world —
 * a memorial breathes under a spotlight, a garden wedding blooms, a concert
 * bursts. Same brand, never the same animation.
 */

export interface IntroVariantMeta {
  id: IntroVariantId;
  label: string;
  /** Short line shown under the logo instead of the generic loading copy */
  tagline: string;
  /** Show the "Experience Engine" HUD card (engine-grid keeps the legacy look) */
  showHud: boolean;
}

export const INTRO_VARIANTS: Record<IntroVariantId, IntroVariantMeta> = {
  "engine-grid": {
    id: "engine-grid",
    label: "Experience Engine",
    tagline: "Preparing your cinematic invitation…",
    showHud: true,
  },
  "logo-bloom": {
    id: "logo-bloom",
    label: "Logo Bloom",
    tagline: "Something beautiful is unfolding…",
    showHud: false,
  },
  "particle-burst": {
    id: "particle-burst",
    label: "Particle Burst",
    tagline: "Get ready to celebrate…",
    showHud: false,
  },
  spotlight: {
    id: "spotlight",
    label: "Spotlight",
    tagline: "A moment of remembrance…",
    showHud: false,
  },
  "ink-reveal": {
    id: "ink-reveal",
    label: "Ink Reveal",
    tagline: "A story written for you…",
    showHud: false,
  },
  "glass-shimmer": {
    id: "glass-shimmer",
    label: "Glass Shimmer",
    tagline: "Something luminous awaits…",
    showHud: false,
  },
  "light-sweep": {
    id: "light-sweep",
    label: "Light Sweep",
    tagline: "Your experience is beginning…",
    showHud: false,
  },
  "film-title": {
    id: "film-title",
    label: "Film Title",
    tagline: "A Celeventic feature presentation",
    showHud: false,
  },
  orbit: {
    id: "orbit",
    label: "Royal Orbit",
    tagline: "An invitation of honour…",
    showHud: false,
  },
  "gold-foil": {
    id: "gold-foil",
    label: "Gold Foil",
    tagline: "Pressed in gold…",
    showHud: false,
  },
  candlelight: {
    id: "candlelight",
    label: "Candlelight",
    tagline: "In loving memory…",
    showHud: false,
  },
  constellation: {
    id: "constellation",
    label: "Constellation",
    tagline: "Written in the stars…",
    showHud: false,
  },
  "fabric-unfold": {
    id: "fabric-unfold",
    label: "Fabric Unfold",
    tagline: "Heritage woven for you…",
    showHud: false,
  },
  "seal-impress": {
    id: "seal-impress",
    label: "Seal Impress",
    tagline: "A seal is being pressed…",
    showHud: false,
  },
  "petal-cascade": {
    id: "petal-cascade",
    label: "Petal Cascade",
    tagline: "Petals are gathering…",
    showHud: false,
  },
  "neon-pulse": {
    id: "neon-pulse",
    label: "Neon Pulse",
    tagline: "The night is about to start…",
    showHud: false,
  },
  "marble-veil": {
    id: "marble-veil",
    label: "Marble Veil",
    tagline: "Light through frosted glass…",
    showHud: false,
  },
  "drum-pulse": {
    id: "drum-pulse",
    label: "Drum Pulse",
    tagline: "The cloth is unfolding…",
    showHud: false,
  },
  "prism-refract": {
    id: "prism-refract",
    label: "Prism Refract",
    tagline: "Champagne light gathering…",
    showHud: false,
  },
  "lace-draw": {
    id: "lace-draw",
    label: "Lace Draw",
    tagline: "Drawn in lace and timber…",
    showHud: false,
  },
  "hex-assemble": {
    id: "hex-assemble",
    label: "Hex Assemble",
    tagline: "A reverie takes shape…",
    showHud: false,
  },
  "quill-script": {
    id: "quill-script",
    label: "Quill Script",
    tagline: "Geometry written in gold…",
    showHud: false,
  },
  "lily-breathe": {
    id: "lily-breathe",
    label: "Lily Breathe",
    tagline: "In quiet ivory light…",
    showHud: false,
  },
  "drape-fall": {
    id: "drape-fall",
    label: "Drape Fall",
    tagline: "Cloth of honour descending…",
    showHud: false,
  },
  "canvas-wipe": {
    id: "canvas-wipe",
    label: "Canvas Wipe",
    tagline: "Your canvas is ready…",
    showHud: false,
  },
  "aurora-rise": {
    id: "aurora-rise",
    label: "Aurora Rise",
    tagline: "A soft dawn memorial…",
    showHud: false,
  },
  "ticket-tear": {
    id: "ticket-tear",
    label: "Ticket Tear",
    tagline: "Admit one to the celebration…",
    showHud: false,
  },
  "ring-orbit": {
    id: "ring-orbit",
    label: "Ring Orbit",
    tagline: "Two rings, one vow…",
    showHud: false,
  },
  "vine-grow": {
    id: "vine-grow",
    label: "Vine Grow",
    tagline: "The arch is waking…",
    showHud: false,
  },
  "chapel-glow": {
    id: "chapel-glow",
    label: "Chapel Glow",
    tagline: "Candlelight holds the room…",
    showHud: false,
  },
  "folio-open": {
    id: "folio-open",
    label: "Folio Open",
    tagline: "Your journey folio opens…",
    showHud: false,
  },
  "foil-rise": {
    id: "foil-rise",
    label: "Foil Rise",
    tagline: "Ivory and foil rising…",
    showHud: false,
  },
};

export const INTRO_VARIANT_OPTIONS = Object.values(INTRO_VARIANTS);

export function getIntroVariant(id: string | undefined | null): IntroVariantMeta {
  return (id && INTRO_VARIANTS[id as IntroVariantId]) || INTRO_VARIANTS["engine-grid"];
}

/**
 * Template-family default when the organizer hasn't chosen one.
 * Keyed off layout slug / collection / hero layout so each creative universe
 * opens differently out of the box.
 */
export function defaultIntroVariantFor(options: {
  layout?: string;
  collectionId?: string;
  heroLayout?: string;
  category?: string;
}): IntroVariantId {
  const haystack = [options.layout, options.collectionId, options.heroLayout, options.category]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const match = (...terms: string[]) => terms.some((t) => haystack.includes(t));

  if (match("memorial", "funeral", "tribute", "candle", "mourning")) return "spotlight";
  if (match("kente", "heritage", "adinkra", "traditional")) return "ink-reveal";
  if (match("floral", "garden", "boho", "bloom", "romance")) return "logo-bloom";
  if (match("neon", "party", "concert", "celebration", "birthday")) return "particle-burst";
  if (match("corporate", "conference", "summit", "prestige")) return "light-sweep";
  if (match("glass", "crystal", "acrylic", "frost")) return "glass-shimmer";
  if (match("velvet", "cinematic", "midnight", "film", "premiere")) return "film-title";
  if (match("royal", "palace", "luxury", "rings", "gilded", "emerald")) return "orbit";
  return "engine-grid";
}
