/**
 * Motion language profiles — romantic → futuristic.
 * Extends creative-registry MotionLanguage with timing/easing/stagger
 * plus media / button / camera / outro slots (Experience Engine Phase 2).
 * Compatibility: each language maps to an existing theme MotionProfileId.
 */
import type { MotionLanguage } from "@/lib/invitation/template-creative-registry";
import type { MotionLanguageTiming } from "@/lib/experience-engine/types";
import type { MotionProfileId } from "@/lib/invitation-theme/theme-types";

function slots(
  base: Omit<MotionLanguageTiming, "media" | "button" | "camera" | "outro">,
  extras?: Partial<Pick<MotionLanguageTiming, "media" | "button" | "camera" | "outro">>
): MotionLanguageTiming {
  return {
    ...base,
    media: extras?.media ?? {
      durationMs: Math.round(base.durationMs * 1.1),
      ease: base.ease,
      delayMs: base.staggerMs,
    },
    button: extras?.button ?? {
      durationMs: Math.min(360, Math.round(base.durationMs * 0.55)),
      ease: [0.34, 1.4, 0.64, 1],
      delayMs: 0,
    },
    camera: extras?.camera ?? {
      intensity: base.themeProfileId === "still" || base.themeProfileId === "solemn" ? 0 : 0.55,
      driftMs: base.durationMs * 8,
    },
    outro: extras?.outro ?? {
      durationMs: Math.round(base.durationMs * 1.15),
      ease: base.ease,
      delayMs: base.staggerMs,
    },
  };
}

export const EXPERIENCE_MOTION_LANGUAGES: Record<MotionLanguage, MotionLanguageTiming> = {
  romantic: slots({
    id: "romantic",
    durationMs: 700,
    staggerMs: 90,
    ease: [0.22, 1, 0.36, 1],
    entrance: { y: 28, opacity: 0, scale: 0.98 },
    exit: { y: -12, opacity: 0 },
    themeProfileId: "gentle-drift",
  }),
  regal: slots(
    {
      id: "regal",
      durationMs: 900,
      staggerMs: 120,
      ease: [0.16, 1, 0.3, 1],
      entrance: { y: 36, opacity: 0, scale: 0.96 },
      exit: { y: 20, opacity: 0, scale: 0.98 },
      themeProfileId: "layered-drift",
    },
    { camera: { intensity: 0.7, driftMs: 9000 }, outro: { durationMs: 1100, ease: [0.16, 1, 0.3, 1] } }
  ),
  editorial: slots({
    id: "editorial",
    durationMs: 550,
    staggerMs: 70,
    ease: [0.25, 0.1, 0.25, 1],
    entrance: { y: 40, opacity: 0 },
    exit: { y: -24, opacity: 0 },
    themeProfileId: "gentle-drift",
  }),
  cinematic: slots(
    {
      id: "cinematic",
      durationMs: 850,
      staggerMs: 100,
      ease: [0.22, 1, 0.36, 1],
      entrance: { y: 48, opacity: 0, scale: 1.04 },
      exit: { scale: 1.08, opacity: 0 },
      themeProfileId: "layered-drift",
    },
    { camera: { intensity: 1, driftMs: 10000 }, media: { durationMs: 1000, ease: [0.22, 1, 0.36, 1], delayMs: 80 } }
  ),
  playful: slots({
    id: "playful",
    durationMs: 480,
    staggerMs: 55,
    ease: [0.34, 1.56, 0.64, 1],
    entrance: { y: 20, opacity: 0, scale: 0.88, rotate: -3 },
    exit: { y: -16, opacity: 0, scale: 1.06, rotate: 2 },
    themeProfileId: "gentle-drift",
  }),
  solemn: slots(
    {
      id: "solemn",
      durationMs: 1000,
      staggerMs: 140,
      ease: "easeInOut",
      entrance: { opacity: 0 },
      exit: { opacity: 0 },
      themeProfileId: "solemn",
    },
    {
      button: { durationMs: 500, ease: "easeInOut" },
      camera: { intensity: 0, driftMs: 0 },
      outro: { durationMs: 1200, ease: "easeInOut" },
    }
  ),
  corporate: slots({
    id: "corporate",
    durationMs: 420,
    staggerMs: 48,
    ease: [0.4, 0, 0.2, 1],
    entrance: { y: 16, opacity: 0 },
    exit: { y: -8, opacity: 0 },
    themeProfileId: "still",
  }),
  minimal: slots({
    id: "minimal",
    durationMs: 400,
    staggerMs: 40,
    ease: [0.33, 1, 0.68, 1],
    entrance: { opacity: 0, y: 12 },
    exit: { opacity: 0 },
    themeProfileId: "still",
  }),
  organic: slots({
    id: "organic",
    durationMs: 780,
    staggerMs: 95,
    ease: [0.37, 0, 0.63, 1],
    entrance: { y: 32, opacity: 0, scale: 0.97 },
    exit: { y: 18, opacity: 0 },
    themeProfileId: "gentle-drift",
  }),
  futuristic: slots(
    {
      id: "futuristic",
      durationMs: 520,
      staggerMs: 60,
      ease: [0.16, 1, 0.3, 1],
      entrance: { y: -24, opacity: 0, scale: 1.06 },
      exit: { y: 24, opacity: 0, scale: 0.94 },
      themeProfileId: "layered-drift",
    },
    { camera: { intensity: 0.85, driftMs: 7000 }, button: { durationMs: 280, ease: [0.16, 1, 0.3, 1] } }
  ),
  traditional: slots({
    id: "traditional",
    durationMs: 750,
    staggerMs: 100,
    ease: [0.22, 1, 0.36, 1],
    entrance: { y: 24, opacity: 0 },
    exit: { opacity: 0 },
    themeProfileId: "gentle-drift",
  }),
  energetic: slots({
    id: "energetic",
    durationMs: 380,
    staggerMs: 40,
    ease: [0.34, 1.4, 0.64, 1],
    entrance: { y: 18, opacity: 0, scale: 0.9 },
    exit: { y: -20, opacity: 0, scale: 1.05 },
    themeProfileId: "layered-drift",
  }),
  dreamlike: slots({
    id: "dreamlike",
    durationMs: 950,
    staggerMs: 110,
    ease: [0.45, 0.05, 0.55, 0.95],
    entrance: { y: 20, opacity: 0, scale: 1.03 },
    exit: { opacity: 0, scale: 1.08 },
    themeProfileId: "gentle-drift",
  }),
  luxurious: slots({
    id: "luxurious",
    durationMs: 880,
    staggerMs: 115,
    ease: [0.16, 1, 0.3, 1],
    entrance: { y: 30, opacity: 0, scale: 0.97 },
    exit: { y: 12, opacity: 0 },
    themeProfileId: "layered-drift",
  }),
};

export function getMotionLanguageProfile(
  id: MotionLanguage | string | undefined
): MotionLanguageTiming {
  if (id && id in EXPERIENCE_MOTION_LANGUAGES) {
    return EXPERIENCE_MOTION_LANGUAGES[id as MotionLanguage];
  }
  return EXPERIENCE_MOTION_LANGUAGES.cinematic;
}

export function motionLanguageToThemeProfile(
  id: MotionLanguage | string | undefined
): MotionProfileId {
  return getMotionLanguageProfile(id).themeProfileId;
}

/** Framer-motion friendly variants from a language profile. */
export function motionLanguageVariants(id: MotionLanguage | string | undefined) {
  const p = getMotionLanguageProfile(id);
  const duration = p.durationMs / 1000;
  const ease = p.ease;
  return {
    initial: { opacity: 0, ...p.entrance },
    animate: {
      opacity: 1,
      y: 0,
      x: 0,
      scale: 1,
      rotate: 0,
      transition: { duration, ease, staggerChildren: p.staggerMs / 1000 },
    },
    exit: {
      ...p.exit,
      opacity: p.exit.opacity ?? 0,
      transition: { duration: duration * 0.75, ease },
    },
    media: {
      initial: { opacity: 0, scale: 1.02 },
      animate: {
        opacity: 1,
        scale: 1,
        transition: {
          duration: p.media.durationMs / 1000,
          ease: p.media.ease ?? ease,
          delay: (p.media.delayMs ?? 0) / 1000,
        },
      },
    },
    button: {
      initial: { opacity: 0, scale: 0.94 },
      animate: {
        opacity: 1,
        scale: 1,
        transition: {
          duration: p.button.durationMs / 1000,
          ease: p.button.ease ?? ease,
          delay: (p.button.delayMs ?? 0) / 1000,
        },
      },
    },
    outro: {
      initial: { opacity: 0 },
      animate: {
        opacity: 1,
        transition: {
          duration: p.outro.durationMs / 1000,
          ease: p.outro.ease ?? ease,
          delay: (p.outro.delayMs ?? 0) / 1000,
        },
      },
    },
  };
}

export function listMotionLanguageIds(): MotionLanguage[] {
  return Object.keys(EXPERIENCE_MOTION_LANGUAGES) as MotionLanguage[];
}

/** Ten core Experience Engine motion languages required by the Phase 2 brief. */
export const CORE_MOTION_LANGUAGES = [
  "romantic",
  "regal",
  "editorial",
  "cinematic",
  "playful",
  "solemn",
  "corporate",
  "minimal",
  "organic",
  "futuristic",
] as const satisfies readonly MotionLanguage[];
