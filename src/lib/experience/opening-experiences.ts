import type { OpeningExperienceId } from "@/lib/experience/experience-types";
import type { RevealMode } from "@/lib/invitation-studio/studio-types";

export interface EnvelopeVisualTheme {
  /** Full-viewport stage behind the framed envelope. */
  stageBg?: string;
  /** Cyan / accent inner frame stroke. */
  frameColor?: string;
  /** Subtle gold outer edge stroke. */
  outerEdgeColor?: string;
  /** Envelope card body fill (navy / paper). */
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
  /**
   * Photoreal face art — masked into the V-flap envelope geometry with an
   * interactive wax seal overlay (dynamic initials). CSS/SVG remains fallback.
   */
  faceArtUrl?: string;
  /** Soft cream stage + embroidered / photoreal envelope face. */
  photoreal?: boolean;
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
      bodyBg: "linear-gradient(145deg, #f2eee6 0%, #e6dfd4 48%, #d9d0c4 100%)",
      flapGradient: "linear-gradient(180deg, #e8e1d6 0%, #d2c8ba 100%)",
      sealGradient: "linear-gradient(145deg, #E8C56A 0%, #A67C1F 45%, #6B4E12 100%)",
      borderColor: "rgba(80,60,40,0.16)",
      accent: "#C9A227",
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
    id: "wax-seal-emerald",
    label: "Emerald wax seal",
    description: "Palace emerald envelope — press the gold wax seal",
    category: "envelope",
    envelopeTheme: {
      bodyBg: "linear-gradient(145deg, #064e3b 0%, #022c22 55%, #0a1f1a 100%)",
      flapGradient: "linear-gradient(180deg, #D4AF37 0%, #8B6914 100%)",
      sealGradient: "linear-gradient(145deg, #F5E6B8 0%, #C9A227 55%, #059669 100%)",
      sealIcon: "♛",
      borderColor: "rgba(212,175,55,0.55)",
      accent: "#D4AF37",
      label: "Press the wax seal",
      royal: true,
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
      stageBg: "linear-gradient(180deg, #0a1628 0%, #0d3d3a 42%, #0a2a38 72%, #061018 100%)",
      frameColor: "rgba(56, 189, 248, 0.85)",
      outerEdgeColor: "rgba(212, 166, 58, 0.45)",
      bodyBg: "linear-gradient(160deg, #121a2e 0%, #0c1424 55%, #0a101c 100%)",
      flapGradient: "linear-gradient(180deg, #C9A84C 0%, #A8892E 48%, #8B6914 100%)",
      sealGradient: "linear-gradient(145deg, #F5E6B8 0%, #D4A63A 48%, #A8892E 100%)",
      borderColor: "rgba(212,166,58,0.7)",
      accent: "#D4A63A",
      label: "Tap to open",
      royal: true,
    },
  },
  {
    id: "envelope-embroidered",
    label: "Embroidered cream envelope",
    description:
      "Photoreal cream embroidered envelope — peach seal rides the flap tip (fills cream disc), flap lifts as one — tap to begin",
    category: "envelope",
    envelopeTheme: {
      photoreal: true,
      faceArtUrl: "/templates/traditional-marriage-envelope.png?v=pearl-cj-2",
      stageBg:
        "linear-gradient(180deg, #f8f2ea 0%, #f0e6dc 36%, #e9ddd2 68%, #e2d4c6 100%)",
      frameColor: "rgba(180, 140, 110, 0.35)",
      outerEdgeColor: "rgba(196, 154, 120, 0.28)",
      bodyBg: "linear-gradient(160deg, #faf6f0 0%, #f0e8de 55%, #e8ddd2 100%)",
      flapGradient: "linear-gradient(180deg, #f5efe6 0%, #ebe2d6 100%)",
      sealGradient:
        "radial-gradient(circle at 32% 26%, #f8e4d6 0%, #f0cbb8 28%, #e8b49a 52%, #d9a088 78%, #c98a72 100%)",
      borderColor: "rgba(200, 140, 110, 0.5)",
      accent: "#C9A227",
      label: "Tap to open",
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
  { id: "curtain-wedding", label: "Wedding stage curtain", description: "Deep velvet curtains part slowly after tap — theatrical reveal", category: "curtain" },
  { id: "curtain-concert", label: "Concert stage", description: "Spotlight curtain reveal", category: "curtain" },
  { id: "curtain-award", label: "Award night", description: "Gold curtain gala reveal", category: "curtain" },
  { id: "curtain-birthday", label: "Birthday party", description: "Festive curtain pop", category: "curtain" },
  { id: "curtain-corporate", label: "Corporate launch", description: "Clean professional curtain", category: "curtain" },
  {
    id: "briefing-folder",
    label: "Briefing folder",
    description: "Unfold the executive briefing dossier",
    category: "interactive",
  },
  {
    id: "agenda-flip",
    label: "Agenda flip",
    description: "Flip into the keynote agenda chapters",
    category: "interactive",
  },
  {
    id: "launch-pulse",
    label: "Launch pulse",
    description: "Pulse open into the product launch invite",
    category: "interactive",
  },
  {
    id: "investor-pass",
    label: "Investor pass",
    description: "Open the investor night credential pass",
    category: "interactive",
  },
  {
    id: "balloon-burst",
    label: "Balloon burst",
    description: "Tap to burst balloons into the birthday invite",
    category: "interactive",
  },
  { id: "palace-entrance", label: "Palace entrance", description: "Golden hall with light beams", category: "palace" },
  { id: "scratch", label: "Scratch foil", description: "Scratch gold foil to reveal", category: "interactive" },
  { id: "passport", label: "Passport open", description: "Luxury passport booklet", category: "interactive" },
  { id: "glass", label: "Glass swipe", description: "Frosted acrylic swipe", category: "interactive" },
  { id: "scroll-unroll", label: "Scroll unroll", description: "Royal parchment unfolds", category: "interactive" },
  { id: "swipe-reveal", label: "Swipe reveal", description: "Swipe across to unveil the invitation", category: "interactive" },
  { id: "pop-reveal", label: "Pop reveal", description: "Tap to pop and celebrate", category: "interactive" },
  { id: "gift-box", label: "Gift box", description: "Open a wrapped gift box", category: "interactive" },
  { id: "light-beam", label: "Light beam", description: "Luxury spotlight reveal", category: "interactive" },
  { id: "film-countdown", label: "Film countdown", description: "Cinematic 3-2-1 countdown", category: "interactive" },
  { id: "letter-unfold", label: "Letter unfold", description: "Vintage letter unfolds", category: "interactive" },
  { id: "flower-bloom", label: "Flower bloom", description: "Tap a flower to bloom", category: "interactive" },
  { id: "confetti-burst", label: "Confetti burst", description: "Instant confetti celebration", category: "interactive" },
  { id: "flip-reveal", label: "Flip reveal", description: "3D card flip ceremony", category: "interactive" },
  { id: "zoom-reveal", label: "Zoom reveal", description: "Camera zoom into the moment", category: "interactive" },
  {
    id: "magazine-page-turn",
    label: "Magazine page turn",
    description: "Editorial cover — swipe or tap to turn the page",
    category: "interactive",
  },
  {
    id: "candle-light",
    label: "Candle light",
    description: "Unlit memorial candle — tap to light",
    category: "interactive",
  },
  {
    id: "press-hold",
    label: "Press and hold",
    description: "Hold to unlock the invitation",
    category: "interactive",
  },
  {
    id: "satin-bow",
    label: "Satin bow",
    description: "Ivory card tied with a satin bow — tap to untie",
    category: "interactive",
  },
  {
    id: "ring-box",
    label: "Ring box",
    description: "Black-tie ring box — tap to open the lid",
    category: "interactive",
  },
  {
    id: "blush-gate",
    label: "Blush gate",
    description:
      "Blush floral envelope → champagne wax seal lifts slowly → flaps unfold → the golden gate opens from the centre",
    category: "palace",
  },
  {
    id: "archway",
    label: "Palace archway",
    description: "Emerald cathedral gates — tap to enter",
    category: "palace",
  },
  {
    id: "petal-fall",
    label: "Petal fall",
    description: "Watercolor garden — tap and petals cascade away",
    category: "interactive",
  },
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

export function mapOpeningToLegacyRevealMode(id: OpeningExperienceId): RevealMode {
  if (id.startsWith("curtain-")) return "curtain";
  if (id === "scratch") return "scratch";
  if (id === "passport" || id === "investor-pass") return "passport";
  if (id === "glass" || id === "swipe-reveal" || id === "petal-fall") return "glass";
  if (id === "scroll-unroll" || id === "briefing-folder" || id === "letter-unfold") return "scroll-unroll";
  if (id === "none" || id === "film-countdown") return "none";
  if (id === "pop-reveal" || id === "confetti-burst" || id === "balloon-burst" || id === "launch-pulse")
    return "scratch";
  if (id === "flip-reveal" || id === "zoom-reveal" || id === "magazine-page-turn" || id === "ring-box" || id === "agenda-flip")
    return "passport";
  if (id === "candle-light") return "curtain";
  if (
    id === "satin-bow" ||
    id === "archway" ||
    id === "palace-entrance" ||
    id === "blush-gate"
  ) {
    return "envelope";
  }
  return "envelope";
}

export function isEnvelopeExperience(id: OpeningExperienceId) {
  const meta = getOpeningExperience(id);
  return meta?.category === "envelope";
}

export function isCurtainExperience(id: OpeningExperienceId | string | undefined) {
  return Boolean(id && String(id).startsWith("curtain-"));
}

/**
 * Catalogue / studio “Tap to open” already consumed the user gesture.
 * Prefer landing on the sealed / closed ceremony so the guest (or previewer)
 * still performs the seal / curtain open — that keeps the slow cinematic
 * lift. Callers that truly need a one-shot open can still pass autoOpen.
 */
export function previewAutoOpensReveal(id: OpeningExperienceId | string | undefined): boolean {
  // Default off: envelope + curtain feel magical when the seal/curtain is tapped,
  // not when the ceremony auto-fires after the brand video.
  void id;
  return false;
}

export interface PreviewTapCopy {
  label: string;
  subtitle?: string;
  /**
   * The beats this tap actually plays, opening gesture first and arrival last.
   * Callers splice a music beat between them when the template has a track, so
   * the affordance promises the experience rather than describing the artwork.
   */
  steps: [string, string];
}

/**
 * Curated gesture copy per opening. The generic fallback names the mechanic,
 * these name what the guest's finger does and what answers it.
 */
const OPENING_TAP_COPY: Partial<Record<OpeningExperienceId, PreviewTapCopy>> = {
  "satin-bow": {
    label: "Tap to untie the bow",
    subtitle: "Play the opening exactly as your guests will see it",
    steps: ["Bow unties", "Invite opens"],
  },
  "blush-gate": {
    label: "Tap to lift the wax seal",
    subtitle: "Play the opening exactly as your guests will see it",
    steps: ["Seal lifts", "Golden gate opens"],
  },
  "ring-box": {
    label: "Tap to open the ring box",
    subtitle: "Play the opening exactly as your guests will see it",
    steps: ["Lid lifts", "Invite reveals"],
  },
  "candle-light": {
    label: "Tap to light the candle",
    subtitle: "Play the opening exactly as your guests will see it",
    steps: ["Candle lights", "Invite reveals"],
  },
  "wax-seal-black": {
    label: "Tap to press the mourning seal",
    subtitle: "Play the opening exactly as your guests will see it",
    steps: ["Seal lifts", "Cloth rite opens"],
  },
  "envelope-kente": {
    label: "Tap to open the kente envelope",
    subtitle: "Play the opening exactly as your guests will see it",
    steps: ["Envelope opens", "Farewell reveals"],
  },
  "letter-unfold": {
    label: "Tap to unfold the letter",
    subtitle: "Play the opening exactly as your guests will see it",
    steps: ["Letter unfolds", "Homegoing opens"],
  },
  "envelope-royal": {
    label: "Tap to open the white cloth envelope",
    subtitle: "Play the opening exactly as your guests will see it",
    steps: ["Envelope opens", "Homegoing reveals"],
  },
  "envelope-classic": {
    label: "Tap to open the vigil notice",
    subtitle: "Play the opening exactly as your guests will see it",
    steps: ["Envelope opens", "Notice reveals"],
  },
  "curtain-birthday": {
    label: "Tap to open the party curtain",
    subtitle: "Play the opening exactly as your guests will see it",
    steps: ["Curtain parts", "Party begins"],
  },
  "curtain-concert": {
    label: "Tap to drop the stage curtain",
    subtitle: "Play the opening exactly as your guests will see it",
    steps: ["Curtain drops", "Bash begins"],
  },
  "wax-seal-pink": {
    label: "Tap to break the pink seal",
    subtitle: "Play the opening exactly as your guests will see it",
    steps: ["Seal lifts", "Glam invite opens"],
  },
  "balloon-burst": {
    label: "Tap to burst the balloons",
    subtitle: "Play the opening exactly as your guests will see it",
    steps: ["Balloons burst", "Surprise reveals"],
  },
  "briefing-folder": {
    label: "Tap to open the briefing folder",
    subtitle: "Play the opening exactly as your guests will see it",
    steps: ["Folder unfolds", "Brief begins"],
  },
  "agenda-flip": {
    label: "Tap to flip the agenda",
    subtitle: "Play the opening exactly as your guests will see it",
    steps: ["Agenda flips", "Keynote opens"],
  },
  "launch-pulse": {
    label: "Tap to pulse the launch",
    subtitle: "Play the opening exactly as your guests will see it",
    steps: ["Pulse hits", "Launch reveals"],
  },
  "investor-pass": {
    label: "Tap to open the investor pass",
    subtitle: "Play the opening exactly as your guests will see it",
    steps: ["Pass opens", "Night begins"],
  },
  "gift-box": {
    label: "Tap to open the gift box",
    subtitle: "Play the opening exactly as your guests will see it",
    steps: ["Box opens", "Invite reveals"],
  },
  "flower-bloom": {
    label: "Tap to bloom the flower",
    subtitle: "Play the opening exactly as your guests will see it",
    steps: ["Petals bloom", "Invite reveals"],
  },
  "petal-fall": {
    label: "Tap to let the petals fall",
    subtitle: "Play the opening exactly as your guests will see it",
    steps: ["Petals cascade", "Invite reveals"],
  },
  scratch: {
    label: "Tap to scratch the foil",
    subtitle: "Play the opening exactly as your guests will see it",
    steps: ["Foil scratches away", "Invite reveals"],
  },
  "scroll-unroll": {
    label: "Tap to unroll the scroll",
    subtitle: "Play the opening exactly as your guests will see it",
    steps: ["Scroll unrolls", "Invite reveals"],
  },
  passport: {
    label: "Tap to open the passport",
    subtitle: "Play the opening exactly as your guests will see it",
    steps: ["Booklet opens", "Invite reveals"],
  },
  archway: {
    label: "Tap to open the vigil gate",
    subtitle: "Play the opening exactly as your guests will see it",
    steps: ["Gates open", "Notice reveals"],
  },
  "palace-entrance": {
    label: "Tap to enter the palace",
    subtitle: "Play the opening exactly as your guests will see it",
    steps: ["Hall lights up", "Invite reveals"],
  },
  "press-hold": {
    label: "Press and hold to unlock",
    subtitle: "Play the opening exactly as your guests will see it",
    steps: ["Lock releases", "Invite reveals"],
  },
  "magazine-page-turn": {
    label: "Tap to turn the page",
    subtitle: "Play the opening exactly as your guests will see it",
    steps: ["Cover turns", "Invite reveals"],
  },
};

/** Affordance copy for catalogue tiles that mirror the live opening cover. */
export function previewTapLabelForOpening(
  id: OpeningExperienceId | string | undefined
): PreviewTapCopy {
  if (!id || id === "none") {
    return {
      label: "Tap to view invitation",
      steps: ["Invite opens", "Explore as a guest"],
    };
  }
  const curated = OPENING_TAP_COPY[id as OpeningExperienceId];
  if (curated) return curated;

  if (isEnvelopeExperience(id as OpeningExperienceId)) {
    return {
      label: "Tap to open envelope",
      subtitle: "Play the opening exactly as your guests will see it",
      steps: ["Seal lifts", "Invite reveals"],
    };
  }
  if (isCurtainExperience(id)) {
    return {
      label: "Tap to open curtains",
      subtitle: "Play the opening exactly as your guests will see it",
      steps: ["Curtains part", "Invite reveals"],
    };
  }
  const meta = getOpeningExperience(id as OpeningExperienceId);
  return {
    label: meta?.label ? `Tap to open · ${meta.label}` : "Tap to view invitation",
    subtitle: meta?.description,
    steps: ["Opening plays", "Invite reveals"],
  };
}

/**
 * Full beat list for the affordance: the mechanic's own beats with the music
 * cue spliced in where a guest would actually hear it — on the opening gesture.
 * Pass `musicTitle` so catalogue tiles name the template's actual track.
 */
export function previewTapStepsForOpening(
  id: OpeningExperienceId | string | undefined,
  hasMusic: boolean,
  musicTitle?: string | null
): string[] {
  const { steps } = previewTapLabelForOpening(id);
  if (!hasMusic) return [...steps];
  const title = musicTitle?.trim();
  const musicBeat = title
    ? `${title.length > 28 ? `${title.slice(0, 26)}…` : title} plays`
    : "Music begins";
  return [steps[0], musicBeat, steps[1]];
}
