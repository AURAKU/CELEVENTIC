"use client";

import { createIx3FamilyTemplate } from "@/components/invitation/experience3/ix3-family-template";
import { IX3_BABY_SHOWER } from "@/lib/invitation/studio3/expanded-definitions";

export const Ix3BabyShowerTemplate = createIx3FamilyTemplate({
  definition: IX3_BABY_SHOWER,
  tone: "light",
  composition: "shower",
  kicker: "A soft gathering",
  welcomeEyebrow: "Dear guest",
  welcomeLede: "Please join us for a gentle celebration.",
  note: "Modern minimalist shower: rounded surfaces, soft blush accent, quiet motion, and warm serif body—never a recycled wedding hero with pastel swaps.",
  scheduleHeading: "Shower schedule",
  showCountdown: false,
});
