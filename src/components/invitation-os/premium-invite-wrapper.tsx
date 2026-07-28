"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GuestInvitationPortal } from "@/components/guest-portal/guest-invitation-portal";
import type { PremiumInviteExperienceProps } from "@/components/invitation-mvp/premium-invite-experience";
import { TapToBeginExperience } from "@/components/invitations/tap-to-begin-experience";
import { InvitationAudioControls } from "@/components/invitations/invitation-audio-controls";
import { isDarkColor } from "@/lib/invitation-theme/color-utils";
import { CeleventicSoftIntro } from "@/components/experience-engine/celeventic-soft-intro";
import { AdmissionCompanionHandoff } from "@/components/admission/admission-companion-handoff";
import { InteractiveReveal } from "@/components/experience-engine/interactive-reveal";
import { SceneErrorBoundary } from "@/components/experience-engine/scene-error-boundary";
import { isPreviewInvitationId } from "@/lib/invitation/guest-portal-actions";
import type { MusicSelection } from "@/lib/music/music-types";
import type { OpeningExperienceId } from "@/lib/experience/experience-types";
import type { RevealMode } from "@/lib/invitation-studio/studio-types";
import { DEFAULT_HUB_TABS } from "@/lib/experience/experience-types";
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
import { resolveThankYouFontStack } from "@/lib/invitation-theme/fonts";
import {
  TRADITIONAL_MARRIAGE_ENVELOPE_ART_URL,
  resolveSealInitials,
  type VisionBoardContent,
} from "@/lib/invitation/vision-board";
import { resolveSealStyle } from "@/lib/invitation/seal-design";
import { mergeWeddingBoard, type WeddingBoardContent } from "@/lib/invitation/wedding-board";
import { onInvitationReplay } from "@/lib/experience/replay-invitation";
import {
  hasSeenOpening,
  openingMemoryKey,
  rememberOpeningSeen,
} from "@/lib/experience/opening-visit-memory";

/**
 * Full opening pipeline (platform → ceremony → invite):
 * Celeventic brand MP4 → Tap to Begin → Opening reveal (envelope/curtain) → Guest portal
 *
 * Curtain ceremonies own the tap after the brand video:
 * brand MP4 → closed curtain (await touch) → slow open → Guest portal
 *
 * Template DNA / picture intros are retired — the brand video is the only intro.
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
  companionUrl?: string | null;
  /** Poll admission and jump to companion the moment the gate admits this invite. */
  watchAdmissionHandoff?: boolean;
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
  watchAdmissionHandoff = false,
  ...props
}: PremiumInviteWrapperProps) {
  const enrichedDesign = useMemo(
    () => enrichDesignWithExperienceDNA(props.design),
    [props.design]
  );
  const experience = enrichedDesign.experience;
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

  const wantsAutoplay = musicAutoplay ?? musicSelection?.autoPlay ?? true;
  // Curtain ceremonies own "touch to begin" after the brand video intro:
  // soft-intro (celeventic.mp4) → closed curtain (await tap) → slow open → portal.
  // DNA intro variants are retired — the brand video is the only intro.
  const curtainOwnsTap = openingExperience.startsWith("curtain-");
  const needsTapGate = Boolean(!skipTapGate && !curtainOwnsTap);
  const introEnabled = false;

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
  const isBlushGateLayout = enrichedDesign.layout === "forever-afaris-wedding";
  const weddingBoard = useMemo(
    () =>
      isBlushGateLayout
        ? mergeWeddingBoard(
            (enrichedDesign.studio as { weddingBoard?: WeddingBoardContent } | undefined)
              ?.weddingBoard
          )
        : null,
    [enrichedDesign.studio, isBlushGateLayout]
  );
  // Tap-to-begin: couple names only — ceremony titles/phrases live once on the invitation body.
  const softIntroTitle = (() => {
    if (weddingBoard) {
      const c1 = weddingBoard.coupleName1?.trim();
      const c2 = weddingBoard.coupleName2?.trim();
      if (c1 && c2) {
        const short = [c1.split(/\s+/)[0], c2.split(/\s+/)[0]].filter(Boolean).join(" & ");
        return short || weddingBoard.closingSignature?.trim() || undefined;
      }
      return weddingBoard.closingSignature?.trim() || props.event.title?.trim() || undefined;
    }
    if (visionBoard?.coupleName1?.trim() && visionBoard?.coupleName2?.trim()) {
      const short = [visionBoard.coupleName1, visionBoard.coupleName2]
        .map((n) => n.trim().split(/\s+/)[0])
        .filter(Boolean)
        .join(" & ");
      return short || props.event.title?.trim() || undefined;
    }
    return enrichedDesign.introText?.trim() || props.event.title?.trim() || undefined;
  })();

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

  const isPreviewInvite =
    isPreviewInvitationId(props.invitation.id) || props.invitation.uniqueLink === "preview";
  // Hosts reviewing a preview or thumbnail must always get the full ceremony.
  const remembersVisits = !skipAnalytics && !embedded && !isPreviewInvite;
  const ceremonyMemoryKey = useMemo(
    () => openingMemoryKey(props.invitation.id, props.guestId),
    [props.invitation.id, props.guestId]
  );

  /**
   * Returning guest — someone who has already completed the full ceremony
   * (Tap to Begin + envelope/curtain reveal) on this device before.
   *
   * They still get every beat of the ceremony again on this visit — Tap to
   * Begin and the envelope/gate are never silently skipped, first visit or
   * not. The only thing this flag changes is the branded preload: it holds
   * briefly (`quickHold`) instead of the full first-visit duration, and
   * surfaces an honest, visible "Skip intro" control on that beat so a
   * repeat guest can choose to move along faster themselves, rather than
   * the app deciding for them.
   *
   * This is a lazy `useState` initializer rather than an effect so it never
   * changes what gets rendered for the very first paint (that's always
   * `resolveInitialInvitePhase`, i.e. the soft intro) — no server/client
   * markup mismatch, it only tunes a duration/control for a phase the guest
   * is already looking at.
   */
  const [isReturningGuest, setIsReturningGuest] = useState(
    () => remembersVisits && hasSeenOpening(ceremonyMemoryKey)
  );

  useEffect(() => {
    if (!remembersVisits || phase !== "portal") return;
    rememberOpeningSeen(ceremonyMemoryKey);
  }, [ceremonyMemoryKey, phase, remembersVisits]);

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
    // Tap to Begin and the envelope/curtain reveal are never silently
    // skipped — not on first visit, not on a return visit. A returning
    // guest only ever gets a shorter preload beat (`quickHold`, wired below)
    // plus an honest, visible "Skip intro" control on that beat; the
    // ceremony itself always continues normally from here.
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

  // "Replay the opening" inside a template restarts the ceremony, not the page.
  useEffect(() => {
    return onInvitationReplay(() => {
      // An explicit replay request always plays the full ceremony again,
      // even for a guest who'd otherwise get the quick returning-guest path.
      setIsReturningGuest(false);
      if (showReveal) {
        setPhase("reveal");
        return;
      }
      setPhase(resolveInitialInvitePhase(pipelineFlags));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showReveal, skipSoftIntro, skipIntro, introEnabled, needsTapGate]);

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
        companionUrl={props.companionUrl}
        seatQrDataUrl={props.seatQrDataUrl}
        experienceConfig={experience}
        enabledHubTabs={enabledTabs}
        openingComplete
      />
    </SceneErrorBoundary>
  );

  // DNA intro variants are retired; recover safely if an old phase value appears.
  useEffect(() => {
    if (phase !== "intro") return;
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
  }, [phase, needsTapGate, showReveal, startAudio]);

  const admissionHandoff =
    watchAdmissionHandoff &&
    !embedded &&
    props.companionUrl &&
    props.invitation.uniqueLink ? (
      <AdmissionCompanionHandoff
        link={props.invitation.uniqueLink}
        companionHref={props.companionUrl}
        enabled
      />
    ) : null;

  // 1) Canonical Celeventic brand video intro → 2) tap gate / reveal…
  if (phase === "soft-intro") {
    return (
      <>
        {admissionHandoff}
        <CeleventicSoftIntro
          onComplete={afterSoftIntro}
          accentColor={softAccent}
          secondaryColor={softSecondary}
          quickHold={isReturningGuest}
          embedded={Boolean(embedded)}
        />
      </>
    );
  }

  if (phase === "intro") {
    return admissionHandoff;
  }

  if (phase === "tap-to-begin") {
    return (
      <>
        {admissionHandoff}
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
          fontFamily={
            experience?.welcomeFontFamily ? resolveThankYouFontStack(experience.welcomeFontFamily) : undefined
          }
          fontScale={experience?.welcomeFontScale}
          textColorOverride={experience?.welcomeTextColor}
          accentColorOverride={experience?.welcomeAccentColor}
          scrim={experience?.welcomeScrim}
        />
      </>
    );
  }

  if (phase === "reveal") {
    const sealInitials = resolveSealInitials(
      visionBoard?.sealInitials ?? weddingBoard?.sealMonogram,
      {
        layout: enrichedDesign.layout,
        coupleName1: visionBoard?.coupleName1 ?? weddingBoard?.coupleName1,
        coupleName2: visionBoard?.coupleName2 ?? weddingBoard?.coupleName2,
        hostName: props.event.hostName,
      }
    );
    const sealStyle = resolveSealStyle(visionBoard);
    const openingCopy = weddingBoard
      ? {
          monogram: weddingBoard.sealMonogram,
          instruction: weddingBoard.openingInstruction,
          gateWord: weddingBoard.gateWord,
          addressLine: weddingBoard.envelopeAddressLine,
          envelopeStyle: weddingBoard.envelopeStyle,
          gateStyle: weddingBoard.gateStyle,
          sealColor: weddingBoard.sealColor,
          sealMotif: weddingBoard.sealMotif,
          haptics: weddingBoard.haptics,
          palette: {
            accentColor: weddingBoard.accentColor,
            blushColor: weddingBoard.blushColor,
            inkColor: weddingBoard.inkColor,
            canvasColor: weddingBoard.canvasColor,
          },
          coupleLine: [weddingBoard.coupleName1, weddingBoard.coupleName2]
            .filter(Boolean)
            .map((n) => n.split(" ")[0])
            .join(" & "),
        }
      : undefined;
    return (
      <>
        {admissionHandoff}
        <InteractiveReveal
          openingExperience={openingExperience}
          guestName={props.guestName}
          eventTitle={props.event.title}
          hostName={props.event.hostName}
          musicEnabled={Boolean(hasMusic)}
          enableSounds={experience?.enableRevealSounds}
          sealInitials={sealInitials}
          sealStyle={sealStyle}
          openingCopy={openingCopy}
          embedded={Boolean(embedded)}
          autoOpen={Boolean(autoOpenReveal)}
          allowSkip={isReturningGuest}
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
      {admissionHandoff}
      {portal}
      {showAudioControls && audioManager && (
        <InvitationAudioControls manager={audioManager} embedded={embedded} />
      )}
    </>
  );
}
