"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GuestInvitationPortal } from "@/components/guest-portal/guest-invitation-portal";
import type { PremiumInviteExperienceProps } from "@/components/invitation-mvp/premium-invite-experience";
import { CeleventicIntroExperience } from "@/components/invitations/CeleventicIntroExperience";
import { TapToBeginExperience } from "@/components/invitations/tap-to-begin-experience";
import { InvitationAudioControls } from "@/components/invitations/invitation-audio-controls";
import { OpeningExperienceRouter } from "@/components/experience/opening-experience-router";
import type { MusicSelection } from "@/lib/music/music-types";
import type { OpeningExperienceId } from "@/lib/experience/experience-types";
import type { RevealMode } from "@/lib/invitation-studio/studio-types";
import { DEFAULT_HUB_TABS } from "@/lib/experience/experience-types";
import { DEFAULT_INTRO_DURATION_SEC } from "@/lib/experience/celeventic-palette";
import { enrichDesignWithExperienceDNA } from "@/lib/experience/experience-engine-v2";
import { mapLegacyRevealMode } from "@/lib/experience/opening-experiences";
import { createInvitationAudioManager } from "@/lib/music/invitation-audio-manager";

/**
 * Full opening pipeline:
 * Celeventic intro → Tap to Begin (audio) → Opening reveal ceremony → Guest portal
 */
type ExperiencePhase = "intro" | "tap-to-begin" | "reveal" | "portal";

interface PremiumInviteWrapperProps extends PremiumInviteExperienceProps {
  revealEnabled?: boolean;
  revealMode?: RevealMode;
  openingExperience?: OpeningExperienceId;
  musicEnabled?: boolean;
  musicUrl?: string | null;
  musicSelection?: MusicSelection | null;
  backgroundImageUrl?: string | null;
  backgroundVideoUrl?: string | null;
  rsvpRequired?: boolean;
  admissionQrDataUrl?: string | null;
  admissionQrToken?: string | null;
  guestQrToken?: string | null;
  seatLookupUrl?: string | null;
  seatQrDataUrl?: string | null;
  fullScreen?: boolean;
  embedded?: boolean;
  /** Skip reveal ceremony (e.g. thumbnail auto-scroll previews) */
  skipReveal?: boolean;
  /** Skip tap-to-begin gate (non-interactive thumbnails) */
  skipTapGate?: boolean;
}

export function PremiumInviteWrapper({
  revealEnabled = true,
  revealMode,
  openingExperience: openingExperienceProp,
  musicEnabled,
  musicUrl,
  musicSelection,
  fullScreen = true,
  embedded,
  skipReveal = false,
  skipTapGate = false,
  ...props
}: PremiumInviteWrapperProps) {
  const enrichedDesign = useMemo(
    () => enrichDesignWithExperienceDNA(props.design),
    [props.design]
  );
  const experience = enrichedDesign.experience;
  const introEnabled = experience?.introEnabled ?? true;
  const introDuration = experience?.introDurationSec ?? DEFAULT_INTRO_DURATION_SEC;
  const enabledTabs = experience?.enabledTabs ?? DEFAULT_HUB_TABS;
  const themeColors = enrichedDesign.colors;

  const openingExperience: OpeningExperienceId =
    openingExperienceProp ??
    experience?.openingExperience ??
    mapLegacyRevealMode(revealMode ?? enrichedDesign.studio?.revealMode ?? "envelope");

  const showReveal =
    !skipReveal &&
    revealEnabled &&
    openingExperience !== "none" &&
    enrichedDesign.studio?.revealMode !== "none";

  const hasMusic =
    (musicEnabled || musicSelection?.url || musicUrl) &&
    (musicSelection?.url || musicUrl?.startsWith("http") || musicUrl?.startsWith("/"));

  const audioManager = useMemo(
    () => (hasMusic ? createInvitationAudioManager(musicSelection, musicUrl) : null),
    [hasMusic, musicSelection, musicUrl]
  );

  const wantsAutoplay = musicSelection?.autoPlay ?? true;
  const needsTapGate = Boolean(hasMusic && wantsAutoplay && !skipTapGate);
  const trackTitle = musicSelection?.title ?? "Event music";

  function initialPhase(): ExperiencePhase {
    if (introEnabled) return "intro";
    if (needsTapGate) return "tap-to-begin";
    if (showReveal) return "reveal";
    return "portal";
  }

  const [phase, setPhase] = useState<ExperiencePhase>(initialPhase);
  const tracked = useRef(false);
  const audioStarted = useRef(false);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    fetch("/api/invitation-os/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType: "INVITE_OPEN",
        invitationId: props.invitation.id,
        guestId: props.guestId,
      }),
    }).catch(() => {});
  }, [props.invitation.id, props.guestId]);

  useEffect(() => {
    return () => {
      audioManager?.destroy();
    };
  }, [audioManager]);

  const startAudio = useCallback(async () => {
    if (!audioManager || audioStarted.current) return;
    if (!wantsAutoplay) return;
    const ok = await audioManager.play();
    if (ok) audioStarted.current = true;
  }, [audioManager, wantsAutoplay]);

  function afterIntro() {
    if (needsTapGate) {
      setPhase("tap-to-begin");
      return;
    }
    if (showReveal) {
      setPhase("reveal");
      return;
    }
    void startAudio();
    setPhase("portal");
  }

  function afterReveal() {
    void startAudio();
    setPhase("portal");
  }

  function handleTapBegin() {
    void startAudio();
    if (showReveal) {
      setPhase("reveal");
      return;
    }
    setPhase("portal");
  }

  useEffect(() => {
    if (phase === "portal" && hasMusic && wantsAutoplay && !audioStarted.current) {
      void startAudio();
    }
  }, [phase, hasMusic, wantsAutoplay, startAudio]);

  const showAudioControls = Boolean(audioManager && hasMusic && (phase === "portal" || phase === "reveal"));

  const portal = (
    <GuestInvitationPortal
      {...props}
      design={enrichedDesign}
      fullScreen={fullScreen || enrichedDesign.studio?.fullScreen}
      embedded={embedded}
      seatLookupUrl={props.seatLookupUrl}
      seatQrDataUrl={props.seatQrDataUrl}
      experienceConfig={experience}
      enabledHubTabs={enabledTabs}
      openingComplete
    />
  );

  if (phase === "intro") {
    return (
      <CeleventicIntroExperience
        durationSec={introDuration}
        onComplete={afterIntro}
        themeColors={{
          accent: themeColors?.accent,
          primary: themeColors?.primary,
          background: themeColors?.background,
        }}
      />
    );
  }

  if (phase === "tap-to-begin") {
    return (
      <TapToBeginExperience
        onBegin={handleTapBegin}
        eventTitle={props.event.title}
        accentColor={themeColors?.accent}
      />
    );
  }

  if (phase === "reveal") {
    return (
      <>
        <OpeningExperienceRouter
          experienceId={openingExperience}
          guestName={props.guestName}
          eventTitle={props.event.title}
          hostName={props.event.hostName}
          musicEnabled={Boolean(hasMusic)}
          enableSounds={experience?.enableRevealSounds}
          onComplete={afterReveal}
        >
          {portal}
        </OpeningExperienceRouter>
        {showAudioControls && audioManager && (
          <InvitationAudioControls manager={audioManager} trackTitle={trackTitle} />
        )}
      </>
    );
  }

  return (
    <>
      {portal}
      {showAudioControls && audioManager && (
        <InvitationAudioControls manager={audioManager} trackTitle={trackTitle} />
      )}
    </>
  );
}
