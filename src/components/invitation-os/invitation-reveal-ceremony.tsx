"use client";

import type { ReactNode } from "react";
import { EnvelopeCollectionReveal } from "@/components/experience/envelope-collection-reveal";
import { getOpeningExperience } from "@/lib/experience/opening-experiences";
import {
  resolveSealInitials,
  TRADITIONAL_MARRIAGE_DEFAULT_SEAL,
} from "@/lib/invitation/vision-board";

interface InvitationRevealCeremonyProps {
  guestName?: string;
  eventTitle: string;
  hostName?: string;
  musicEnabled?: boolean;
  /** Wax-seal initials (defaults to CJ for traditional marriage path). */
  sealInitials?: string;
  onRevealComplete: () => void;
  /** Optional music unlock on open gesture. */
  onBegin?: () => void;
  children: ReactNode;
}

const FALLBACK_THEME =
  getOpeningExperience("envelope-embroidered")?.envelopeTheme ??
  getOpeningExperience("envelope-royal")?.envelopeTheme;

/**
 * Legacy envelope reveal — delegates to the full-viewport
 * EnvelopeCollectionReveal (no copy stack under the envelope).
 */
export function InvitationRevealCeremony({
  eventTitle,
  hostName,
  musicEnabled,
  sealInitials,
  onRevealComplete,
  onBegin,
  children,
}: InvitationRevealCeremonyProps) {
  const theme =
    FALLBACK_THEME ?? getOpeningExperience("envelope-classic")?.envelopeTheme;

  if (!theme) {
    return <div className="inv-portal-enter">{children}</div>;
  }

  const resolvedSeal =
    resolveSealInitials(sealInitials, {
      fallback: TRADITIONAL_MARRIAGE_DEFAULT_SEAL,
    }) || TRADITIONAL_MARRIAGE_DEFAULT_SEAL;

  return (
    <EnvelopeCollectionReveal
      theme={theme}
      eventTitle={eventTitle}
      hostName={hostName}
      musicEnabled={musicEnabled}
      sealInitials={resolvedSeal}
      onBegin={onBegin}
      onComplete={onRevealComplete}
    >
      {children}
    </EnvelopeCollectionReveal>
  );
}
