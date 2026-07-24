/**
 * Experience Engine V2 — per-template creative DNA.
 * Every layout gets a unique emotional universe: intro, outro, audio, motion, pacing.
 */
import type { InvitationDesignConfig, InvitationLayoutSlug } from "@/types/invitation-design";
import type { ButtonStyle } from "@/lib/invitation-studio/studio-types";
import type { SlideshowStyleId as GallerySlideshowStyleId } from "@/lib/invitation/slideshow-styles";
import type { TypographyCategoryId } from "@/lib/experience/typography-engine";
import { getTypographyPack } from "@/lib/experience/typography-engine";
import type { BackgroundTypeId } from "@/lib/experience/background-engine";
import { getBackgroundPack } from "@/lib/experience/background-engine";
import { getLayoutMusicProfile } from "@/lib/invitation/layout-music-identity";
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
import { DEFAULT_HUB_TABS } from "@/lib/experience/experience-types";
import { getLayoutEnabledTabs } from "@/lib/invitation/layout-template-signatures";

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
  typographyPackId?: TypographyCategoryId;
  backgroundPackId?: BackgroundTypeId;
}

/** Maps each collection to its default typography + atmosphere */
const COLLECTION_VISUAL_DNA: Partial<
  Record<ExperienceCollectionId, { typography: TypographyCategoryId; background: BackgroundTypeId }>
> = {
  "luxury-gold": { typography: "luxury", background: "gold-foil" },
  garden: { typography: "romantic", background: "floating-flowers" },
  vintage: { typography: "elegant", background: "paper" },
  modern: { typography: "modern", background: "animated-gradient" },
  "luxury-black": { typography: "luxury", background: "velvet" },
  custom: { typography: "modern", background: "video" },
  passport: { typography: "classic", background: "paper" },
  glass: { typography: "minimal", background: "glass" },
  floral: { typography: "romantic", background: "floating-flowers" },
  royal: { typography: "luxury", background: "marble" },
  night: { typography: "elegant", background: "stars" },
  "african-heritage": { typography: "traditional", background: "kente" },
  destination: { typography: "editorial", background: "parallax" },
  islamic: { typography: "traditional", background: "luxury-texture" },
  funeral: { typography: "funeral", background: "stone" },
  neon: { typography: "bold", background: "galaxy" },
  corporate: { typography: "corporate", background: "static" },
};

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
    outroExperience: "fireworks",
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
    defaultAudioCategory: "nature",
    defaultAudioTrackId: "nature-ocean",
    buttonStyle: "passport-stamp",
    hubMode: "journey",
    countdownStyle: "flip",
    sceneTransition: "slide",
    heroLayout: "passport-stamp",
    slideshowStyle: "magazine",
    pacing: "medium",
    slideDurationMs: 7500,
  },
  "glass-acrylic": {
    collectionId: "glass",
    openingExperience: "glass",
    outroExperience: "closing-curtain",
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
    countdownStyle: "card-3d",
    sceneTransition: "sparkle",
    heroLayout: "garden-card",
    slideshowStyle: "polaroid",
    pacing: "slow",
    slideDurationMs: 8000,
  },
  "royal-emerald-wedding": {
    collectionId: "royal",
    openingExperience: "wax-seal-emerald",
    outroExperience: "seal-reform",
    defaultAudioCategory: "strings",
    defaultAudioTrackId: "orchestra-royal",
    buttonStyle: "embossed-royal",
    hubMode: "journey",
    countdownStyle: "gold-royal",
    sceneTransition: "curtain",
    heroLayout: "royal-palace",
    slideshowStyle: "ken-burns",
    pacing: "slow",
    slideDurationMs: 9000,
    typographyPackId: "luxury",
    backgroundPackId: "marble",
  },
  "midnight-velvet-reception": {
    collectionId: "editorial",
    openingExperience: "magazine-page-turn",
    outroExperience: "credits-page",
    defaultAudioCategory: "jazz",
    defaultAudioTrackId: "jazz-midnight",
    buttonStyle: "editorial-underline",
    hubMode: "storybook",
    countdownStyle: "luxury",
    sceneTransition: "book",
    heroLayout: "velvet-stage",
    slideshowStyle: "magazine",
    pacing: "slow",
    slideDurationMs: 8500,
    typographyPackId: "editorial",
    backgroundPackId: "velvet",
  },
  "kente-heritage-union": {
    collectionId: "african-heritage",
    openingExperience: "curtain-wedding",
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
  "traditional-marriage-ceremony": {
    collectionId: "african-heritage",
    openingExperience: "envelope-embroidered",
    outroExperience: "golden-sparkles",
    defaultAudioCategory: "african",
    defaultAudioTrackId: "layout-traditional-marriage-ceremony",
    buttonStyle: "editorial-underline",
    hubMode: "storybook",
    countdownStyle: "linen",
    sceneTransition: "sparkle",
    heroLayout: "garden-bloom",
    slideshowStyle: "magazine-collage",
    pacing: "medium",
    slideDurationMs: 8000,
    typographyPackId: "traditional",
  },
  "floral-garden-romance": {
    collectionId: "garden",
    openingExperience: "flower-bloom",
    outroExperience: "rose-petals",
    defaultAudioCategory: "piano",
    defaultAudioTrackId: "piano-garden",
    buttonStyle: "floral-edge",
    hubMode: "scroll",
    countdownStyle: "ring",
    sceneTransition: "sparkle",
    heroLayout: "garden-bloom",
    slideshowStyle: "floating-cards",
    pacing: "slow",
    slideDurationMs: 8000,
    typographyPackId: "romantic",
    backgroundPackId: "floating-flowers",
  },
  "passport-destination-wedding": {
    collectionId: "destination",
    openingExperience: "flip-reveal",
    outroExperience: "see-you-soon",
    defaultAudioCategory: "instrumentals",
    defaultAudioTrackId: "travel-wanderlust",
    buttonStyle: "passport-stamp",
    hubMode: "journey",
    countdownStyle: "circular",
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
    defaultAudioTrackId: "strings-garden",
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
    openingExperience: "candle-light",
    outroExperience: "candle-legacy",
    defaultAudioCategory: "funeral",
    defaultAudioTrackId: "memorial-piano",
    buttonStyle: "solemn",
    hubMode: "scroll",
    countdownStyle: "minimal",
    sceneTransition: "fade",
    heroLayout: "memorial-candle",
    slideshowStyle: "film-strip",
    pacing: "slow",
    slideDurationMs: 10000,
    typographyPackId: "funeral",
    backgroundPackId: "stone",
  },
  "neon-celebration-party": {
    collectionId: "neon",
    openingExperience: "confetti-burst",
    outroExperience: "fireworks",
    defaultAudioCategory: "celebration",
    defaultAudioTrackId: "party-edm-energy",
    buttonStyle: "neon",
    hubMode: "scroll",
    countdownStyle: "flip",
    sceneTransition: "sparkle",
    heroLayout: "neon-pulse",
    slideshowStyle: "grid-reveal",
    pacing: "fast",
    slideDurationMs: 5000,
  },
  "corporate-prestige-summit": {
    collectionId: "corporate",
    openingExperience: "curtain-corporate",
    outroExperience: "see-you-soon",
    defaultAudioCategory: "corporate",
    defaultAudioTrackId: "corporate-summit",
    buttonStyle: "corporate-solid",
    hubMode: "tabs",
    countdownStyle: "glass",
    sceneTransition: "slide",
    heroLayout: "corporate-grid",
    slideshowStyle: "magazine",
    pacing: "medium",
    slideDurationMs: 6500,
    typographyPackId: "corporate",
    backgroundPackId: "static",
  },
};

export function getTemplateExperienceDNA(layout: InvitationLayoutSlug | string): TemplateExperienceDNA {
  const base = DNA[layout as InvitationLayoutSlug] ?? DNA["classic-gold"];
  const music = getLayoutMusicProfile(layout);
  return {
    ...base,
    defaultAudioTrackId: music.trackId,
    defaultAudioCategory: music.category,
  };
}

export function buildExperienceConfigFromDNA(
  dna: TemplateExperienceDNA,
  layout?: string
): EventExperienceConfig {
  const layoutTabs = layout ? getLayoutEnabledTabs(layout) : undefined;
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
    // Embroidered TM: template music only — no wax-crack / pop SFX on open.
    enableRevealSounds: dna.openingExperience !== "envelope-embroidered",
    enabledTabs: layoutTabs ?? DEFAULT_HUB_TABS,
  };
}

/** Merge V2 DNA into a design config — DNA is authoritative for template identity fields. */
export function enrichDesignWithExperienceDNA(design: InvitationDesignConfig): InvitationDesignConfig {
  const dna = getTemplateExperienceDNA(design.layout);
  const dnaExperience = buildExperienceConfigFromDNA(dna, design.layout);
  const visual = COLLECTION_VISUAL_DNA[dna.collectionId];
  const typographyPack = getTypographyPack(
    (design.experience?.typographyPackId as TypographyCategoryId | undefined) ??
      dna.typographyPackId ??
      visual?.typography ??
      "classic"
  );
  const backgroundPack = getBackgroundPack(
    (design.experience?.backgroundPackId as BackgroundTypeId | undefined) ??
      dna.backgroundPackId ??
      visual?.background ??
      "static"
  );

  const studio = {
    ...design.studio,
    buttonStyle: design.studio?.buttonStyle ?? dna.buttonStyle,
    revealMode: design.studio?.revealMode,
    fullScreen: design.studio?.fullScreen ?? true,
  };

  const userExp = design.experience ?? {};
  const userPageBg = design.media?.some((m) => m.role === "background");
  const preserveUserColors = userExp.experienceCustomized === true || userPageBg;

  return {
    ...design,
    fonts: typographyPack && !userExp.experienceCustomized
      ? {
          heading: typographyPack.heading,
          script: typographyPack.script,
          body: typographyPack.body,
        }
      : design.fonts,
    colors: backgroundPack && !preserveUserColors
      ? { ...design.colors, background: backgroundPack.preview }
      : design.colors,
    studio,
    experience: {
      ...dnaExperience,
      introEnabled: userExp.introEnabled ?? dnaExperience.introEnabled,
      introDurationSec: userExp.introDurationSec ?? dnaExperience.introDurationSec,
      introVariant: userExp.introVariant ?? dnaExperience.introVariant,
      enabledTabs: userExp.enabledTabs ?? dnaExperience.enabledTabs,
      environment: userExp.environment,
      environmentIntensity: userExp.environmentIntensity,
      scheduleItems: userExp.scheduleItems,
      journeyChapters: userExp.journeyChapters,
      themePresetId: userExp.themePresetId,
      thankYouMessage: userExp.thankYouMessage,
      thankYouFontFamily: userExp.thankYouFontFamily,
      thankYouEyebrowFontFamily: userExp.thankYouEyebrowFontFamily,
      thankYouScriptFontFamily: userExp.thankYouScriptFontFamily,
      typographyPackId: userExp.typographyPackId ?? typographyPack?.id,
      backgroundPackId: userExp.backgroundPackId ?? backgroundPack?.id,
      openingExperience: userExp.openingExperience ?? dnaExperience.openingExperience,
      outroExperience: userExp.outroExperience ?? dnaExperience.outroExperience,
      countdownStyle: userExp.countdownStyle ?? dnaExperience.countdownStyle,
      sceneTransition: userExp.sceneTransition ?? dnaExperience.sceneTransition,
      heroLayout: userExp.heroLayout ?? dnaExperience.heroLayout,
      slideshowStyle: userExp.slideshowStyle ?? dnaExperience.slideshowStyle,
      hubMode: userExp.hubMode ?? dnaExperience.hubMode,
      pacing: userExp.pacing ?? dnaExperience.pacing,
      defaultAudioCategory: userExp.defaultAudioCategory ?? dnaExperience.defaultAudioCategory,
      defaultAudioTrackId: userExp.defaultAudioTrackId ?? dnaExperience.defaultAudioTrackId,
      collectionId: userExp.collectionId ?? dnaExperience.collectionId,
      enableRevealSounds: userExp.enableRevealSounds ?? dnaExperience.enableRevealSounds,
    },
  };
}

export function getExperienceCollectionsList() {
  return Object.entries(EXPERIENCE_COLLECTIONS).map(([id, meta]) => ({
    id: id as ExperienceCollectionId,
    ...meta,
  }));
}

/** Map experience-engine slideshow ids to gallery component styles.
 * Gallery IDs from catalog overrides pass through unchanged. */
export function mapExperienceSlideshowStyle(id?: string): GallerySlideshowStyleId {
  const galleryIds = new Set<GallerySlideshowStyleId>([
    "classic-slideshow",
    "fade-carousel",
    "swipe-story",
    "polaroid-stack",
    "luxury-frame",
    "floating-memories",
    "fullscreen-video",
    "magazine-collage",
    "split-media",
    "timeline-gallery",
  ]);
  if (id && galleryIds.has(id as GallerySlideshowStyleId)) {
    return id as GallerySlideshowStyleId;
  }
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
