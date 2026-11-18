"use client";

import { createIx3FamilyTemplate } from "@/components/invitation/experience3/ix3-family-template";
import { IX3_BIRTHDAY_CELEBRATION } from "@/lib/invitation/studio3/expanded-definitions";

export const Ix3BirthdayCelebrationTemplate = createIx3FamilyTemplate({
  definition: IX3_BIRTHDAY_CELEBRATION,
  tone: "dark",
  composition: "celebration",
  kicker: "You're invited to celebrate",
  welcomeEyebrow: "Party pass",
  welcomeLede: "Save the night — we can't wait to see you.",
  note: "Contemporary birthday energy: violet night palette, crisp sans typography, and a classic reveal—built for milestone celebrations, not corporate decks.",
  scheduleHeading: "Celebration plan",
  showCountdown: true,
  countdownLabel: "Party starts in",
});
