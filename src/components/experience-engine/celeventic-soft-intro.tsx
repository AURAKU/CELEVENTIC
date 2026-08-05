"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import Image from "next/image";
import { useReducedMotion } from "framer-motion";
import { CELEVENTIC_PALETTE } from "@/lib/experience/celeventic-palette";
import { invitationFontVars } from "@/lib/invitation-fonts";
import {
  CELEVENTIC_INVITATION_INTRO_POSTER,
  CELEVENTIC_INVITATION_INTRO_VIDEO,
  SOFT_INTRO_EXIT_MS,
} from "@/lib/experience-engine/soft-intro";
import {
  INTRO_ERROR_POSTER_HOLD_MS,
  INTRO_FAILED_GATE_HOLD_MS,
  INTRO_STALL_GRACE_MS,
  collectIntroVideoDiagnostics,
  forgetSoftIntroThisSession,
  logIntroDiagnostics,
  logIntroErrorDiagnostics,
  playIntroFromUserGesture,
  playIntroWithMutedFallback,
  prepareIntroVideoElement,
  prepareIntroVideoForGesturePlayback,
  rememberSoftIntroThisSession,
  softIntroTimeoutMs,
} from "@/lib/experience-engine/soft-intro-playback";
import styles from "./celeventic-soft-intro.module.css";

export interface CeleventicSoftIntroProps {
  onComplete: () => void;
  /**
   * Fired after an explicit guest gesture (Open Invitation / Skip).
   * Use this to unlock invitation template music in the same user-activation chain.
   */
  onUserGesture?: () => void;
  /**
   * Fired the moment the brand film actually starts playing. The intro owns the
   * audio stage, so the host uses this to silence any other invitation audio.
   */
  onPlaybackStart?: () => void;
  /**
   * Invitation link or id — scopes sessionStorage only (never auto-skips the
   * visible intro on first paint).
   */
  invitationId?: string;
  /**
   * When true (Replay Opening), clear session memory for a fresh play.
   */
  forcePlay?: boolean;
  /** @deprecated Ignored — soft intro is video-only. */
  logoUrl?: string;
  /** @deprecated Ignored — brand video is the only intro. */
  atmosphereUrl?: string | null;
  accentColor?: string;
  secondaryColor?: string;
  /** Retained for compatibility with older callers. */
  quickHold?: boolean;
  /**
   * When true (catalogue / studio phone frame), fill the parent shell and use
   * silent muted autoplay — separate from the live invitation opening gate.
   */
  embedded?: boolean;
}

/**
 * Canonical Celeventic intro video.
 *
 * Live invitations: one premium “Open Invitation” gesture starts the brand MP4
 * from frame zero with AAC audio enabled. No muted autoplay, no “Tap for sound”.
 *
 * Embedded previews: muted autoplay remains allowed inside the preview shell.
 */
export function CeleventicSoftIntro({
  onComplete,
  onUserGesture,
  onPlaybackStart,
  invitationId,
  forcePlay = false,
  accentColor = CELEVENTIC_PALETTE.teal,
  secondaryColor = CELEVENTIC_PALETTE.gold,
  embedded = false,
}: CeleventicSoftIntroProps) {
  const reduceMotion = useReducedMotion();
  const [exiting, setExiting] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  /** Live path: gate stays until unmuted play succeeds (or reduced-motion skip). */
  const [awaitingOpen, setAwaitingOpen] = useState(!embedded);
  const [playError, setPlayError] = useState<string | null>(null);
  const [playbackStarted, setPlaybackStarted] = useState(false);
  const [openingBusy, setOpeningBusy] = useState(false);

  const completed = useRef(false);
  const exitingRef = useRef(false);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stallTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const errorHoldTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastPlayRejection = useRef<string | undefined>(undefined);
  const playbackStartedRef = useRef(false);
  const awaitingOpenRef = useRef(!embedded);
  const openingInFlightRef = useRef(false);
  const loadCalledRef = useRef(false);
  const playCallCountRef = useRef(0);
  const onUserGestureRef = useRef(onUserGesture);
  onUserGestureRef.current = onUserGesture;
  const onPlaybackStartRef = useRef(onPlaybackStart);
  onPlaybackStartRef.current = onPlaybackStart;

  useEffect(() => {
    awaitingOpenRef.current = awaitingOpen;
  }, [awaitingOpen]);

  const clearTimers = useCallback(() => {
    if (exitTimer.current) clearTimeout(exitTimer.current);
    if (fallbackTimer.current) clearTimeout(fallbackTimer.current);
    if (stallTimer.current) clearTimeout(stallTimer.current);
    if (errorHoldTimer.current) clearTimeout(errorHoldTimer.current);
    exitTimer.current = null;
    fallbackTimer.current = null;
    stallTimer.current = null;
    errorHoldTimer.current = null;
  }, []);

  const finish = useCallback(() => {
    if (completed.current) return;
    completed.current = true;
    clearTimers();
    if (invitationId) rememberSoftIntroThisSession(invitationId);
    onComplete();
  }, [clearTimers, invitationId, onComplete]);

  const beginExit = useCallback(() => {
    if (completed.current || exitingRef.current) return;
    exitingRef.current = true;
    setExiting(true);
    setAwaitingOpen(false);
    try {
      videoRef.current?.pause();
    } catch {
      /* ignore */
    }
    const delay = reduceMotion ? 0 : SOFT_INTRO_EXIT_MS;
    exitTimer.current = setTimeout(finish, delay);
  }, [finish, reduceMotion]);

  const armFallbackTimeout = useCallback(
    (durationSeconds?: number | null) => {
      if (fallbackTimer.current) clearTimeout(fallbackTimer.current);
      // Live gate: do not auto-advance while waiting for Open Invitation.
      if (!embedded && awaitingOpen && !playbackStartedRef.current) return;
      const ms = softIntroTimeoutMs(durationSeconds);
      fallbackTimer.current = setTimeout(() => {
        if (completed.current) return;
        if (!playbackStartedRef.current && !videoFailed && !embedded) return;
        beginExit();
      }, ms);
    },
    [awaitingOpen, beginExit, embedded, videoFailed]
  );

  const diagnose = useCallback((label: string) => {
    const video = videoRef.current;
    if (!video) return;
    logIntroDiagnostics(
      label,
      collectIntroVideoDiagnostics(video, lastPlayRejection.current)
    );
  }, []);

  const markPlaybackStarted = useCallback(() => {
    const firstStart = !playbackStartedRef.current;
    playbackStartedRef.current = true;
    setPlaybackStarted(true);
    setAwaitingOpen(false);
    setPlayError(null);
    setOpeningBusy(false);
    openingInFlightRef.current = false;
    // The film is on: nothing else may be audible underneath it.
    if (firstStart) onPlaybackStartRef.current?.();
  }, []);

  /**
   * A media load/decode failure must never leave a blank stage. The poster
   * still fills the black frame, and the pipeline always continues — either
   * from the guest's tap or from a long-stop timer.
   */
  const handleRealLoadFailure = useCallback(() => {
    if (completed.current || exitingRef.current) return;
    const video = videoRef.current;
    if (video) {
      logIntroErrorDiagnostics(
        collectIntroVideoDiagnostics(video, lastPlayRejection.current)
      );
    }
    diagnose("media-load-failure");
    setVideoFailed(true);
    try {
      videoRef.current?.pause();
    } catch {
      /* ignore */
    }
    if (errorHoldTimer.current) clearTimeout(errorHoldTimer.current);

    // Guest has not tapped yet: hold the branded gate over the poster so
    // opening stays a real gesture (that gesture is what unlocks invitation
    // music on iOS Safari). The long-stop below guarantees they still get in.
    if (!embedded && awaitingOpenRef.current && !playbackStartedRef.current) {
      openingInFlightRef.current = false;
      setOpeningBusy(false);
      setPlayError("The opening film didn’t load. Tap to continue to your invitation.");
      errorHoldTimer.current = setTimeout(() => beginExit(), INTRO_FAILED_GATE_HOLD_MS);
      return;
    }

    setAwaitingOpen(false);
    errorHoldTimer.current = setTimeout(() => beginExit(), INTRO_ERROR_POSTER_HOLD_MS);
  }, [beginExit, diagnose, embedded]);

  // Replay Opening: clear invitation-scoped session mark only.
  useEffect(() => {
    if (!forcePlay || !invitationId) return;
    forgetSoftIntroThisSession(invitationId);
  }, [forcePlay, invitationId]);

  useEffect(() => {
    armFallbackTimeout(null);
    return () => clearTimers();
  }, [armFallbackTimeout, clearTimers]);

  // Mount: preload media. Live path never autoplays. Embedded may muted-autoplay.
  useEffect(() => {
    if (videoFailed) return;
    const video = videoRef.current;
    if (!video) return;

    if (!loadCalledRef.current) {
      loadCalledRef.current = true;
      try {
        video.load();
      } catch {
        /* ignore */
      }
    }

    if (!embedded) {
      // Park at frame zero unmuted, paused — gate authorizes play().
      prepareIntroVideoForGesturePlayback(video);
      try {
        video.pause();
      } catch {
        /* ignore */
      }
      diagnose("mount-awaiting-open");
      return;
    }

    // Embedded catalogue / studio: silent muted autoplay (separate from live).
    prepareIntroVideoElement(video, true);
    diagnose("mount-embedded");
    let cancelled = false;
    void (async () => {
      const result = await playIntroWithMutedFallback(video, false);
      if (cancelled || completed.current) return;
      if (result.playing) {
        markPlaybackStarted();
        diagnose("embedded-playing-muted");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [diagnose, embedded, markPlaybackStarted, videoFailed]);

  const openInvitation = useCallback(async () => {
    if (
      completed.current ||
      exitingRef.current ||
      openingInFlightRef.current ||
      playbackStartedRef.current
    ) {
      return;
    }

    openingInFlightRef.current = true;
    setOpeningBusy(true);
    setPlayError(null);
    onUserGestureRef.current?.();

    // Reduced motion: accessible gate → graceful non-video transition.
    if (reduceMotion) {
      markPlaybackStarted();
      beginExit();
      return;
    }

    const video = videoRef.current;
    if (!video || videoFailed) {
      openingInFlightRef.current = false;
      setOpeningBusy(false);
      beginExit();
      return;
    }

    // Synchronous prep inside the gesture — then a single play().
    prepareIntroVideoForGesturePlayback(video);
    playCallCountRef.current += 1;
    diagnose("open-invitation-gesture");

    const result = await playIntroFromUserGesture(video);
    if (result.playing && !result.muted) {
      lastPlayRejection.current = undefined;
      markPlaybackStarted();
      armFallbackTimeout(video.duration);
      diagnose("open-invitation-playing");
      return;
    }

    lastPlayRejection.current = result.reason ?? result.name ?? "play-rejected";
    diagnose("open-invitation-rejected");
    openingInFlightRef.current = false;
    setOpeningBusy(false);
    setAwaitingOpen(true);
    setPlayError("Couldn’t start with sound. Tap to try again.");
    try {
      video.pause();
      prepareIntroVideoForGesturePlayback(video);
    } catch {
      /* ignore */
    }
  }, [
    armFallbackTimeout,
    beginExit,
    diagnose,
    markPlaybackStarted,
    reduceMotion,
    videoFailed,
  ]);

  const handleOpenKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        void openInvitation();
      }
    },
    [openInvitation]
  );

  const handleSkip = useCallback(() => {
    onUserGestureRef.current?.();
    beginExit();
  }, [beginExit]);

  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (!playbackStartedRef.current) video.currentTime = 0;
    } catch {
      /* ignore */
    }
    if (playbackStartedRef.current) {
      armFallbackTimeout(video.duration);
    }
  }, [armFallbackTimeout]);

  const handleVideoEnded = useCallback(() => {
    if (fallbackTimer.current) clearTimeout(fallbackTimer.current);
    const video = videoRef.current;
    if (video) {
      try {
        video.pause();
      } catch {
        /* ignore */
      }
    }
    beginExit();
  }, [beginExit]);

  const armStallWatch = useCallback(() => {
    if (stallTimer.current) clearTimeout(stallTimer.current);
    if (!playbackStartedRef.current) return;
    stallTimer.current = setTimeout(() => {
      const video = videoRef.current;
      if (!video || completed.current || exitingRef.current) return;
      if (video.readyState < 2) {
        handleRealLoadFailure();
      }
    }, INTRO_STALL_GRACE_MS);
  }, [handleRealLoadFailure]);

  const showVideo = !videoFailed;
  // The gate survives a media failure so the guest keeps a retry/continue
  // affordance instead of staring at a stalled poster.
  const showOpenGate = !embedded && awaitingOpen && !exiting;

  const rootClass = [
    styles.root,
    embedded ? styles.embedded : styles.live,
    invitationFontVars,
    playbackStarted && !awaitingOpen ? styles.videoPlaying : "",
    reduceMotion ? styles.static : "",
    exiting ? styles.exiting : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={rootClass}
      style={
        {
          ["--soft-accent"]: accentColor,
          ["--soft-secondary"]: secondaryColor,
        } as CSSProperties
      }
      data-celeventic-soft-intro="true"
      data-playback-started={playbackStarted ? "true" : "false"}
      data-awaiting-open={awaitingOpen ? "true" : "false"}
      data-video-failed={videoFailed ? "true" : "false"}
      data-play-calls={String(playCallCountRef.current)}
    >
      <p className={styles.srStatus} aria-live="polite">
        {showOpenGate
          ? playError
            ? playError
            : "Your invitation is ready. Press Open Invitation to begin with sound."
          : "Playing your Celeventic invitation intro."}
      </p>

      <div className={styles.atmosphere} aria-hidden={showOpenGate ? true : undefined}>
        {showVideo ? (
          <video
            ref={videoRef}
            className={styles.introVideo}
            src={CELEVENTIC_INVITATION_INTRO_VIDEO}
            poster={CELEVENTIC_INVITATION_INTRO_POSTER}
            // Live: never autoplay. Embedded: muted autoplay is applied in effect.
            muted={embedded}
            autoPlay={false}
            playsInline
            preload="auto"
            controls={false}
            disablePictureInPicture
            controlsList="nodownload nofullscreen noremoteplayback"
            onLoadedMetadata={handleLoadedMetadata}
            onPlaying={() => {
              if (stallTimer.current) clearTimeout(stallTimer.current);
              // Prevent any accidental play behind the opening gate.
              if (
                !embedded &&
                awaitingOpenRef.current &&
                !openingInFlightRef.current &&
                !playbackStartedRef.current
              ) {
                const v = videoRef.current;
                if (v) {
                  try {
                    v.pause();
                    prepareIntroVideoForGesturePlayback(v);
                  } catch {
                    /* ignore */
                  }
                }
                return;
              }
              markPlaybackStarted();
            }}
            onEnded={handleVideoEnded}
            onError={handleRealLoadFailure}
            onAbort={() => diagnose("abort")}
            onStalled={() => {
              diagnose("stalled");
              armStallWatch();
            }}
            onWaiting={() => {
              diagnose("waiting");
              armStallWatch();
            }}
          />
        ) : (
          <>
            <div className={styles.atmosphereFallback} />
            <div className={styles.posterStill}>
              <Image
                src={CELEVENTIC_INVITATION_INTRO_POSTER}
                alt=""
                fill
                sizes="100vw"
                priority
                style={{ objectFit: "cover", objectPosition: "center" }}
              />
            </div>
          </>
        )}
      </div>

      {showOpenGate && (
        <div className={styles.openGate} role="dialog" aria-modal="true" aria-labelledby="cele-open-invite-title">
          <div className={styles.openGateAura} aria-hidden />
          <div className={styles.openGateCard}>
            <p className={styles.openGateBrand}>Celeventic</p>
            <p className={styles.openGateLockup} aria-hidden>
              <span className={styles.lockupCelebrate}>Celebrate</span>
              <span className={styles.lockupDot} />
              <span className={styles.lockupEvent}>Event</span>
              <span className={styles.lockupDot} />
              <span className={styles.lockupTicket}>Ticket</span>
            </p>
            <span className={styles.openGateRule} aria-hidden />
            <h2 id="cele-open-invite-title" className={styles.openGateTitle}>
              Open Invitation
            </h2>
            <p className={styles.openGateSupport}>Tap to begin</p>
            {playError ? (
              <p className={styles.openGateError} role="alert">
                {playError}
              </p>
            ) : null}
            <button
              type="button"
              className={styles.openGateButton}
              onClick={() => void openInvitation()}
              onKeyDown={handleOpenKeyDown}
              disabled={openingBusy}
              aria-label={
                videoFailed
                  ? "Continue to your invitation"
                  : playError
                    ? "Retry opening invitation with sound"
                    : "Open Invitation"
              }
              autoFocus
            >
              {openingBusy
                ? "Opening…"
                : videoFailed
                  ? "Enter Invitation"
                  : playError
                    ? "Try again"
                    : "Open Invitation"}
            </button>
            <p className={styles.openGateFootnote}>
              <span className={styles.openGateFootnoteDot} aria-hidden />
              Best with sound on
            </p>
          </div>
        </div>
      )}

      {!embedded && !exiting && playbackStarted && (
        <div className={styles.controls}>
          <button
            type="button"
            className={styles.skipButton}
            onClick={handleSkip}
            aria-label="Skip invitation intro video"
          >
            Skip intro
          </button>
        </div>
      )}
    </div>
  );
}
