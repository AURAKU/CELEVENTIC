/**
 * Admin creative overrides — TS registry (no DB migration).
 * Session-scoped Map for admin assignment UI; permanent creative DNA stays in template-creative-registry.
 */
import type {
  ParallaxIntensity,
  MotionLanguage,
  TemplateCreativeProfile,
  UniquenessReport,
} from "@/lib/invitation/template-creative-registry";
import {
  getTemplateCreativeProfile,
  scoreTemplateUniqueness,
} from "@/lib/invitation/template-creative-registry";

export interface AdminCreativeOverride {
  catalogSlug: string;
  revealMechanic?: string;
  openingExperience?: string;
  motionProfile?: MotionLanguage;
  parallaxProfile?: ParallaxIntensity;
  typographySystem?: string;
  buttonFamily?: string;
  mediaPresentationStyle?: string;
  defaultAudioTrack?: string;
  compatibleAudioCategories?: string[];
  outroType?: string;
  sceneTransition?: string;
  notes?: string;
  updatedAt?: string;
}

const overrides = new Map<string, AdminCreativeOverride>();

export function listAdminCreativeOverrides(): AdminCreativeOverride[] {
  return Array.from(overrides.values());
}

export function getAdminCreativeOverride(slug: string): AdminCreativeOverride | undefined {
  return overrides.get(slug);
}

export function upsertAdminCreativeOverride(input: AdminCreativeOverride): AdminCreativeOverride {
  const prev = overrides.get(input.catalogSlug);
  const next: AdminCreativeOverride = {
    ...prev,
    ...input,
    catalogSlug: input.catalogSlug,
    updatedAt: new Date().toISOString(),
  };
  overrides.set(input.catalogSlug, next);
  return next;
}

export function clearAdminCreativeOverride(slug: string): boolean {
  return overrides.delete(slug);
}

export function resolveProfileWithAdminOverrides(
  catalogSlug: string
): TemplateCreativeProfile | null {
  const base = getTemplateCreativeProfile(catalogSlug);
  if (!base) return null;
  const o = overrides.get(catalogSlug);
  if (!o) return base;
  return {
    ...base,
    revealMechanic: o.revealMechanic ?? base.revealMechanic,
    openingExperience: o.openingExperience ?? base.openingExperience,
    motionProfile: o.motionProfile ?? base.motionProfile,
    parallaxProfile: o.parallaxProfile ?? base.parallaxProfile,
    typographySystem: o.typographySystem ?? base.typographySystem,
    buttonFamily: o.buttonFamily ?? base.buttonFamily,
    mediaPresentationStyle: o.mediaPresentationStyle ?? base.mediaPresentationStyle,
    defaultAudioTrack: o.defaultAudioTrack ?? base.defaultAudioTrack,
    compatibleAudioCategories: o.compatibleAudioCategories ?? base.compatibleAudioCategories,
    outroType: o.outroType ?? base.outroType,
    sceneTransition: o.sceneTransition ?? base.sceneTransition,
  };
}

/** Internal-only uniqueness score for admin UI. */
export function adminUniquenessForSlug(catalogSlug: string): UniquenessReport & {
  hasAdminOverride: boolean;
} {
  const report = scoreTemplateUniqueness(catalogSlug);
  return {
    ...report,
    hasAdminOverride: overrides.has(catalogSlug),
  };
}
