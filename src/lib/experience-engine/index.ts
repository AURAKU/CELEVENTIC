/**
 * Experience Engine — public barrel.
 * Prefer importing from here in Phase 2+ rather than reaching into internals.
 */

// Types & builders
export type {
  ExperiencePhaseId,
  RevealMechanicId,
  ExperienceSceneDef,
  ExperienceSequenceDef,
  MotionLanguageTiming,
  InteractiveRevealContract,
  ExperienceRuntimeFlags,
  InvitationExperienceConfig,
} from "@/lib/experience-engine/types";
export type { MotionLanguage, ParallaxIntensity, TemplateCreativeProfile } from "@/lib/experience-engine/types";

export { buildInvitationExperienceConfig } from "@/lib/experience-engine/build-invitation-experience";
export type { BuildInvitationExperienceInput } from "@/lib/experience-engine/build-invitation-experience";

export {
  buildExperienceSequence,
  parseSceneArchitecture,
  resolvePrimaryActions,
} from "@/lib/experience-engine/experience-sequence";

// Motion
export {
  EXPERIENCE_MOTION_LANGUAGES,
  getMotionLanguageProfile,
  motionLanguageToThemeProfile,
  motionLanguageVariants,
  listMotionLanguageIds,
  CORE_MOTION_LANGUAGES,
  /** Alias: MotionProfile in Experience Engine = motion language timing profile */
  getMotionLanguageProfile as getExperienceMotionProfile,
} from "@/lib/experience-engine/motion-language-profiles";

// Reveals
export {
  REVEAL_MECHANIC_CONTRACTS,
  getRevealContract,
  getRevealContractForOpening,
  revealMechanicFromOpening,
  listRevealMechanics,
} from "@/lib/experience-engine/interactive-reveal-contract";

// Actions
export {
  EXPERIENCE_ACTION_KEYS,
  ACTION_ALIASES,
  canonicalizeActionKey,
  validateExperienceAction,
  resolveExperienceActions,
  getActionLabel,
  STUDIO_BUTTON_ACTION_OPTIONS,
  studioButtonActionLabel,
} from "@/lib/experience-engine/action-registry";
export type {
  ExperienceActionKey,
  ActionValidationContext,
  ActionValidationResult,
  StudioMappedButtonActionId,
} from "@/lib/experience-engine/action-registry";

// Preview
export {
  isPreviewInvitationId,
  resolvePreviewMode,
  shouldSuppressGuestSideEffect,
} from "@/lib/experience-engine/preview-mode";
export type { PreviewModeInput, PreviewModeState } from "@/lib/experience-engine/preview-mode";

// Audio
export {
  createAudioDirector,
  stopAllExperienceAudio,
} from "@/lib/experience-engine/audio-director";
export type { AudioDirector, AudioDirectorOptions } from "@/lib/experience-engine/audio-director";

export {
  createSoundEffectController,
} from "@/lib/experience-engine/sound-effect-controller";
export type { SoundEffectController, SoundEffectId } from "@/lib/experience-engine/sound-effect-controller";

// Legacy adapters
export {
  adaptLegacyRevealMode,
  adaptLegacyRevealToMechanic,
  adaptThemeMotionToLanguage,
  adaptLanguageToThemeMotion,
  adaptSceneTransition,
  adaptLegacyActionLabel,
  adaptOpeningToRevealContract,
} from "@/lib/experience-engine/legacy-adapters";

// Reveal runtime (scroll lock / replay session)
export {
  lockRevealScroll,
  unlockRevealScroll,
  createRevealSession,
  markRevealActive,
  markRevealComplete,
  resetRevealForReplay,
  isRevealComplete,
} from "@/lib/experience-engine/reveal-runtime";
export type { RevealSession, RevealCompletionState } from "@/lib/experience-engine/reveal-runtime";

export {
  SOFT_INTRO_DURATION_MS,
  SOFT_INTRO_REDUCED_MOTION_MS,
  SOFT_INTRO_EXIT_MS,
  SOFT_INTRO_FALLBACK_MS,
  SOFT_INTRO_CTA,
  shouldShowSoftIntro,
  resolveInitialInvitePhase,
  phaseAfterSoftIntro,
  softIntroHoldMs,
  resolveSoftIntroAtmosphere,
} from "@/lib/experience-engine/soft-intro";
export type {
  InvitePipelinePhase,
  SoftIntroGateInput,
  SoftIntroAtmosphereInput,
} from "@/lib/experience-engine/soft-intro";

export { EXPERIENCE_ENGINE_CONCEPT_MAP } from "@/lib/experience-engine/concept-map";
export type { ExperienceEngineConceptId } from "@/lib/experience-engine/concept-map";

/** Re-export creative registry getters for a single import path. */
export {
  getTemplateCreativeProfile,
  listTemplateCreativeProfiles,
  getCreativeExperienceOverrides,
  scoreTemplateUniqueness,
  auditCreativeRegistryUniqueness,
} from "@/lib/invitation/template-creative-registry";

/** Re-export DNA helpers used by orchestrators. */
export {
  getTemplateExperienceDNA,
  enrichDesignWithExperienceDNA,
  buildExperienceConfigFromDNA,
} from "@/lib/experience/experience-engine-v2";
