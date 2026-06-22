"use client";

import type { OpeningExperienceId } from "@/lib/experience/experience-types";
import {
  getOpeningExperience,
  isEnvelopeExperience,
} from "@/lib/experience/opening-experiences";
import { EnvelopeCollectionReveal } from "@/components/experience/envelope-collection-reveal";
import { PalaceEntranceReveal } from "@/components/experience/palace-entrance-reveal";
import { ScratchReveal } from "@/components/invitation-os/reveal/scratch-reveal";
import { PassportReveal } from "@/components/invitation-os/reveal/passport-reveal";
import { GlassReveal } from "@/components/invitation-os/reveal/glass-reveal";
import { CurtainReveal } from "@/components/invitation-os/reveal/curtain-reveal";
import { ScrollUnrollReveal } from "@/components/invitation-os/reveal/scroll-unroll-reveal";
import { useState } from "react";

interface OpeningExperienceRouterProps {
  experienceId: OpeningExperienceId;
  guestName?: string;
  eventTitle: string;
  hostName?: string;
  musicEnabled?: boolean;
  enableSounds?: boolean;
  onComplete: () => void;
  children: React.ReactNode;
}

const CURTAIN_THEME_MAP: Record<string, "wedding" | "concert" | "award" | "birthday" | "corporate"> = {
  "curtain-wedding": "wedding",
  "curtain-concert": "concert",
  "curtain-award": "award",
  "curtain-birthday": "birthday",
  "curtain-corporate": "corporate",
};

export function OpeningExperienceRouter({
  experienceId,
  guestName,
  eventTitle,
  hostName,
  musicEnabled,
  enableSounds,
  onComplete,
  children,
}: OpeningExperienceRouterProps) {
  const [revealed, setRevealed] = useState(false);

  function complete() {
    setRevealed(true);
    onComplete();
  }

  if (experienceId === "none" || revealed) {
    return <div className="inv-portal-enter">{children}</div>;
  }

  if (isEnvelopeExperience(experienceId)) {
    const meta = getOpeningExperience(experienceId);
    const theme = meta?.envelopeTheme;
    if (!theme) return null;
    return (
      <EnvelopeCollectionReveal
        theme={theme}
        guestName={guestName}
        eventTitle={eventTitle}
        hostName={hostName}
        musicEnabled={musicEnabled}
        enableSounds={enableSounds}
        onComplete={complete}
      />
    );
  }

  if (experienceId === "palace-entrance") {
    return (
      <PalaceEntranceReveal
        guestName={guestName}
        eventTitle={eventTitle}
        hostName={hostName}
        onComplete={complete}
      />
    );
  }

  if (experienceId.startsWith("curtain-")) {
    return (
      <CurtainReveal
        eventTitle={eventTitle}
        theme={CURTAIN_THEME_MAP[experienceId] ?? "wedding"}
        onComplete={complete}
      />
    );
  }

  switch (experienceId) {
    case "scratch":
      return <ScratchReveal guestName={guestName} eventTitle={eventTitle} onComplete={complete} />;
    case "passport":
      return <PassportReveal guestName={guestName} eventTitle={eventTitle} hostName={hostName} onComplete={complete} />;
    case "glass":
      return <GlassReveal guestName={guestName} eventTitle={eventTitle} onComplete={complete} />;
    case "scroll-unroll":
      return (
        <ScrollUnrollReveal guestName={guestName} eventTitle={eventTitle} hostName={hostName} onComplete={complete} />
      );
    default:
      return null;
  }
}
