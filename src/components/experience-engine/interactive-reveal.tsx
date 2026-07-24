"use client";

import { useEffect, type ReactNode } from "react";
import type { OpeningExperienceId } from "@/lib/experience/experience-types";
import { OpeningExperienceRouter } from "@/components/experience/opening-experience-router";
import { getRevealContractForOpening } from "@/lib/experience-engine/interactive-reveal-contract";
import { lockRevealScroll } from "@/lib/experience-engine/reveal-runtime";
import type { ResolvedSealStyle } from "@/lib/invitation/seal-design";

interface InteractiveRevealProps {
  openingExperience: OpeningExperienceId;
  guestName?: string;
  eventTitle: string;
  hostName?: string;
  musicEnabled?: boolean;
  enableSounds?: boolean;
  /** Wax-seal initials for envelope reveals. */
  sealInitials?: string;
  /** Designed seal (color/material) + font/size/color overrides. */
  sealStyle?: ResolvedSealStyle;
  onComplete: () => void;
  /** User gesture that starts the reveal (audio unlock). */
  onBegin?: () => void;
  /** Framed catalogue/studio preview — absolute envelope shell. */
  embedded?: boolean;
  /** Start envelope/curtain open immediately (preview tap gesture already happened). */
  autoOpen?: boolean;
  children: ReactNode;
}

/**
 * Shared InteractiveReveal contract wrapping OpeningExperienceRouter.
 * Existing reveals stay intact; this adds mechanic metadata + scroll lock.
 * Keyboard + reduced-motion fallthroughs live inside OpeningExperienceRouter.
 */
export function InteractiveReveal({
  openingExperience,
  guestName,
  eventTitle,
  hostName,
  musicEnabled,
  enableSounds = true,
  sealInitials,
  sealStyle,
  onComplete,
  onBegin,
  embedded = false,
  autoOpen = false,
  children,
}: InteractiveRevealProps) {
  const contract = getRevealContractForOpening(openingExperience);

  useEffect(() => {
    const unlock = lockRevealScroll();
    return unlock;
  }, []);

  return (
    <div
      data-reveal-mechanic={contract.mechanic}
      data-reveal-hint={contract.gestureHint}
      data-reveal-keyboard={contract.supportsKeyboardFallback ? "true" : "false"}
      data-reveal-reduced-motion={contract.supportsReducedMotion ? "true" : "false"}
      className={
        embedded
          ? "interactive-reveal-root absolute inset-0 h-full w-full min-h-full"
          : "interactive-reveal-root"
      }
    >
      <OpeningExperienceRouter
        experienceId={contract.openingExperience}
        guestName={guestName}
        eventTitle={eventTitle}
        hostName={hostName}
        musicEnabled={musicEnabled}
        enableSounds={enableSounds}
        sealInitials={sealInitials}
        sealStyle={sealStyle}
        onComplete={onComplete}
        onBegin={onBegin}
        embedded={embedded}
        autoOpen={autoOpen}
      >
        {children}
      </OpeningExperienceRouter>
    </div>
  );
}
