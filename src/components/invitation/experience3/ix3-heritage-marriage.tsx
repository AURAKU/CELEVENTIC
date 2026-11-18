"use client";

import { createIx3FamilyTemplate } from "@/components/invitation/experience3/ix3-family-template";
import { IX3_HERITAGE_MARRIAGE } from "@/lib/invitation/studio3/expanded-definitions";

export const Ix3HeritageMarriageTemplate = createIx3FamilyTemplate({
  definition: IX3_HERITAGE_MARRIAGE,
  tone: "light",
  composition: "heritage",
  kicker: "In the tradition of our families",
  welcomeEyebrow: "Blessed presence",
  welcomeLede: "Your blessing completes this ceremony.",
  note: "A heritage-luxury marriage invitation: warm parchment tones, ceremonial typography, and a composed envelope opening—distinct from the editorial wedding reference.",
  scheduleHeading: "Ceremony programme",
  showCountdown: true,
  countdownLabel: "Until the ceremony",
});
