/**
 * Experience Engine — shared contracts for Phase 2 foundation.
 * Thin types that compose existing DNA / creative registry / motion systems.
 */
import type { OpeningExperienceId, OutroExperienceId, SceneTransitionId } from "@/lib/experience/experience-types";
import type { MotionLanguage, ParallaxIntensity, TemplateCreativeProfile } from "@/lib/invitation/template-creative-registry";
import type { InvitationActionKey } from "@/lib/invitation/guest-portal-actions";

export type ExperiencePhaseId = "intro" | "tap-to-begin" | "reveal" | "portal" | "outro";

export type RevealMechanicId =
  | "envelope"
  | "wax-seal"
  | "scratch"
  | "swipe"
  | "curtain"
  | "ribbon"
  | "gate"
  | "card-flip"
  | "paper-unfold"
  | "tap-to-bloom"
  | "press-hold"
  | "peel"
  | "photo-develop"
  | "passport"
  | "glass"
  | "palace"
  | "gift-box"
  | "light-beam"
  | "film-countdown"
  | "confetti-burst"
  | "zoom"
  | "pop"
  | "scroll-unroll"
  | "magazine-page-turn"
  | "candle-light"
  | "satin-bow"
  | "ring-box"
  | "archway"
  | "petal-fall"
  | "none";

export interface ExperienceSceneDef {
  id: string;
  label: string;
  /** Optional section anchor for scroll hubs */
  sectionId?: string;
  order: number;
}

export interface ExperienceSequenceDef {
  id: string;
  scenes: ExperienceSceneDef[];
  transition: SceneTransitionId;
  pacingMs: number;
}

export interface MotionSlotTiming {
  durationMs: number;
  ease?: number[] | string;
  delayMs?: number;
}

export interface MotionLanguageTiming {
  id: MotionLanguage;
  durationMs: number;
  staggerMs: number;
  ease: number[] | string;
  entrance: { y?: number; scale?: number; opacity?: number; rotate?: number };
  exit: { y?: number; scale?: number; opacity?: number; rotate?: number };
  /** Media (photos / video frames) entrance pacing */
  media: MotionSlotTiming;
  /** Primary CTA / button micro-interactions */
  button: MotionSlotTiming;
  /** Subtle camera / viewport drift feel (maps to parallax intensity bias) */
  camera: { intensity: number; driftMs: number };
  /** Outro / closing beat */
  outro: MotionSlotTiming;
  /** Maps onto existing theme MotionProfileId for DriftLayer / useParallax */
  themeProfileId: "still" | "gentle-drift" | "layered-drift" | "solemn";
}

export interface InteractiveRevealContract {
  mechanic: RevealMechanicId;
  openingExperience: OpeningExperienceId;
  supportsKeyboardFallback: boolean;
  supportsReducedMotion: boolean;
  gestureHint: string;
  keyboardLabel: string;
}

export interface ExperienceRuntimeFlags {
  isPreview: boolean;
  isEmbedded: boolean;
  reducedMotion: boolean;
  suppressSideEffects: boolean;
  audioEnabled: boolean;
}

export interface InvitationExperienceConfig {
  creative?: TemplateCreativeProfile | null;
  openingExperience: OpeningExperienceId;
  outroExperience: OutroExperienceId;
  motionLanguage: MotionLanguage;
  parallaxIntensity: ParallaxIntensity;
  transition: SceneTransitionId;
  sequence: ExperienceSequenceDef;
  primaryActions: InvitationActionKey[];
  flags: ExperienceRuntimeFlags;
}

export type { MotionLanguage, ParallaxIntensity, TemplateCreativeProfile };
