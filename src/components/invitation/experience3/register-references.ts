"use client";

/**
 * Side-effect registration for Experience 3.0 layouts.
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
import {
  IX3_BABY_SHOWER,
  IX3_BIRTHDAY_CELEBRATION,
  IX3_CONCERT_NIGHT,
  IX3_CORPORATE_GALA,
  IX3_GRADUATION,
  IX3_HERITAGE_MARRIAGE,
} from "@/lib/invitation/studio3/expanded-definitions";

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

const Ix3HeritageMarriageTemplate = dynamic(() =>
  import("@/components/invitation/experience3/ix3-heritage-marriage").then(
    (mod) => mod.Ix3HeritageMarriageTemplate
  )
);

const Ix3BirthdayCelebrationTemplate = dynamic(() =>
  import("@/components/invitation/experience3/ix3-birthday-celebration").then(
    (mod) => mod.Ix3BirthdayCelebrationTemplate
  )
);

const Ix3CorporateGalaTemplate = dynamic(() =>
  import("@/components/invitation/experience3/ix3-corporate-gala").then(
    (mod) => mod.Ix3CorporateGalaTemplate
  )
);

const Ix3ConcertNightTemplate = dynamic(() =>
  import("@/components/invitation/experience3/ix3-concert-night").then(
    (mod) => mod.Ix3ConcertNightTemplate
  )
);

const Ix3GraduationTemplate = dynamic(() =>
  import("@/components/invitation/experience3/ix3-graduation").then(
    (mod) => mod.Ix3GraduationTemplate
  )
);

const Ix3BabyShowerTemplate = dynamic(() =>
  import("@/components/invitation/experience3/ix3-baby-shower").then(
    (mod) => mod.Ix3BabyShowerTemplate
  )
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
  registerExperience3Layout(IX3_MEMORIAL.layout, IX3_MEMORIAL.layoutVersion, Ix3MemorialTemplate);
  registerExperience3Layout(
    IX3_HERITAGE_MARRIAGE.layout,
    IX3_HERITAGE_MARRIAGE.layoutVersion,
    Ix3HeritageMarriageTemplate
  );
  registerExperience3Layout(
    IX3_BIRTHDAY_CELEBRATION.layout,
    IX3_BIRTHDAY_CELEBRATION.layoutVersion,
    Ix3BirthdayCelebrationTemplate
  );
  registerExperience3Layout(
    IX3_CORPORATE_GALA.layout,
    IX3_CORPORATE_GALA.layoutVersion,
    Ix3CorporateGalaTemplate
  );
  registerExperience3Layout(
    IX3_CONCERT_NIGHT.layout,
    IX3_CONCERT_NIGHT.layoutVersion,
    Ix3ConcertNightTemplate
  );
  registerExperience3Layout(
    IX3_GRADUATION.layout,
    IX3_GRADUATION.layoutVersion,
    Ix3GraduationTemplate
  );
  registerExperience3Layout(
    IX3_BABY_SHOWER.layout,
    IX3_BABY_SHOWER.layoutVersion,
    Ix3BabyShowerTemplate
  );
}

ensureExperience3ReferencesRegistered();
