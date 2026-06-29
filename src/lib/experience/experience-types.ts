/** Opening ceremony — the invite is an experience before content loads */
export type OpeningExperienceId =
  | "envelope-classic"
  | "wax-seal-pink"
  | "wax-seal-gold"
  | "wax-seal-rose"
  | "wax-seal-silver"
  | "wax-seal-black"
  | "envelope-floral"
  | "envelope-royal"
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
  | "card-3d";

export type SlideshowStyleId =
  | "fade-carousel"
  | "magazine"
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

export type ExperienceHubMode = "tabs" | "scroll" | "journey" | "storybook";

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
  scheduleItems?: EventScheduleItem[];
  themePresetId?: string;
  collectionId?: string;
  defaultAudioCategory?: string;
  defaultAudioTrackId?: string;
  thankYouMessage?: string;
  /** Gallery / media display style in guest invitation */
  slideshowStyle?: SlideshowStyleId | string;
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
