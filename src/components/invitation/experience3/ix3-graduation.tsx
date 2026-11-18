"use client";

import { createIx3FamilyTemplate } from "@/components/invitation/experience3/ix3-family-template";
import { IX3_GRADUATION } from "@/lib/invitation/studio3/expanded-definitions";

export const Ix3GraduationTemplate = createIx3FamilyTemplate({
  definition: IX3_GRADUATION,
  tone: "light",
  composition: "academic",
  kicker: "Commencement invitation",
  welcomeEyebrow: "Honored guest",
  welcomeLede: "Join us as we celebrate this achievement.",
  note: "Academic prestige: parchment field, blue academic accent, portrait opening, and ceremony-first schedule—separate creative DNA from celebration and wedding families.",
  scheduleHeading: "Ceremony order",
  showCountdown: true,
  countdownLabel: "Until commencement",
});
