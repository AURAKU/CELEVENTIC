import type { OpeningExperienceId } from "@/lib/experience/experience-types";
import type { RevealMode } from "@/lib/invitation-studio/studio-types";

export interface EnvelopeVisualTheme {
  bodyBg: string;
  flapGradient: string;
  sealGradient: string;
  sealIcon?: string;
  borderColor: string;
  accent: string;
  label: string;
  floral?: boolean;
  royal?: boolean;
  kente?: boolean;
  islamic?: boolean;
}

export interface OpeningExperienceMeta {
  id: OpeningExperienceId;
  label: string;
  description: string;
  category: "envelope" | "curtain" | "palace" | "interactive" | "instant";
  envelopeTheme?: EnvelopeVisualTheme;
}

export const OPENING_EXPERIENCES: OpeningExperienceMeta[] = [
  {
    id: "envelope-classic",
    label: "Classic white envelope",
    description: "Clean white envelope — tap to open",
    category: "envelope",
    envelopeTheme: {
      bodyBg: "linear-gradient(145deg, #fafafa 0%, #f0f0f0 100%)",
      flapGradient: "linear-gradient(180deg, #e8e8e8 0%, #d4d4d4 100%)",
      sealGradient: "linear-gradient(145deg, #C9A227 0%, #8B6914 100%)",
      borderColor: "rgba(0,0,0,0.12)",
      accent: "#0B8A83",
      label: "Tap to open",
    },
  },
  {
    id: "wax-seal-pink",
    label: "Pink wax seal",
    description: "Premium pink wax — glow, crack, unfold",
    category: "envelope",
    envelopeTheme: {
      bodyBg: "linear-gradient(145deg, #fce4ec 0%, #f8bbd0 100%)",
      flapGradient: "linear-gradient(180deg, #f48fb1 0%, #ec407a 100%)",
      sealGradient: "linear-gradient(145deg, #f8b4c4 0%, #e91e63 100%)",
      borderColor: "rgba(233,30,99,0.35)",
      accent: "#e91e63",
      label: "Tap the seal to open",
    },
  },
  {
    id: "wax-seal-gold",
    label: "Gold wax seal",
    description: "Luxury gold foil wax seal",
    category: "envelope",
    envelopeTheme: {
      bodyBg: "linear-gradient(145deg, #fff8e7 0%, #f5e6c8 100%)",
      flapGradient: "linear-gradient(180deg, #D4A63A 0%, #B8860B 100%)",
      sealGradient: "linear-gradient(145deg, #F5E6B8 0%, #C9A227 100%)",
      borderColor: "rgba(212,166,58,0.5)",
      accent: "#D4A63A",
      label: "Tap the seal to open",
    },
  },
  {
    id: "wax-seal-rose",
    label: "Rose gold seal",
    description: "Rose gold wax with soft blush envelope",
    category: "envelope",
    envelopeTheme: {
      bodyBg: "linear-gradient(145deg, #fff0f3 0%, #f5d5c8 100%)",
      flapGradient: "linear-gradient(180deg, #e8b4a0 0%, #c9956c 100%)",
      sealGradient: "linear-gradient(145deg, #e8c4a8 0%, #b76e79 100%)",
      borderColor: "rgba(183,110,121,0.4)",
      accent: "#b76e79",
      label: "Tap the seal to open",
    },
  },
  {
    id: "wax-seal-silver",
    label: "Silver wax seal",
    description: "Elegant silver foil seal",
    category: "envelope",
    envelopeTheme: {
      bodyBg: "linear-gradient(145deg, #f5f5f5 0%, #e0e0e0 100%)",
      flapGradient: "linear-gradient(180deg, #d0d0d0 0%, #a8a8a8 100%)",
      sealGradient: "linear-gradient(145deg, #f0f0f0 0%, #9e9e9e 100%)",
      borderColor: "rgba(158,158,158,0.45)",
      accent: "#757575",
      label: "Tap the seal to open",
    },
  },
  {
    id: "wax-seal-black",
    label: "Black wax seal",
    description: "Midnight black with gold seal",
    category: "envelope",
    envelopeTheme: {
      bodyBg: "linear-gradient(145deg, #2a2a2a 0%, #1a1a1a 100%)",
      flapGradient: "linear-gradient(180deg, #3d3d3d 0%, #1a1a1a 100%)",
      sealGradient: "linear-gradient(145deg, #D4A63A 0%, #8B6914 100%)",
      borderColor: "rgba(212,166,58,0.35)",
      accent: "#D4A63A",
      label: "Tap the seal to open",
    },
  },
  {
    id: "envelope-floral",
    label: "Floral envelope",
    description: "Flowers frame the envelope reveal",
    category: "envelope",
    envelopeTheme: {
      bodyBg: "linear-gradient(145deg, #fff5f5 0%, #fce7f3 100%)",
      flapGradient: "linear-gradient(180deg, #fda4af 0%, #f472b6 100%)",
      sealGradient: "linear-gradient(145deg, #fbcfe8 0%, #ec4899 100%)",
      borderColor: "rgba(244,114,182,0.4)",
      accent: "#ec4899",
      label: "Tap to open",
      floral: true,
    },
  },
  {
    id: "envelope-royal",
    label: "Royal envelope",
    description: "Gold trim luxury animation",
    category: "envelope",
    envelopeTheme: {
      bodyBg: "linear-gradient(145deg, #1a1a2e 0%, #16213e 100%)",
      flapGradient: "linear-gradient(180deg, #D4A63A 0%, #8B6914 100%)",
      sealGradient: "linear-gradient(145deg, #F5E6B8 0%, #C9A227 100%)",
      borderColor: "rgba(212,166,58,0.6)",
      accent: "#D4A63A",
      label: "Tap to open",
      royal: true,
    },
  },
  {
    id: "envelope-kente",
    label: "Kente envelope",
    description: "African pattern with gold foil reveal",
    category: "envelope",
    envelopeTheme: {
      bodyBg: "linear-gradient(135deg, #1a472a 0%, #0d2818 50%, #c9a227 100%)",
      flapGradient: "linear-gradient(180deg, #D4A63A 0%, #8B6914 100%)",
      sealGradient: "linear-gradient(145deg, #f5e6b8 0%, #c9a227 100%)",
      borderColor: "rgba(201,162,39,0.55)",
      accent: "#D4A63A",
      label: "Tap to open",
      kente: true,
    },
  },
  {
    id: "envelope-islamic",
    label: "Islamic golden envelope",
    description: "Arabic-inspired gold geometry — Nikkah, Eid, naming",
    category: "envelope",
    envelopeTheme: {
      bodyBg: "linear-gradient(160deg, #0d3b2e 0%, #1a5c4a 50%, #0d2818 100%)",
      flapGradient: "linear-gradient(180deg, #D4A63A 0%, #8B6914 100%)",
      sealGradient: "linear-gradient(145deg, #F5E6B8 0%, #C9A227 100%)",
      sealIcon: "☪",
      borderColor: "rgba(212,166,58,0.5)",
      accent: "#D4A63A",
      label: "Tap the seal to open",
      islamic: true,
    },
  },
  { id: "curtain-wedding", label: "Wedding stage curtain", description: "Red velvet curtains part slowly", category: "curtain" },
  { id: "curtain-concert", label: "Concert stage", description: "Spotlight curtain reveal", category: "curtain" },
  { id: "curtain-award", label: "Award night", description: "Gold curtain gala reveal", category: "curtain" },
  { id: "curtain-birthday", label: "Birthday party", description: "Festive curtain pop", category: "curtain" },
  { id: "curtain-corporate", label: "Corporate launch", description: "Clean professional curtain", category: "curtain" },
  { id: "palace-entrance", label: "Palace entrance", description: "Golden hall with light beams", category: "palace" },
  { id: "scratch", label: "Scratch foil", description: "Scratch gold foil to reveal", category: "interactive" },
  { id: "passport", label: "Passport open", description: "Luxury passport booklet", category: "interactive" },
  { id: "glass", label: "Glass swipe", description: "Frosted acrylic swipe", category: "interactive" },
  { id: "scroll-unroll", label: "Scroll unroll", description: "Royal parchment unfolds", category: "interactive" },
  { id: "none", label: "Instant", description: "Skip opening ceremony", category: "instant" },
];

export function getOpeningExperience(id: OpeningExperienceId) {
  return OPENING_EXPERIENCES.find((e) => e.id === id);
}

export function mapLegacyRevealMode(mode: RevealMode): OpeningExperienceId {
  const map: Record<RevealMode, OpeningExperienceId> = {
    envelope: "wax-seal-gold",
    scratch: "scratch",
    passport: "passport",
    glass: "glass",
    curtain: "curtain-wedding",
    "scroll-unroll": "scroll-unroll",
    none: "none",
  };
  return map[mode] ?? "wax-seal-gold";
}

/** Keep legacy studio.revealMode in sync when hosts pick a full opening experience */
export function mapOpeningToLegacyRevealMode(id: OpeningExperienceId): RevealMode {
  if (id.startsWith("curtain-")) return "curtain";
  if (id === "scratch") return "scratch";
  if (id === "passport") return "passport";
  if (id === "glass") return "glass";
  if (id === "scroll-unroll") return "scroll-unroll";
  if (id === "none") return "none";
  return "envelope";
}

export function isEnvelopeExperience(id: OpeningExperienceId) {
  const meta = getOpeningExperience(id);
  return meta?.category === "envelope";
}
