"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GuestInvitationPortal } from "@/components/guest-portal/guest-invitation-portal";
import type { PremiumInviteExperienceProps } from "@/components/invitation-mvp/premium-invite-experience";
import { OpeningExperienceRouter } from "@/components/experience/opening-experience-router";
import { CeleventicIntroExperience } from "@/components/invitations/CeleventicIntroExperience";
import { ExperienceLoading } from "@/components/invitations/experience-loading";
import { TapToBeginExperience } from "@/components/invitations/tap-to-begin-experience";
import { InvitationAudioControls } from "@/components/invitations/invitation-audio-controls";
import type { MusicSelection } from "@/lib/music/music-types";
import { createInvitationAudioManager } from "@/lib/music/invitation-audio-manager";
import { DEFAULT_STUDIO_CONFIG } from "@/lib/invitation-studio/studio-types";
import { mapLegacyRevealMode } from "@/lib/experience/opening-experiences";
import type { OpeningExperienceId } from "@/lib/experience/experience-types";
import type { RevealMode } from "@/lib/invitation-studio/studio-types";
import { DEFAULT_HUB_TABS } from "@/lib/experience/experience-types";
import { DEFAULT_INTRO_DURATION_SEC } from "@/lib/experience/celeventic-palette";

/**
 * Full opening pipeline:
 * Celeventic Intro → Experience Loading → Tap to Begin → Reveal → Invitation Journey
 */
type ExperiencePhase = "intro" | "loading" | "tap-to-begin" | "opening" | "portal";

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
}

export function PremiumInviteWrapper({
  revealEnabled = true,
  revealMode,
  openingExperience,
  musicEnabled,
  musicUrl,
  musicSelection,
  fullScreen = true,
  ...props
}: PremiumInviteWrapperProps) {
  const legacyMode = revealMode ?? props.design?.studio?.revealMode ?? DEFAULT_STUDIO_CONFIG.revealMode ?? "envelope";
  const experienceId =
    openingExperience ??
    props.design?.experience?.openingExperience ??
    mapLegacyRevealMode(legacyMode);
  const instantOpening = !revealEnabled || experienceId === "none";

  const experience = props.design?.experience;
  const introEnabled = experience?.introEnabled ?? true;
  const introDuration = experience?.introDurationSec ?? DEFAULT_INTRO_DURATION_SEC;
  const enabledTabs = experience?.enabledTabs ?? DEFAULT_HUB_TABS;
  const themeColors = props.design?.colors;

  const hasMusic =
    (musicEnabled || musicSelection?.url || musicUrl) &&
    (musicSelection?.url || musicUrl?.startsWith("http") || musicUrl?.startsWith("/"));

  const audioManager = useMemo(
    () => (hasMusic ? createInvitationAudioManager(musicSelection, musicUrl) : null),
    [hasMusic, musicSelection, musicUrl]
  );

  const wantsAutoplay = musicSelection?.autoPlay ?? true;
  const needsTapGate = Boolean(hasMusic && wantsAutoplay);
  const trackTitle = musicSelection?.title ?? "Event music";

  function initialPhase(): ExperiencePhase {
    if (introEnabled) return "intro";
    return "loading";
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
    setPhase("loading");
  }

  function afterLoading() {
    if (needsTapGate) {
      setPhase("tap-to-begin");
      return;
    }
    void startAudio();
    setPhase(instantOpening ? "portal" : "opening");
  }

  function handleTapBegin() {
    void startAudio();
    setPhase(instantOpening ? "portal" : "opening");
  }

  function handleOpeningComplete() {
    setPhase("portal");
  }

  useEffect(() => {
    if (phase === "portal" && hasMusic && wantsAutoplay && !audioStarted.current) {
      void startAudio();
    }
  }, [phase, hasMusic, wantsAutoplay, startAudio]);

  const showAudioControls = Boolean(
    audioManager && hasMusic && phase !== "intro" && phase !== "loading" && phase !== "tap-to-begin"
  );

  const portal = (
    <GuestInvitationPortal
      {...props}
      fullScreen={fullScreen || props.design?.studio?.fullScreen}
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

  if (phase === "loading") {
    return (
      <ExperienceLoading
        onComplete={afterLoading}
        eventTitle={props.event.title}
        accentColor={themeColors?.accent}
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

  if (phase === "opening") {
    return (
      <>
        <OpeningExperienceRouter
          experienceId={experienceId}
          guestName={props.guestName}
          eventTitle={props.event.title}
          hostName={props.event.hostName}
          musicEnabled={Boolean(hasMusic)}
          enableSounds={experience?.enableRevealSounds ?? true}
          onComplete={handleOpeningComplete}
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
