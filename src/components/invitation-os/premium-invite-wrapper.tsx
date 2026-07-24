"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GuestInvitationPortal } from "@/components/guest-portal/guest-invitation-portal";
import type { PremiumInviteExperienceProps } from "@/components/invitation-mvp/premium-invite-experience";
import { CeleventicIntroExperience } from "@/components/invitations/CeleventicIntroExperience";
import { defaultIntroVariantFor } from "@/lib/experience/intro-variants";
import { TapToBeginExperience } from "@/components/invitations/tap-to-begin-experience";
import { InvitationAudioControls } from "@/components/invitations/invitation-audio-controls";
import { isDarkColor } from "@/lib/invitation-theme/color-utils";
import { CeleventicSoftIntro } from "@/components/experience-engine/celeventic-soft-intro";
import { InteractiveReveal } from "@/components/experience-engine/interactive-reveal";
import { SceneErrorBoundary } from "@/components/experience-engine/scene-error-boundary";
import { isPreviewInvitationId } from "@/lib/invitation/guest-portal-actions";
import type { MusicSelection } from "@/lib/music/music-types";
import type { OpeningExperienceId } from "@/lib/experience/experience-types";
import type { RevealMode } from "@/lib/invitation-studio/studio-types";
import { DEFAULT_HUB_TABS } from "@/lib/experience/experience-types";
import { DEFAULT_INTRO_DURATION_SEC } from "@/lib/experience/celeventic-palette";
import { enrichDesignWithExperienceDNA } from "@/lib/experience/experience-engine-v2";
import { mapLegacyRevealMode } from "@/lib/experience/opening-experiences";
import { createInvitationAudioManager } from "@/lib/music/invitation-audio-manager";
import {
  phaseAfterSoftIntro,
  resolveInitialInvitePhase,
  resolveSoftIntroAtmosphere,
  type InvitePipelinePhase,
} from "@/lib/experience-engine/soft-intro";
import { getLayoutMediaPack } from "@/lib/invitation/layout-media-identity";
import { introAtmosphereUrlFromDesign } from "@/lib/invitation/studio-media-utils";
import {
  TRADITIONAL_MARRIAGE_ENVELOPE_ART_URL,
  resolveSealInitials,
  type VisionBoardContent,
} from "@/lib/invitation/vision-board";
import { resolveSealStyle } from "@/lib/invitation/seal-design";

/**
 * Full opening pipeline (platform → template → reveal → invite):
 * Celeventic soft intro → template DNA intro → Tap to Begin → Opening reveal → Guest portal
 * Curtain ceremonies: soft intro → closed curtain (owns tap) → slow open → Guest portal
 */
type ExperiencePhase = InvitePipelinePhase;

interface PremiumInviteWrapperProps extends PremiumInviteExperienceProps {
  revealEnabled?: boolean;
  revealMode?: RevealMode;
  openingExperience?: OpeningExperienceId;
  musicEnabled?: boolean;
  /** When false, music only loads after tap-to-begin (catalog thumbnails). */
  musicAutoplay?: boolean;
  musicUrl?: string | null;
  musicSelection?: MusicSelection | null;
  backgroundImageUrl?: string | null;
  backgroundVideoUrl?: string | null;
  rsvpRequired?: boolean;
  admissionQrDataUrl?: string | null;
  admissionQrToken?: string | null;
  admissionManualCode?: string | null;
  guestQrToken?: string | null;
  seatLookupUrl?: string | null;
  seatQrDataUrl?: string | null;
  fullScreen?: boolean;
  embedded?: boolean;
  /** Gallery swipe/arrows even when embedded in a compact preview frame */
  galleryInteractive?: boolean;
  /** Skip reveal ceremony (e.g. thumbnail auto-scroll previews) */
  skipReveal?: boolean;
  /** Skip tap-to-begin gate (non-interactive thumbnails) */
  skipTapGate?: boolean;
  /** Skip template DNA / variant intro (studio/catalog previews) */
  skipIntro?: boolean;
  /**
   * Skip platform Celeventic soft intro.
   * When omitted, follows `skipIntro` so thumbnails stay snappy while live + full
   * preview still get consistent branding.
   */
  skipSoftIntro?: boolean;
  /** Skip INVITE_OPEN analytics (catalog/studio previews) */
  skipAnalytics?: boolean;
  /**
   * Catalogue “Tap to open envelope” already consumed the gesture —
   * start the opening reveal immediately (music unlocks via onBegin).
   */
  autoOpenReveal?: boolean;
  contactEmail?: string | null;
  seatingEnabled?: boolean;
  menuUrl?: string | null;
  menuBody?: string | null;
  registryUrl?: string | null;
  seatTable?: string | null;
  seatLabel?: string | null;
}

export function PremiumInviteWrapper({
  revealEnabled = true,
  revealMode,
  openingExperience: openingExperienceProp,
  musicEnabled,
  musicUrl,
  musicSelection,
  musicAutoplay,
  fullScreen = true,
  embedded,
  galleryInteractive,
  skipReveal = false,
  skipTapGate = false,
  skipIntro = false,
  skipSoftIntro,
  skipAnalytics = false,
  autoOpenReveal = false,
  ...props
}: PremiumInviteWrapperProps) {
  const enrichedDesign = useMemo(
    () => enrichDesignWithExperienceDNA(props.design),
    [props.design]
  );
  const experience = enrichedDesign.experience;
  const introDuration = experience?.introDurationSec ?? DEFAULT_INTRO_DURATION_SEC;
  const enabledTabs = experience?.enabledTabs ?? DEFAULT_HUB_TABS;
  const themeColors = enrichedDesign.colors;

  const openingExperience: OpeningExperienceId =
    openingExperienceProp ??
    experience?.openingExperience ??
    mapLegacyRevealMode(revealMode ?? enrichedDesign.studio?.revealMode ?? "envelope");

  // Branded intro choreography — user choice, else the template family's own.
  const introVariant =
    experience?.introVariant ??
    defaultIntroVariantFor({
      layout: enrichedDesign.layout,
      collectionId: experience?.collectionId,
      heroLayout: experience?.heroLayout,
    });

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

  const wantsAutoplay = musicAutoplay ?? musicSelection?.autoPlay ?? true;
  // Curtain ceremonies own "touch to begin" and are the theatrical beat after soft intro:
  // soft-intro → closed curtain (await tap) → slow open → portal.
  // Skip separate TapToBegin + template DNA intro so curtains appear next.
  const curtainOwnsTap = openingExperience.startsWith("curtain-");
  const needsTapGate = Boolean(!skipTapGate && !curtainOwnsTap);
  const introEnabled = curtainOwnsTap ? false : (experience?.introEnabled ?? true);

  const pipelineFlags = {
    skipSoftIntro,
    skipIntro,
    introEnabled,
    needsTapGate,
    showReveal,
  };

  const layoutMedia = getLayoutMediaPack(enrichedDesign.layout);
  // TM soft intro must match embroidery pre-reveal — never the printed card art.
  const layoutFallbackUrl =
    enrichedDesign.layout === "traditional-marriage-ceremony"
      ? TRADITIONAL_MARRIAGE_ENVELOPE_ART_URL
      : (layoutMedia?.background ?? layoutMedia?.hero ?? null);
  const mediaHero =
    enrichedDesign.media?.find((m) => m.role === "hero" || m.role === "background")?.url ?? null;
  // Studio's dedicated "pre-invite welcome photo" upload — soft-intro / BEGIN gate only,
  // never the hero, gallery, or page background behind the rest of the invite.
  const introImageUrl = introAtmosphereUrlFromDesign(enrichedDesign);
  const softAtmosphereUrl = resolveSoftIntroAtmosphere({
    introImageUrl,
    backgroundImageUrl: props.backgroundImageUrl,
    coverImageUrl: props.event.coverImageUrl,
    mediaUrl: mediaHero,
    layoutFallbackUrl,
  });

  const visionBoard = (enrichedDesign.studio as { visionBoard?: VisionBoardContent } | undefined)
    ?.visionBoard;
  // Prefer ceremony wording from content once — never restate on tap-to-begin.
  const softIntroTitle =
    (visionBoard?.eyebrow && visionBoard?.scriptTitle
      ? `${visionBoard.eyebrow} ${visionBoard.scriptTitle}`
      : null) ||
    enrichedDesign.introText?.trim() ||
    props.event.title?.trim() ||
    undefined;

  const softAccent =
    themeColors?.accent ??
    (enrichedDesign.layout === "traditional-marriage-ceremony" ? "#A18373" : undefined);
  const softSecondary =
    themeColors?.primary ??
    (enrichedDesign.layout === "traditional-marriage-ceremony" ? "#F5EBE3" : undefined);

  const [phase, setPhase] = useState<ExperiencePhase>(() =>
    resolveInitialInvitePhase(pipelineFlags)
  );
  const tracked = useRef(false);
  const audioStarted = useRef(false);

  useEffect(() => {
    if (tracked.current || skipAnalytics) return;
    if (isPreviewInvitationId(props.invitation.id) || props.invitation.uniqueLink === "preview") {
      return;
    }
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
  }, [props.invitation.id, props.invitation.uniqueLink, props.guestId, skipAnalytics]);

  useEffect(() => {
    return () => {
      audioManager?.destroy();
    };
  }, [audioManager]);

  useEffect(() => {
    if (audioManager && hasMusic) {
      audioManager.getAudio();
    }
  }, [audioManager, hasMusic]);

  const startAudio = useCallback(async () => {
    if (!audioManager || audioStarted.current) return;
    if (!wantsAutoplay) return;
    const ok = await audioManager.play();
    if (ok) audioStarted.current = true;
  }, [audioManager, wantsAutoplay]);

  function afterSoftIntro() {
    // Curtain path: soft-intro → reveal (closed curtain). Else: DNA intro / tap / reveal.
    setPhase(phaseAfterSoftIntro(pipelineFlags));
  }

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

  const showAudioControls = Boolean(
    audioManager && hasMusic && (phase === "portal" || phase === "reveal" || phase === "tap-to-begin")
  );

  // Template-aware chrome for the audio controller: accent tint + light/dark
  // surface derived from the theme so it belongs to the design, not bolted on.
  const audioControlProps = {
    trackTitle: musicSelection?.title ?? undefined,
    accentColor: themeColors?.accent,
    variant: isDarkColor(themeColors?.background ?? themeColors?.primary ?? "#0F172A")
      ? ("dark" as const)
      : ("light" as const),
  };

  const portal = (
    <SceneErrorBoundary sceneId="guest-portal">
      <GuestInvitationPortal
        {...props}
        design={enrichedDesign}
        fullScreen={fullScreen || enrichedDesign.studio?.fullScreen}
        embedded={embedded}
        galleryInteractive={galleryInteractive}
        seatLookupUrl={props.seatLookupUrl}
        seatQrDataUrl={props.seatQrDataUrl}
        experienceConfig={experience}
        enabledHubTabs={enabledTabs}
        openingComplete
      />
    </SceneErrorBoundary>
  );

  // 1) Platform soft intro (all live invites) → 2) template DNA intro → …
  if (phase === "soft-intro") {
    return (
      <CeleventicSoftIntro
        onComplete={afterSoftIntro}
        atmosphereUrl={softAtmosphereUrl}
        accentColor={softAccent}
        secondaryColor={softSecondary}
      />
    );
  }

  if (phase === "intro") {
    return (
      <CeleventicIntroExperience
        durationSec={introDuration}
        onComplete={afterIntro}
        variant={introVariant}
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
        hostName={props.event.hostName}
        accentColor={themeColors?.accent ?? softAccent}
        primaryColor={themeColors?.primary ?? themeColors?.secondary}
        backgroundColor={themeColors?.background}
        atmosphereUrl={softAtmosphereUrl}
        ceremonyLabel={softIntroTitle}
        name1={visionBoard?.coupleName1}
        name2={visionBoard?.coupleName2}
        layoutSlug={enrichedDesign.layout}
        category={experience?.collectionId}
      />
    );
  }

  if (phase === "reveal") {
    const sealInitials = resolveSealInitials(visionBoard?.sealInitials, {
      layout: enrichedDesign.layout,
      coupleName1: visionBoard?.coupleName1,
      coupleName2: visionBoard?.coupleName2,
      hostName: props.event.hostName,
    });
    const sealStyle = resolveSealStyle(visionBoard);
    return (
      <>
        <InteractiveReveal
          openingExperience={openingExperience}
          guestName={props.guestName}
          eventTitle={props.event.title}
          hostName={props.event.hostName}
          musicEnabled={Boolean(hasMusic)}
          enableSounds={experience?.enableRevealSounds}
          sealInitials={sealInitials}
          sealStyle={sealStyle}
          embedded={Boolean(embedded)}
          autoOpen={Boolean(autoOpenReveal)}
          onBegin={() => {
            void startAudio();
          }}
          onComplete={afterReveal}
        >
          {portal}
        </InteractiveReveal>
        {showAudioControls && audioManager && (
          <InvitationAudioControls manager={audioManager} embedded={embedded} {...audioControlProps} />
        )}
      </>
    );
  }

  return (
    <>
      {portal}
      {showAudioControls && audioManager && (
        <InvitationAudioControls manager={audioManager} embedded={embedded} />
      )}
    </>
  );
}
