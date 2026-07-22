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
import { PressHoldReveal } from "@/components/invitation-os/reveal/press-hold-reveal";
import { MagazinePageTurnReveal } from "@/components/invitation-os/reveal/magazine-page-turn-reveal";
import { CandleLightReveal } from "@/components/invitation-os/reveal/candle-light-reveal";
import { SatinBowReveal } from "@/components/invitation-os/reveal/satin-bow-reveal";
import { RingBoxReveal } from "@/components/invitation-os/reveal/ring-box-reveal";
import { ArchwayReveal } from "@/components/invitation-os/reveal/archway-reveal";
import { PetalFallReveal } from "@/components/invitation-os/reveal/petal-fall-reveal";
import { ReducedMotionGate, RevealKeyboardFallback } from "@/components/experience/reveal-accessibility";
import { useReducedMotion } from "framer-motion";
import { useState } from "react";

interface OpeningExperienceRouterProps {
  experienceId: OpeningExperienceId;
  guestName?: string;
  eventTitle: string;
  hostName?: string;
  musicEnabled?: boolean;
  enableSounds?: boolean;
  onComplete: () => void;
  /** Fires on the reveal start gesture (e.g. curtain tap) for audio unlock. */
  onBegin?: () => void;
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
  onBegin,
  children,
}: OpeningExperienceRouterProps) {
  const [revealed, setRevealed] = useState(false);
  const reducedMotion = useReducedMotion();
  const isCurtain = experienceId.startsWith("curtain-");

  function complete() {
    setRevealed(true);
    onComplete();
  }

  if (experienceId === "none" || revealed) {
    return <div className="inv-portal-enter">{children}</div>;
  }

  // Curtain ceremonies handle reduced-motion internally (short open / fade + tap).
  // All other ceremonies collapse to a static keyboard-first gate.
  if (reducedMotion && !isCurtain) {
    return <ReducedMotionGate eventTitle={eventTitle} guestName={guestName} onComplete={complete} />;
  }

  if (isEnvelopeExperience(experienceId)) {
    const meta = getOpeningExperience(experienceId);
    const theme = meta?.envelopeTheme;
    if (!theme) {
      // Unknown envelope variant — open directly rather than blank-screening.
      return <div className="inv-portal-enter">{children}</div>;
    }
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

  if (experienceId === "archway") {
    return (
      <>
        <ArchwayReveal
          guestName={guestName}
          eventTitle={eventTitle}
          hostName={hostName}
          onComplete={complete}
        />
        <RevealKeyboardFallback onComplete={complete} />
      </>
    );
  }

  if (isCurtain) {
    return (
      <CurtainReveal
        eventTitle={eventTitle}
        guestName={guestName}
        theme={CURTAIN_THEME_MAP[experienceId] ?? "wedding"}
        onBegin={onBegin}
        onComplete={complete}
      >
        {children}
      </CurtainReveal>
    );
  }

  switch (experienceId) {
    case "scratch":
      return (
        <>
          <ScratchReveal guestName={guestName} eventTitle={eventTitle} onComplete={complete}>
            {children}
          </ScratchReveal>
          <RevealKeyboardFallback onComplete={complete} />
        </>
      );
    case "passport":
      return <PassportReveal guestName={guestName} eventTitle={eventTitle} hostName={hostName} onComplete={complete} />;
    case "glass":
      return (
        <>
          <GlassReveal guestName={guestName} eventTitle={eventTitle} onComplete={complete} />
          <RevealKeyboardFallback onComplete={complete} />
        </>
      );
    case "scroll-unroll":
      return (
        <ScrollUnrollReveal guestName={guestName} eventTitle={eventTitle} hostName={hostName} onComplete={complete} />
      );
    case "swipe-reveal":
      return (
        <>
          <SwipeReveal guestName={guestName} eventTitle={eventTitle} onComplete={complete} />
          <RevealKeyboardFallback onComplete={complete} />
        </>
      );
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
    case "press-hold":
      return <PressHoldReveal guestName={guestName} eventTitle={eventTitle} onComplete={complete} />;
    case "magazine-page-turn":
      return (
        <MagazinePageTurnReveal
          guestName={guestName}
          eventTitle={eventTitle}
          hostName={hostName}
          onComplete={complete}
        />
      );
    case "candle-light":
      return (
        <CandleLightReveal
          guestName={guestName}
          eventTitle={eventTitle}
          hostName={hostName}
          onComplete={complete}
        />
      );
    case "satin-bow":
      return (
        <>
          <SatinBowReveal guestName={guestName} eventTitle={eventTitle} onComplete={complete} />
          <RevealKeyboardFallback onComplete={complete} />
        </>
      );
    case "ring-box":
      return (
        <>
          <RingBoxReveal guestName={guestName} eventTitle={eventTitle} onComplete={complete} />
          <RevealKeyboardFallback onComplete={complete} />
        </>
      );
    case "petal-fall":
      return (
        <>
          <PetalFallReveal guestName={guestName} eventTitle={eventTitle} onComplete={complete} />
          <RevealKeyboardFallback onComplete={complete} />
        </>
      );
    default:
      // Unknown/future experience id: never blank-screen the guest —
      // degrade to opening the invitation directly.
      return <div className="inv-portal-enter">{children}</div>;
  }
}
