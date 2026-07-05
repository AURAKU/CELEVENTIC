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
import { SwipeReveal } from "@/components/invitation-os/reveal/swipe-reveal";
import { PopReveal } from "@/components/invitation-os/reveal/pop-reveal";
import { GiftBoxReveal } from "@/components/invitation-os/reveal/gift-box-reveal";
import { LightBeamReveal } from "@/components/invitation-os/reveal/light-beam-reveal";
import { FilmCountdownReveal } from "@/components/invitation-os/reveal/film-countdown-reveal";
import { LetterUnfoldReveal } from "@/components/invitation-os/reveal/letter-unfold-reveal";
import { FlowerBloomReveal } from "@/components/invitation-os/reveal/flower-bloom-reveal";
import { ConfettiBurstReveal } from "@/components/invitation-os/reveal/confetti-burst-reveal";
import { FlipReveal } from "@/components/invitation-os/reveal/flip-reveal";
import { ZoomReveal } from "@/components/invitation-os/reveal/zoom-reveal";
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
      return (
        <ScratchReveal guestName={guestName} eventTitle={eventTitle} onComplete={complete}>
          {children}
        </ScratchReveal>
      );
    case "passport":
      return <PassportReveal guestName={guestName} eventTitle={eventTitle} hostName={hostName} onComplete={complete} />;
    case "glass":
      return <GlassReveal guestName={guestName} eventTitle={eventTitle} onComplete={complete} />;
    case "scroll-unroll":
      return (
        <ScrollUnrollReveal guestName={guestName} eventTitle={eventTitle} hostName={hostName} onComplete={complete} />
      );
    case "swipe-reveal":
      return <SwipeReveal guestName={guestName} eventTitle={eventTitle} onComplete={complete} />;
    case "pop-reveal":
      return <PopReveal guestName={guestName} eventTitle={eventTitle} onComplete={complete} />;
    case "gift-box":
      return <GiftBoxReveal guestName={guestName} eventTitle={eventTitle} onComplete={complete} />;
    case "light-beam":
      return <LightBeamReveal guestName={guestName} eventTitle={eventTitle} onComplete={complete} />;
    case "film-countdown":
      return <FilmCountdownReveal guestName={guestName} eventTitle={eventTitle} onComplete={complete} />;
    case "letter-unfold":
      return <LetterUnfoldReveal guestName={guestName} eventTitle={eventTitle} hostName={hostName} onComplete={complete} />;
    case "flower-bloom":
      return <FlowerBloomReveal guestName={guestName} eventTitle={eventTitle} onComplete={complete} />;
    case "confetti-burst":
      return <ConfettiBurstReveal guestName={guestName} eventTitle={eventTitle} onComplete={complete} />;
    case "flip-reveal":
      return <FlipReveal guestName={guestName} eventTitle={eventTitle} onComplete={complete} />;
    case "zoom-reveal":
      return <ZoomReveal guestName={guestName} eventTitle={eventTitle} onComplete={complete} />;
    default:
      return null;
  }
}
