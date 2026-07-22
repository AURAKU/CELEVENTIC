"use client";

import { useEffect, type ReactNode } from "react";
import type { OpeningExperienceId } from "@/lib/experience/experience-types";
import { OpeningExperienceRouter } from "@/components/experience/opening-experience-router";
import { getRevealContractForOpening } from "@/lib/experience-engine/interactive-reveal-contract";
import { lockRevealScroll } from "@/lib/experience-engine/reveal-runtime";

interface InteractiveRevealProps {
  openingExperience: OpeningExperienceId;
  guestName?: string;
  eventTitle: string;
  hostName?: string;
  musicEnabled?: boolean;
  enableSounds?: boolean;
  onComplete: () => void;
  /** User gesture that starts the reveal (audio unlock). */
  onBegin?: () => void;
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
  onComplete,
  onBegin,
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
      className="interactive-reveal-root"
    >
      <OpeningExperienceRouter
        experienceId={contract.openingExperience}
        guestName={guestName}
        eventTitle={eventTitle}
        hostName={hostName}
        musicEnabled={musicEnabled}
        enableSounds={enableSounds}
        onComplete={onComplete}
        onBegin={onBegin}
      >
        {children}
      </OpeningExperienceRouter>
    </div>
  );
}
