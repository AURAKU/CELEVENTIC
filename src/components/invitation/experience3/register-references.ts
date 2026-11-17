/**
 * Side-effect registration for Experience 3.0 reference layouts.
 * Import once from the invitation renderer. Does not touch legacy templates.
 */
import { registerExperience3Layout } from "@/lib/invitation/studio3/experience-registry";
import { Ix3EditorialWeddingTemplate } from "@/components/invitation/experience3/ix3-editorial-wedding";
import { Ix3BrandLaunchTemplate } from "@/components/invitation/experience3/ix3-brand-launch";
import { Ix3MemorialTemplate } from "@/components/invitation/experience3/ix3-memorial";
import {
  IX3_BRAND_LAUNCH,
  IX3_EDITORIAL_WEDDING,
  IX3_MEMORIAL,
} from "@/lib/invitation/studio3/reference-definitions";

/** Idempotent — safe after test registry resets. */
export function ensureExperience3ReferencesRegistered(): void {
  registerExperience3Layout(
    IX3_EDITORIAL_WEDDING.layout,
    IX3_EDITORIAL_WEDDING.layoutVersion,
    Ix3EditorialWeddingTemplate
  );
  registerExperience3Layout(
    IX3_BRAND_LAUNCH.layout,
    IX3_BRAND_LAUNCH.layoutVersion,
    Ix3BrandLaunchTemplate
  );
  registerExperience3Layout(
    IX3_MEMORIAL.layout,
    IX3_MEMORIAL.layoutVersion,
    Ix3MemorialTemplate
  );
}

ensureExperience3ReferencesRegistered();
