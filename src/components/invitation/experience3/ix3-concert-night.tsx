"use client";

import { createIx3FamilyTemplate } from "@/components/invitation/experience3/ix3-family-template";
import { IX3_CONCERT_NIGHT } from "@/lib/invitation/studio3/expanded-definitions";

export const Ix3ConcertNightTemplate = createIx3FamilyTemplate({
  definition: IX3_CONCERT_NIGHT,
  tone: "dark",
  composition: "concert",
  kicker: "Live performance",
  welcomeEyebrow: "Admit one",
  welcomeLede: "Your ticket is waiting—see you on the floor.",
  note: "Immersive entertainment layout: black stage wash, cyan accent glow, cinematic open, and line-up-forward storytelling—not a wedding or gala clone.",
  scheduleHeading: "Set list & timing",
  showCountdown: true,
  countdownLabel: "Showtime",
});
