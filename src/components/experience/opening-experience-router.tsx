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
import {
  BlushGateReveal,
  type BlushGateOpeningCopy,
} from "@/components/invitation-os/reveal/blush-gate-reveal";
import { ReducedMotionGate, RevealKeyboardFallback } from "@/components/experience/reveal-accessibility";
import { useReducedMotion } from "framer-motion";
import { useState } from "react";
import type { ResolvedSealStyle } from "@/lib/invitation/seal-design";

interface OpeningExperienceRouterProps {
  experienceId: OpeningExperienceId;
  guestName?: string;
  eventTitle: string;
  hostName?: string;
  musicEnabled?: boolean;
  enableSounds?: boolean;
  /** Wax-seal initials (envelope reveals). */
  sealInitials?: string;
  /** Memorial emblem for funeral wax seals. */
  sealEmblem?: string;
  /** Designed seal (color/material) + font/size/color overrides. */
  sealStyle?: ResolvedSealStyle;
  /** Editable opening copy for ceremonies that render template-authored text. */
  openingCopy?: BlushGateOpeningCopy;
  onComplete: () => void;
  /** Fires on the reveal start gesture (e.g. curtain tap / envelope open) for audio unlock. */
  onBegin?: () => void;
  /** Framed preview, envelope uses absolute fill instead of viewport-fixed. */
  embedded?: boolean;
  /** Catalogue tap already unlocked audio, open without a second seal tap. */
  autoOpen?: boolean;
  /** Returning guest, reveals may offer a visible, opt-in skip control. */
  allowSkip?: boolean;
  /** Funeral / memorial dove unseal ceremony. */
  ceremonialDoves?: boolean;
  children?: React.ReactNode;
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
  sealInitials,
  sealEmblem,
  sealStyle,
  openingCopy,
  onComplete,
  onBegin,
  embedded = false,
  autoOpen = false,
  allowSkip = false,
  ceremonialDoves = false,
  children,
}: OpeningExperienceRouterProps) {
  const [revealed, setRevealed] = useState(false);
  const reducedMotion = useReducedMotion();
  const isCurtain = experienceId.startsWith("curtain-");
  const isEnvelope = isEnvelopeExperience(experienceId);
  /** Owns a reduced-motion path internally (short, dignified open). */
  const isBlushGate = experienceId === "blush-gate";

  function complete() {
    setRevealed(true);
    onComplete();
  }

  if (experienceId === "none" || revealed) {
    return <div className="inv-portal-enter">{children}</div>;
  }

  // Curtain + envelope ceremonies handle reduced-motion internally (short dignified open).
  // All other ceremonies collapse to a static keyboard-first gate.
  if (reducedMotion && !isCurtain && !isEnvelope && !isBlushGate) {
    return <ReducedMotionGate eventTitle={eventTitle} guestName={guestName} onComplete={complete} />;
  }

  if (isEnvelope) {
    const meta = getOpeningExperience(experienceId);
    const theme = meta?.envelopeTheme;
    if (!theme) {
      // Unknown envelope variant, open directly rather than blank-screening.
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
        sealInitials={sealInitials}
        sealEmblem={sealEmblem}
        sealStyle={sealStyle}
        onBegin={onBegin}
        onComplete={complete}
        embedded={embedded}
        autoOpen={autoOpen}
        ceremonialDoves={ceremonialDoves}
      >
        {children}
      </EnvelopeCollectionReveal>
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

  if (experienceId === "blush-gate") {
    // Blush Gate owns its own seal keyboard path — do NOT mount RevealKeyboardFallback
    // here. That "Open invitation" control called onComplete and skipped the entire
    // envelope → golden gate ceremony on live Forever Afaris invites.
    // Mount the invitation underneath so the intro can dissolve into it continuously.
    const underlayPosition = embedded ? "absolute" : "fixed";
    return (
      <>
        <div
          className={revealed ? "inv-portal-enter" : undefined}
          aria-hidden={!revealed}
          style={
            revealed
              ? undefined
              : { position: underlayPosition, inset: 0, zIndex: 0 }
          }
        >
          {children}
        </div>
        {!revealed && (
          <BlushGateReveal
            guestName={guestName}
            eventTitle={eventTitle}
            hostName={hostName}
            copy={{ ...openingCopy, monogram: openingCopy?.monogram ?? sealInitials }}
            autoOpen={autoOpen}
            allowSkip={allowSkip}
            embedded={embedded}
            onBegin={onBegin}
            onComplete={complete}
          />
        )}
      </>
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
        <RevealKeyboardFallback onComplete={complete} embedded={embedded} />
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
        embedded={embedded}
        autoOpen={autoOpen}
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
          <RevealKeyboardFallback onComplete={complete} embedded={embedded} />
        </>
      );
    case "passport":
    case "investor-pass":
      return <PassportReveal guestName={guestName} eventTitle={eventTitle} hostName={hostName} onComplete={complete} />;
    case "glass":
      return (
        <>
          <GlassReveal guestName={guestName} eventTitle={eventTitle} onComplete={complete} />
          <RevealKeyboardFallback onComplete={complete} embedded={embedded} />
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
          <RevealKeyboardFallback onComplete={complete} embedded={embedded} />
        </>
      );
    case "pop-reveal":
    case "launch-pulse":
      return <PopReveal guestName={guestName} eventTitle={eventTitle} onComplete={complete} />;
    case "gift-box":
      return <GiftBoxReveal guestName={guestName} eventTitle={eventTitle} onComplete={complete} />;
    case "light-beam":
      return <LightBeamReveal guestName={guestName} eventTitle={eventTitle} onComplete={complete} />;
    case "film-countdown":
      return <FilmCountdownReveal guestName={guestName} eventTitle={eventTitle} onComplete={complete} />;
    case "letter-unfold":
    case "briefing-folder":
      return <LetterUnfoldReveal guestName={guestName} eventTitle={eventTitle} hostName={hostName} onComplete={complete} />;
    case "flower-bloom":
      return <FlowerBloomReveal guestName={guestName} eventTitle={eventTitle} onComplete={complete} />;
    case "confetti-burst":
    case "balloon-burst":
      return <ConfettiBurstReveal guestName={guestName} eventTitle={eventTitle} onComplete={complete} />;
    case "flip-reveal":
    case "agenda-flip":
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
          <SatinBowReveal
            guestName={guestName}
            eventTitle={eventTitle}
            hostName={hostName}
            enableSounds={enableSounds}
            embedded={embedded}
            autoOpen={autoOpen}
            onBegin={onBegin}
            onComplete={complete}
          />
          <RevealKeyboardFallback onComplete={complete} embedded={embedded} label="Untie and open" />
        </>
      );
    case "ring-box":
      return (
        <>
          <RingBoxReveal guestName={guestName} eventTitle={eventTitle} onComplete={complete} />
          <RevealKeyboardFallback onComplete={complete} embedded={embedded} />
        </>
      );
    case "petal-fall":
      return (
        <>
          <PetalFallReveal guestName={guestName} eventTitle={eventTitle} onComplete={complete} />
          <RevealKeyboardFallback onComplete={complete} embedded={embedded} />
        </>
      );
    default:
      // Unknown/future experience id: never blank-screen the guest, // degrade to opening the invitation directly.
      return <div className="inv-portal-enter">{children}</div>;
  }
}
