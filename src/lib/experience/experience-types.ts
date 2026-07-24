/** Opening ceremony — the invite is an experience before content loads */
export type OpeningExperienceId =
  | "envelope-classic"
  | "wax-seal-pink"
  | "wax-seal-gold"
  | "wax-seal-rose"
  | "wax-seal-silver"
  | "wax-seal-black"
  | "wax-seal-emerald"
  | "envelope-floral"
  | "envelope-royal"
  | "envelope-embroidered"
  | "envelope-kente"
  | "envelope-islamic"
  | "curtain-wedding"
  | "curtain-concert"
  | "curtain-award"
  | "curtain-birthday"
  | "curtain-corporate"
  | "palace-entrance"
  | "scratch"
  | "passport"
  | "glass"
  | "scroll-unroll"
  | "swipe-reveal"
  | "pop-reveal"
  | "gift-box"
  | "light-beam"
  | "film-countdown"
  | "letter-unfold"
  | "flower-bloom"
  | "confetti-burst"
  | "flip-reveal"
  | "zoom-reveal"
  | "magazine-page-turn"
  | "candle-light"
  | "press-hold"
  | "satin-bow"
  | "ring-box"
  | "archway"
  | "petal-fall"
  | "none";

export type OutroExperienceId =
  | "thank-you-fade"
  | "fireworks"
  | "lanterns"
  | "butterflies"
  | "rose-petals"
  | "golden-sparkles"
  | "closing-curtain"
  | "memory-slideshow"
  | "final-quote"
  | "see-you-soon"
  | "upload-memories"
  | "seal-reform"
  | "credits-page"
  | "candle-legacy"
  | "none";

export type EnvironmentPresetId =
  | "none"
  | "spring-garden"
  | "royal-wedding"
  | "sunset-beach"
  | "floating-petals"
  | "fireflies"
  | "snow"
  | "stars"
  | "kente-gold"
  | "islamic-gold"
  | "lanterns"
  | "hearts"
  | "butterflies"
  | "confetti";

export type EnvironmentIntensity = "none" | "light" | "medium" | "heavy";

export type HubTabId =
  | "invitation"
  | "rsvp"
  | "story"
  | "countdown"
  | "venue"
  | "gallery"
  | "gifts"
  | "seating"
  | "menu"
  | "timeline"
  | "memory"
  | "livestream";

export type CountdownStyleId =
  | "classic"
  | "flip"
  | "luxury"
  | "ring"
  | "minimal"
  | "glass"
  | "gold-royal"
  | "circular"
  | "card-3d"
  | "linen";

export type SlideshowStyleId =
  | "fade-carousel"
  | "magazine"
  | "magazine-collage"
  | "polaroid"
  | "film-strip"
  | "floating-cards"
  | "grid-reveal"
  | "ken-burns"
  | "stacked-cards";

export type HeroLayoutId =
  | "classic-centered"
  | "editorial-split"
  | "magazine-stack"
  | "fullscreen-type"
  | "passport-stamp"
  | "neon-pulse"
  | "vine-arch"
  | "lace-frame"
  | "hexagon-stack"
  | "rings-spotlight"
  | "media-canvas"
  | "glass-frost"
  | "garden-card"
  | "royal-palace"
  | "velvet-stage"
  | "kente-weave"
  | "garden-bloom"
  | "boarding-pass"
  | "crystal-prism"
  | "islamic-arch"
  | "memorial-candle"
  | "corporate-grid";

export type ExperiencePacing = "slow" | "medium" | "fast";

export type SceneTransitionId =
  | "fade"
  | "slide"
  | "curtain"
  | "door"
  | "book"
  | "sparkle";

export type ExperienceHubMode = "tabs" | "scroll" | "journey" | "storybook" | "paged";

/** Branded Celeventic intro choreographies — same logo, different worlds */
export type IntroVariantId =
  | "engine-grid"
  | "logo-bloom"
  | "particle-burst"
  | "spotlight"
  | "ink-reveal"
  | "glass-shimmer"
  | "light-sweep"
  | "film-title"
  | "orbit"
  | "gold-foil"
  | "candlelight"
  | "constellation"
  | "fabric-unfold"
  // Phase 4 — additional SKU-keyed choreographies (distinct identity + tagline)
  | "seal-impress"
  | "petal-cascade"
  | "neon-pulse"
  | "marble-veil"
  | "drum-pulse"
  | "prism-refract"
  | "lace-draw"
  | "hex-assemble"
  | "quill-script"
  | "lily-breathe"
  | "drape-fall"
  | "canvas-wipe"
  | "aurora-rise"
  | "ticket-tear"
  | "ring-orbit"
  | "vine-grow"
  | "chapel-glow"
  | "folio-open"
  | "foil-rise";

export interface JourneyChapter {
  id: string;
  title: string;
  tabId: HubTabId;
  body?: string;
}

export interface EventScheduleItem {
  id?: string;
  time?: string;
  title: string;
  description?: string;
  location?: string;
}

/** Studio scene list entry — additive; legacy invites omit this and use enabledTabs */
export interface StudioSceneConfig {
  id: string;
  tabId: HubTabId | "custom";
  title: string;
  visible: boolean;
  body?: string;
}

export type StudioParallaxIntensity = "none" | "subtle" | "moderate" | "cinematic" | "interactive";

export type StudioButtonActionId =
  | "rsvp"
  | "calendar"
  | "maps"
  | "share"
  | "gifts"
  | "gallery"
  | "story"
  | "none";

export interface StudioButtonActions {
  primary?: StudioButtonActionId;
  secondary?: StudioButtonActionId;
  tertiary?: StudioButtonActionId;
}

export interface EventExperienceConfig {
  openingExperience?: OpeningExperienceId;
  outroExperience?: OutroExperienceId;
  environment?: EnvironmentPresetId;
  environmentIntensity?: EnvironmentIntensity;
  hubMode?: ExperienceHubMode;
  enabledTabs?: HubTabId[];
  journeyChapters?: JourneyChapter[];
  countdownStyle?: CountdownStyleId;
  sceneTransition?: SceneTransitionId;
  heroLayout?: HeroLayoutId;
  pacing?: ExperiencePacing;
  enableRevealSounds?: boolean;
  introEnabled?: boolean;
  introDurationSec?: 1.5 | 2 | 3 | 5;
  /** Branded intro choreography; defaults per template family when unset */
  introVariant?: IntroVariantId;
  scheduleItems?: EventScheduleItem[];
  themePresetId?: string;
  collectionId?: string;
  defaultAudioCategory?: string;
  defaultAudioTrackId?: string;
  thankYouMessage?: string;
  /** Body font for invite thank-you section (TM linen editorial + guests). FontId from invitation theme. */
  thankYouFontFamily?: string;
  /** Font family for the welcome / tap-to-begin gate text stack (brand, eyebrow, script, names, BEGIN). FontId from invitation theme; unset keeps each line's own template default. */
  welcomeFontFamily?: string;
  /** Overall text scale for the welcome / tap-to-begin gate — keeps proportions, nudges size. */
  welcomeFontScale?: "compact" | "cozy" | "spacious";
  /** Manual body/ivory text color override for the welcome gate. Unset keeps smart auto-contrast against the welcome photo. */
  welcomeTextColor?: string | null;
  /** Manual gold/script accent color override for the welcome gate. Unset keeps smart auto-contrast against the welcome photo. */
  welcomeAccentColor?: string | null;
  /** Gallery / media display style in guest invitation */
  slideshowStyle?: SlideshowStyleId | string;
  typographyPackId?: string;
  backgroundPackId?: string;
  /** When true, studio edits to experience fields are preserved on re-enrich */
  experienceCustomized?: boolean;
  /** Phase 5 — editable scene/section list (drives enabledTabs when present) */
  scenes?: StudioSceneConfig[];
  /** Phase 5 — parallax intensity override */
  parallaxIntensity?: StudioParallaxIntensity;
  /** Phase 5 — primary dock button action mapping */
  buttonActions?: StudioButtonActions;
  /** Phase 5 — layer stack order (background → foreground) */
  layerOrder?: string[];
  /** Phase 5 — hidden layer ids */
  hiddenLayers?: string[];
  /** Phase 5 — active snap guide for preview alignment */
  snapGuideId?: string;
}

export const DEFAULT_HUB_TABS: HubTabId[] = [
  "invitation",
  "countdown",
  "timeline",
  "story",
  "venue",
  "gallery",
  "rsvp",
  "seating",
  "gifts",
  "memory",
];

export const DEFAULT_JOURNEY: JourneyChapter[] = [
  { id: "open", title: "Your invitation", tabId: "invitation" },
  { id: "date", title: "Save the date", tabId: "countdown" },
  { id: "story", title: "Our story", tabId: "story" },
  { id: "venue", title: "Venue", tabId: "venue" },
  { id: "rsvp", title: "RSVP", tabId: "rsvp" },
  { id: "gallery", title: "Gallery", tabId: "gallery" },
];

export const STORYBOOK_JOURNEY: JourneyChapter[] = [
  { id: "ch1", title: "How We Met", tabId: "story", body: "Every great love has a beginning." },
  { id: "ch2", title: "The Proposal", tabId: "story", body: "A moment that changed everything." },
  { id: "ch3", title: "The Journey", tabId: "story", body: "Through seasons, we grew together." },
  { id: "ch4", title: "The Wedding Day", tabId: "invitation", body: "And now we invite you to celebrate with us." },
];

export const DEFAULT_SCHEDULE_SAMPLES: EventScheduleItem[] = [
  { id: "trad", time: "10:00 AM", title: "Traditional Wedding", description: "Family introductions and customs" },
  { id: "church", time: "2:00 PM", title: "Church Wedding", description: "Holy matrimony ceremony" },
  { id: "reception", time: "6:00 PM", title: "Reception", description: "Dinner, dancing, and celebration" },
];
