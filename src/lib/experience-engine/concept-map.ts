/**
 * Experience Engine concept map — documents Phase 2 vocabulary and where it lives.
 * Prefer importing implementations from `@/lib/experience-engine` / components barrel.
 */
export const EXPERIENCE_ENGINE_CONCEPT_MAP = {
  InvitationExperience: {
    module: "@/components/experience-engine/invitation-experience",
    role: "Thin orchestrator — reveal + sequence + viewport + error boundary",
  },
  ExperienceScene: {
    module: "@/components/experience-engine/experience-scene",
    role: "Single scene shell with error isolation",
  },
  ExperienceSequence: {
    module: "@/components/experience-engine/experience-sequence",
    role: "Ordered scene list from creative.sceneArchitecture",
  },
  SceneTransition: {
    module: "@/components/experience-engine/scene-transition",
    role: "Transition wrapper; ids from SceneTransitionId",
  },
  CeleventicSoftIntro: {
    module: "@/components/experience-engine/celeventic-soft-intro",
    role: "Cinematic platform soft launch (atmosphere + brand + event title) before DNA intro / reveal",
  },
  InteractiveReveal: {
    module: "@/components/experience-engine/interactive-reveal",
    role: "Contract + scroll lock over OpeningExperienceRouter",
  },
  ParallaxLayer: {
    module: "@/components/experience-engine/parallax-layer",
    role: "Scroll / pointer / orientation drivers; reduced-motion safe",
  },
  MotionProfile: {
    module: "@/lib/experience-engine/motion-language-profiles",
    role: "MotionLanguage timing (romantic…futuristic) → theme MotionProfileId",
  },
  AudioDirector: {
    module: "@/lib/experience-engine/audio-director",
    role: "Facade over invitation-audio-manager (select/play/fade/scene/outro)",
  },
  SoundEffectController: {
    module: "@/lib/experience-engine/sound-effect-controller",
    role: "Mechanic → SFX mapping over reveal-sounds",
  },
  ResponsiveSceneComposer: {
    module: "@/components/experience-engine/responsive-scene-composer",
    role: "100dvh/vw fullscreen composer via InviteViewportShell",
  },
  ActionRegistry: {
    module: "@/lib/experience-engine/action-registry",
    role: "Canonical + alias actions with preview/permission/data validation",
  },
  ExperienceOutro: {
    module: "@/components/experience-engine/experience-outro",
    role: "Closing beat from OutroExperienceId",
  },
  ReducedMotionRenderer: {
    module: "@/components/experience-engine/reduced-motion-renderer",
    role: "Static / keyboard-first reveal fallback",
  },
  TemplateCreativeProfile: {
    module: "@/lib/invitation/template-creative-registry",
    role: "Per-SKU creative universe metadata (31 catalogue profiles)",
  },
  LegacyAdapter: {
    module: "@/lib/experience-engine/legacy-adapters",
    role: "Maps studio reveal modes / labels / motion onto engine contracts",
  },
} as const;

export type ExperienceEngineConceptId = keyof typeof EXPERIENCE_ENGINE_CONCEPT_MAP;
