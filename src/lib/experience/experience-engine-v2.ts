/**
 * Experience Engine V2 — per-template creative DNA.
 * Every layout gets a unique emotional universe: intro, outro, audio, motion, pacing.
 */
import type { InvitationDesignConfig, InvitationLayoutSlug } from "@/types/invitation-design";
import type { ButtonStyle } from "@/lib/invitation-studio/studio-types";
import type { SlideshowStyleId as GallerySlideshowStyleId } from "@/lib/invitation/slideshow-styles";
import type {
  CountdownStyleId,
  ExperienceHubMode,
  ExperiencePacing,
  HeroLayoutId,
  OpeningExperienceId,
  OutroExperienceId,
  SceneTransitionId,
  SlideshowStyleId,
  EventExperienceConfig,
} from "@/lib/experience/experience-types";

export type ExperienceCollectionId =
  | "luxury"
  | "royal"
  | "minimal"
  | "editorial"
  | "magazine"
  | "modern"
  | "floral"
  | "destination"
  | "passport"
  | "cinema"
  | "travel"
  | "love-story"
  | "glass"
  | "museum"
  | "vintage"
  | "art-deco"
  | "garden"
  | "night"
  | "neon"
  | "festival"
  | "corporate"
  | "funeral"
  | "islamic"
  | "african-heritage"
  | "traditional"
  | "luxury-black"
  | "luxury-white"
  | "luxury-gold"
  | "custom";

export interface TemplateExperienceDNA {
  collectionId: ExperienceCollectionId;
  openingExperience: OpeningExperienceId;
  outroExperience: OutroExperienceId;
  defaultAudioCategory: string;
  defaultAudioTrackId: string;
  buttonStyle: ButtonStyle;
  hubMode: ExperienceHubMode;
  countdownStyle: CountdownStyleId;
  sceneTransition: SceneTransitionId;
  heroLayout: HeroLayoutId;
  slideshowStyle: SlideshowStyleId;
  pacing: ExperiencePacing;
  slideDurationMs: number;
}

export const EXPERIENCE_COLLECTIONS: Record<
  ExperienceCollectionId,
  { label: string; description: string }
> = {
  luxury: { label: "Luxury Collection", description: "Gold, marble, velvet — palace elegance" },
  royal: { label: "Royal Collection", description: "Regal ceremony and crown motifs" },
  minimal: { label: "Minimal Collection", description: "Clean whitespace and refined typography" },
  editorial: { label: "Editorial Collection", description: "Magazine spreads and bold layouts" },
  magazine: { label: "Magazine Collection", description: "Cover-story drama and grids" },
  modern: { label: "Modern Collection", description: "Contemporary geometry and motion" },
  floral: { label: "Floral Collection", description: "Botanical romance and petals" },
  destination: { label: "Destination Collection", description: "Travel and wanderlust" },
  passport: { label: "Passport Collection", description: "Stamps, tickets, boarding passes" },
  cinema: { label: "Cinema Collection", description: "Film grain and spotlight reveals" },
  travel: { label: "Travel Collection", description: "Maps, journeys, horizons" },
  "love-story": { label: "Love Story Collection", description: "Narrative chapters and romance" },
  glass: { label: "Glass Collection", description: "Frosted acrylic and shimmer" },
  museum: { label: "Museum Collection", description: "Gallery frames and quiet grandeur" },
  vintage: { label: "Vintage Collection", description: "Sepia, lace, and nostalgia" },
  "art-deco": { label: "Art Deco Collection", description: "Geometric glamour" },
  garden: { label: "Garden Collection", description: "Outdoor blooms and soft light" },
  night: { label: "Night Collection", description: "Moonlight and velvet darkness" },
  neon: { label: "Neon Collection", description: "Electric pulse and party energy" },
  festival: { label: "Festival Collection", description: "Confetti, drums, celebration" },
  corporate: { label: "Corporate Collection", description: "Professional summit aesthetic" },
  funeral: { label: "Funeral Collection", description: "Solemn tribute and candlelight" },
  islamic: { label: "Islamic Collection", description: "Ornamental gold geometry" },
  "african-heritage": { label: "African Heritage Collection", description: "Kente, drums, heritage" },
  traditional: { label: "Traditional Collection", description: "Classic customs and ceremony" },
  "luxury-black": { label: "Luxury Black Collection", description: "Onyx and champagne contrast" },
  "luxury-white": { label: "Luxury White Collection", description: "Ivory silk and pearl" },
  "luxury-gold": { label: "Luxury Gold Collection", description: "Pure gold foil luxury" },
  custom: { label: "Custom", description: "Build from your own media" },
};

const DNA: Record<InvitationLayoutSlug, TemplateExperienceDNA> = {
  "classic-gold": {
    collectionId: "luxury-gold",
    openingExperience: "wax-seal-gold",
    outroExperience: "golden-sparkles",
    defaultAudioCategory: "piano",
    defaultAudioTrackId: "luxury-piano-romance",
    buttonStyle: "gold",
    hubMode: "scroll",
    countdownStyle: "gold-royal",
    sceneTransition: "fade",
    heroLayout: "classic-centered",
    slideshowStyle: "ken-burns",
    pacing: "slow",
    slideDurationMs: 8000,
  },
  "arch-green": {
    collectionId: "garden",
    openingExperience: "scroll-unroll",
    outroExperience: "rose-petals",
    defaultAudioCategory: "strings",
    defaultAudioTrackId: "strings-garden",
    buttonStyle: "outline",
    hubMode: "journey",
    countdownStyle: "classic",
    sceneTransition: "book",
    heroLayout: "vine-arch",
    slideshowStyle: "floating-cards",
    pacing: "slow",
    slideDurationMs: 8500,
  },
  "rustic-lace": {
    collectionId: "vintage",
    openingExperience: "letter-unfold",
    outroExperience: "final-quote",
    defaultAudioCategory: "guitar",
    defaultAudioTrackId: "acoustic-warm",
    buttonStyle: "floral-edge",
    hubMode: "storybook",
    countdownStyle: "minimal",
    sceneTransition: "door",
    heroLayout: "lace-frame",
    slideshowStyle: "polaroid",
    pacing: "slow",
    slideDurationMs: 9000,
  },
  "boho-hexagon": {
    collectionId: "modern",
    openingExperience: "pop-reveal",
    outroExperience: "butterflies",
    defaultAudioCategory: "jazz",
    defaultAudioTrackId: "jazz-soft-lounge",
    buttonStyle: "pill",
    hubMode: "scroll",
    countdownStyle: "circular",
    sceneTransition: "sparkle",
    heroLayout: "hexagon-stack",
    slideshowStyle: "grid-reveal",
    pacing: "medium",
    slideDurationMs: 6500,
  },
  "luxury-rings": {
    collectionId: "luxury-black",
    openingExperience: "light-beam",
    outroExperience: "golden-sparkles",
    defaultAudioCategory: "violin",
    defaultAudioTrackId: "violin-elegance",
    buttonStyle: "gold",
    hubMode: "scroll",
    countdownStyle: "luxury",
    sceneTransition: "curtain",
    heroLayout: "rings-spotlight",
    slideshowStyle: "film-strip",
    pacing: "slow",
    slideDurationMs: 8200,
  },
  "custom-media": {
    collectionId: "custom",
    openingExperience: "swipe-reveal",
    outroExperience: "upload-memories",
    defaultAudioCategory: "instrumentals",
    defaultAudioTrackId: "ambient-cinematic",
    buttonStyle: "glass",
    hubMode: "scroll",
    countdownStyle: "glass",
    sceneTransition: "slide",
    heroLayout: "media-canvas",
    slideshowStyle: "ken-burns",
    pacing: "medium",
    slideDurationMs: 7000,
  },
  "passport-luxe": {
    collectionId: "passport",
    openingExperience: "passport",
    outroExperience: "see-you-soon",
    defaultAudioCategory: "instrumentals",
    defaultAudioTrackId: "travel-wanderlust",
    buttonStyle: "passport-stamp",
    hubMode: "journey",
    countdownStyle: "minimal",
    sceneTransition: "slide",
    heroLayout: "passport-stamp",
    slideshowStyle: "magazine",
    pacing: "medium",
    slideDurationMs: 7500,
  },
  "glass-acrylic": {
    collectionId: "glass",
    openingExperience: "glass",
    outroExperience: "golden-sparkles",
    defaultAudioCategory: "strings",
    defaultAudioTrackId: "strings-crystal",
    buttonStyle: "glass",
    hubMode: "scroll",
    countdownStyle: "glass",
    sceneTransition: "fade",
    heroLayout: "glass-frost",
    slideshowStyle: "floating-cards",
    pacing: "slow",
    slideDurationMs: 7800,
  },
  "floral-garden": {
    collectionId: "floral",
    openingExperience: "scratch",
    outroExperience: "rose-petals",
    defaultAudioCategory: "piano",
    defaultAudioTrackId: "piano-garden",
    buttonStyle: "floral-edge",
    hubMode: "scroll",
    countdownStyle: "classic",
    sceneTransition: "sparkle",
    heroLayout: "garden-card",
    slideshowStyle: "polaroid",
    pacing: "slow",
    slideDurationMs: 8000,
  },
  "royal-emerald-wedding": {
    collectionId: "royal",
    openingExperience: "palace-entrance",
    outroExperience: "fireworks",
    defaultAudioCategory: "violin",
    defaultAudioTrackId: "orchestra-royal",
    buttonStyle: "gold",
    hubMode: "journey",
    countdownStyle: "card-3d",
    sceneTransition: "curtain",
    heroLayout: "royal-palace",
    slideshowStyle: "ken-burns",
    pacing: "slow",
    slideDurationMs: 9000,
  },
  "midnight-velvet-reception": {
    collectionId: "night",
    openingExperience: "curtain-wedding",
    outroExperience: "closing-curtain",
    defaultAudioCategory: "jazz",
    defaultAudioTrackId: "jazz-midnight",
    buttonStyle: "glass",
    hubMode: "scroll",
    countdownStyle: "luxury",
    sceneTransition: "curtain",
    heroLayout: "velvet-stage",
    slideshowStyle: "film-strip",
    pacing: "slow",
    slideDurationMs: 8500,
  },
  "kente-heritage-union": {
    collectionId: "african-heritage",
    openingExperience: "envelope-kente",
    outroExperience: "lanterns",
    defaultAudioCategory: "african",
    defaultAudioTrackId: "african-drums-celebration",
    buttonStyle: "kente",
    hubMode: "storybook",
    countdownStyle: "ring",
    sceneTransition: "book",
    heroLayout: "kente-weave",
    slideshowStyle: "stacked-cards",
    pacing: "medium",
    slideDurationMs: 7200,
  },
  "floral-garden-romance": {
    collectionId: "garden",
    openingExperience: "flower-bloom",
    outroExperience: "butterflies",
    defaultAudioCategory: "piano",
    defaultAudioTrackId: "piano-garden",
    buttonStyle: "pill",
    hubMode: "scroll",
    countdownStyle: "card-3d",
    sceneTransition: "sparkle",
    heroLayout: "garden-bloom",
    slideshowStyle: "floating-cards",
    pacing: "slow",
    slideDurationMs: 8000,
  },
  "passport-destination-wedding": {
    collectionId: "destination",
    openingExperience: "flip-reveal",
    outroExperience: "see-you-soon",
    defaultAudioCategory: "instrumentals",
    defaultAudioTrackId: "travel-wanderlust",
    buttonStyle: "passport-stamp",
    hubMode: "journey",
    countdownStyle: "minimal",
    sceneTransition: "slide",
    heroLayout: "boarding-pass",
    slideshowStyle: "magazine",
    pacing: "medium",
    slideDurationMs: 7500,
  },
  "crystal-acrylic-luxury": {
    collectionId: "glass",
    openingExperience: "gift-box",
    outroExperience: "golden-sparkles",
    defaultAudioCategory: "strings",
    defaultAudioTrackId: "strings-crystal",
    buttonStyle: "glass",
    hubMode: "scroll",
    countdownStyle: "card-3d",
    sceneTransition: "fade",
    heroLayout: "crystal-prism",
    slideshowStyle: "floating-cards",
    pacing: "slow",
    slideDurationMs: 8200,
  },
  "golden-islamic-nikkah": {
    collectionId: "islamic",
    openingExperience: "envelope-islamic",
    outroExperience: "final-quote",
    defaultAudioCategory: "muslim",
    defaultAudioTrackId: "islamic-soft-instrumental",
    buttonStyle: "gold",
    hubMode: "journey",
    countdownStyle: "gold-royal",
    sceneTransition: "curtain",
    heroLayout: "islamic-arch",
    slideshowStyle: "ken-burns",
    pacing: "slow",
    slideDurationMs: 9000,
  },
  "memorial-candle-tribute": {
    collectionId: "funeral",
    openingExperience: "zoom-reveal",
    outroExperience: "thank-you-fade",
    defaultAudioCategory: "funeral",
    defaultAudioTrackId: "memorial-piano",
    buttonStyle: "solemn",
    hubMode: "scroll",
    countdownStyle: "minimal",
    sceneTransition: "fade",
    heroLayout: "memorial-candle",
    slideshowStyle: "ken-burns",
    pacing: "slow",
    slideDurationMs: 10000,
  },
  "neon-celebration-party": {
    collectionId: "neon",
    openingExperience: "confetti-burst",
    outroExperience: "fireworks",
    defaultAudioCategory: "celebration",
    defaultAudioTrackId: "party-edm-energy",
    buttonStyle: "neon",
    hubMode: "scroll",
    countdownStyle: "card-3d",
    sceneTransition: "sparkle",
    heroLayout: "neon-pulse",
    slideshowStyle: "grid-reveal",
    pacing: "fast",
    slideDurationMs: 5000,
  },
  "corporate-prestige-summit": {
    collectionId: "corporate",
    openingExperience: "film-countdown",
    outroExperience: "see-you-soon",
    defaultAudioCategory: "corporate",
    defaultAudioTrackId: "corporate-summit",
    buttonStyle: "sharp",
    hubMode: "tabs",
    countdownStyle: "minimal",
    sceneTransition: "slide",
    heroLayout: "corporate-grid",
    slideshowStyle: "magazine",
    pacing: "medium",
    slideDurationMs: 6500,
  },
};

export function getTemplateExperienceDNA(layout: InvitationLayoutSlug | string): TemplateExperienceDNA {
  return DNA[layout as InvitationLayoutSlug] ?? DNA["classic-gold"];
}

export function buildExperienceConfigFromDNA(dna: TemplateExperienceDNA): EventExperienceConfig {
  return {
    collectionId: dna.collectionId,
    openingExperience: dna.openingExperience,
    outroExperience: dna.outroExperience,
    defaultAudioCategory: dna.defaultAudioCategory,
    defaultAudioTrackId: dna.defaultAudioTrackId,
    hubMode: dna.hubMode,
    countdownStyle: dna.countdownStyle,
    sceneTransition: dna.sceneTransition,
    heroLayout: dna.heroLayout,
    slideshowStyle: dna.slideshowStyle,
    pacing: dna.pacing,
    introEnabled: true,
    introDurationSec: dna.pacing === "fast" ? 1.5 : dna.pacing === "slow" ? 3 : 2,
    enableRevealSounds: true,
  };
}

/** Merge V2 DNA into a design config without overwriting explicit user choices. */
export function enrichDesignWithExperienceDNA(design: InvitationDesignConfig): InvitationDesignConfig {
  const dna = getTemplateExperienceDNA(design.layout);
  const dnaExperience = buildExperienceConfigFromDNA(dna);
  const studio = {
    ...design.studio,
    buttonStyle: design.studio?.buttonStyle ?? dna.buttonStyle,
    revealMode: design.studio?.revealMode,
    fullScreen: design.studio?.fullScreen ?? true,
  };

  return {
    ...design,
    studio,
    experience: {
      ...dnaExperience,
      ...design.experience,
      openingExperience: design.experience?.openingExperience ?? dnaExperience.openingExperience,
      outroExperience: design.experience?.outroExperience ?? dnaExperience.outroExperience,
      countdownStyle: design.experience?.countdownStyle ?? dna.countdownStyle,
      sceneTransition: design.experience?.sceneTransition ?? dna.sceneTransition,
      heroLayout: design.experience?.heroLayout ?? dna.heroLayout,
      slideshowStyle: design.experience?.slideshowStyle ?? dna.slideshowStyle,
      hubMode: design.experience?.hubMode ?? dna.hubMode,
      pacing: design.experience?.pacing ?? dna.pacing,
      defaultAudioCategory: design.experience?.defaultAudioCategory ?? dna.defaultAudioCategory,
      defaultAudioTrackId: design.experience?.defaultAudioTrackId ?? dna.defaultAudioTrackId,
      collectionId: design.experience?.collectionId ?? dna.collectionId,
    },
  };
}

/** Map experience-engine slideshow ids to gallery component styles */
export function mapExperienceSlideshowStyle(id?: string): GallerySlideshowStyleId {
  const map: Record<string, GallerySlideshowStyleId> = {
    "fade-carousel": "fade-carousel",
    magazine: "magazine-collage",
    polaroid: "polaroid-stack",
    "film-strip": "timeline-gallery",
    "floating-cards": "floating-memories",
    "grid-reveal": "magazine-collage",
    "ken-burns": "classic-slideshow",
    "stacked-cards": "polaroid-stack",
  };
  return map[id ?? "fade-carousel"] ?? "fade-carousel";
}

export function getSlideDurationForLayout(layout: string): number {
  return getTemplateExperienceDNA(layout).slideDurationMs;
}
