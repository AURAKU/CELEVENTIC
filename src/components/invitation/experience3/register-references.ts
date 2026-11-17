"use client";

/**
 * Side-effect registration for Experience 3.0 reference layouts.
 * Templates are dynamically imported so legacy v1 invites do not pay the ix3 bundle cost
 * until an Experience 3.0 layout is actually rendered.
 */
import dynamic from "next/dynamic";
import { registerExperience3Layout } from "@/lib/invitation/studio3/experience-registry";
import {
  IX3_BRAND_LAUNCH,
  IX3_EDITORIAL_WEDDING,
  IX3_MEMORIAL,
} from "@/lib/invitation/studio3/reference-definitions";

const Ix3EditorialWeddingTemplate = dynamic(() =>
  import("@/components/invitation/experience3/ix3-editorial-wedding").then(
    (mod) => mod.Ix3EditorialWeddingTemplate
  )
);

const Ix3BrandLaunchTemplate = dynamic(() =>
  import("@/components/invitation/experience3/ix3-brand-launch").then(
    (mod) => mod.Ix3BrandLaunchTemplate
  )
);

const Ix3MemorialTemplate = dynamic(() =>
  import("@/components/invitation/experience3/ix3-memorial").then((mod) => mod.Ix3MemorialTemplate)
);

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
