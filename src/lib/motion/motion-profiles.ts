import type { Transition } from "framer-motion";
import type { MotionProfileId } from "@/lib/invitation-theme/theme-types";

/**
 * Motion is a theme property delivered through one engineered system.
 * Hard constraint: only transform + opacity may animate — AllowedAnimatable
 * makes any other property a compile error.
 *
 * Experience Engine Phase 2 adds MotionLanguage profiles (romantic, regal, …)
 * in `@/lib/experience-engine/motion-language-profiles`. Those map onto these
 * theme profile ids via `motionLanguageToThemeProfile` — do not duplicate.
 */
export interface AllowedAnimatable {
  x?: number | string;
  y?: number | string;
  scale?: number;
  rotate?: number;
  opacity?: number;
  transition?: Transition;
}

export interface MotionSlotVariants {
  initial: AllowedAnimatable;
  animate: AllowedAnimatable;
}

export interface MotionProfileDef {
  id: MotionProfileId;
  /** Foreground entrance when a page scrolls into view (≤ 500ms, interruptible) */
  entrance: MotionSlotVariants;
  /** Ambient loop for decorative layers; null = no drift */
  drift: { y: number; durationSec: number } | null;
  /** Scroll-linked shift factors per layer; null = no parallax */
  parallax: { background: number; midground: number } | null;
}

export const MOTION_PROFILES: Record<MotionProfileId, MotionProfileDef> = {
  // No motion; entrance fades only. Free tier, funerals, low-tier devices, reduced motion.
  still: {
    id: "still",
    entrance: {
      initial: { opacity: 0 },
      animate: { opacity: 1, transition: { duration: 0.4, ease: "easeOut" } },
    },
    drift: null,
    parallax: null,
  },
  // Slow background drift, soft entrances. Premium default.
  "gentle-drift": {
    id: "gentle-drift",
    entrance: {
      initial: { opacity: 0, y: 24 },
      animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
    },
    drift: { y: 10, durationSec: 7 },
    parallax: { background: 0.25, midground: 0.45 },
  },
  // Full three-layer parallax with motif float. Premium weddings & celebrations.
  "layered-drift": {
    id: "layered-drift",
    entrance: {
      initial: { opacity: 0, y: 30 },
      animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
    },
    drift: { y: 14, durationSec: 6 },
    parallax: { background: 0.35, midground: 0.6 },
  },
  // Very slow fades, no float — motion that feels respectful, never playful.
  solemn: {
    id: "solemn",
    entrance: {
      initial: { opacity: 0 },
      animate: { opacity: 1, transition: { duration: 0.9, ease: "easeInOut" } },
    },
    drift: null,
    parallax: null,
  },
};

export function getMotionProfile(id: MotionProfileId | undefined): MotionProfileDef {
  return MOTION_PROFILES[id ?? "still"] ?? MOTION_PROFILES.still;
}

/**
 * Experience Engine bridge — language profiles live in motion-language-profiles.
 * Import from `@/lib/experience-engine` for MotionLanguage timing; this module
 * remains the theme MotionProfileId source of truth for DriftLayer / useParallax.
 */
export {
  getMotionLanguageProfile,
  motionLanguageToThemeProfile,
  motionLanguageVariants,
  listMotionLanguageIds,
  CORE_MOTION_LANGUAGES,
  EXPERIENCE_MOTION_LANGUAGES,
} from "@/lib/experience-engine/motion-language-profiles";
