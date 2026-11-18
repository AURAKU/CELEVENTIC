"use client";

import { createIx3FamilyTemplate } from "@/components/invitation/experience3/ix3-family-template";
import { IX3_CORPORATE_GALA } from "@/lib/invitation/studio3/expanded-definitions";

export const Ix3CorporateGalaTemplate = createIx3FamilyTemplate({
  definition: IX3_CORPORATE_GALA,
  tone: "dark",
  composition: "gala",
  kicker: "Executive evening",
  welcomeEyebrow: "Guest of honour",
  welcomeLede: "Your seat is reserved for the gala.",
  note: "Executive editorial composition: navy field, gold accent, uppercase hierarchy, and a minimal open—distinct from the fashion/tech brand-launch reference.",
  scheduleHeading: "Evening programme",
  showCountdown: true,
  countdownLabel: "Doors open in",
});
