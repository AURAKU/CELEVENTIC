"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
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
  INTRO_STALL_GRACE_MS,
  attemptVideoPlay,
  collectIntroVideoDiagnostics,
  forgetSoftIntroThisSession,
  hasSeenSoftIntroThisSession,
  logIntroDiagnostics,
  prepareIntroVideoElement,
  rememberSoftIntroThisSession,
  softIntroTimeoutMs,
} from "@/lib/experience-engine/soft-intro-playback";
import styles from "./celeventic-soft-intro.module.css";

export interface CeleventicSoftIntroProps {
  onComplete: () => void;
  /**
   * Fired only after an explicit guest gesture (tap-to-open). Use this to
   * unlock invitation audio — never start music from a programmatic play().
   */
  onUserGesture?: () => void;
  /** Scopes sessionStorage so intro state is never a stale global key. */
  invitationId?: string;
  /**
   * When true (Replay Opening), ignore session "already seen" and play again.
   */
  forcePlay?: boolean;
  /**
   * @deprecated Ignored, soft intro is video-only (no logo overlay). Kept so
   * call sites do not break.
   */
  logoUrl?: string;
  /**
   * @deprecated Ignored, every invitation plays the canonical Celeventic
   * brand intro video. Kept so call sites do not break. Never restores a
   * photo / DNA picture intro.
   */
  atmosphereUrl?: string | null;
  accentColor?: string;
  secondaryColor?: string;
  /** Retained for compatibility with older callers and fallback timing. */
  quickHold?: boolean;
  /**
   * When true (catalogue / studio phone frame), fill the parent shell instead
   * of locking to the browser viewport with `position: fixed`.
   */
  embedded?: boolean;
}

/**
 * Platform soft launch — canonical Celeventic intro video for every template.
 *
 * Autoplay is always muted on first paint (Safari policy). If the browser
 * still blocks play(), a premium "Tap to Open Invitation" CTA unlocks
 * playback + invitation audio from that user gesture.
 */
export function CeleventicSoftIntro({
  onComplete,
  onUserGesture,
  invitationId,
  forcePlay = false,
  accentColor = CELEVENTIC_PALETTE.teal,
  secondaryColor = CELEVENTIC_PALETTE.gold,
  embedded = false,
}: CeleventicSoftIntroProps) {
  const reduceMotion = useReducedMotion();
  const [exiting, setExiting] = useState(false);
  const [showPosterFallback, setShowPosterFallback] = useState(false);
  const [needsTapToOpen, setNeedsTapToOpen] = useState(false);
  const [playbackStarted, setPlaybackStarted] = useState(false);
  /** Must stay true on first paint — Safari rejects autoplay if muted flips after mount. */
  const [htmlMuted, setHtmlMuted] = useState(true);

  const completed = useRef(false);
  const exitingRef = useRef(false);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stallTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const errorHoldTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastPlayRejection = useRef<string | undefined>(undefined);

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
      const ms = softIntroTimeoutMs(durationSeconds);
      fallbackTimer.current = setTimeout(() => {
        if (!completed.current) beginExit();
      }, ms);
    },
    [beginExit]
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
    setPlaybackStarted(true);
    setNeedsTapToOpen(false);
  }, []);

  const tryMutedPlay = useCallback(
    async (label: string) => {
      const video = videoRef.current;
      if (!video || completed.current || exitingRef.current) return false;

      prepareIntroVideoElement(video);
      const result = await attemptVideoPlay(video, { muted: true });
      if (!result.ok) {
        lastPlayRejection.current = result.reason ?? result.name;
        diagnose(`${label}:play-rejected`);
        return false;
      }
      lastPlayRejection.current = undefined;
      markPlaybackStarted();
      diagnose(`${label}:playing`);
      return true;
    },
    [diagnose, markPlaybackStarted]
  );

  const handleMediaFailure = useCallback(() => {
    if (completed.current || exitingRef.current) return;
    diagnose("media-failure");
    setShowPosterFallback(true);
    setNeedsTapToOpen(false);
    try {
      videoRef.current?.pause();
    } catch {
      /* ignore */
    }
    if (errorHoldTimer.current) clearTimeout(errorHoldTimer.current);
    errorHoldTimer.current = setTimeout(() => beginExit(), INTRO_ERROR_POSTER_HOLD_MS);
  }, [beginExit, diagnose]);

  const armStallWatch = useCallback(() => {
    if (stallTimer.current) clearTimeout(stallTimer.current);
    stallTimer.current = setTimeout(() => {
      const video = videoRef.current;
      if (!video || completed.current || exitingRef.current) return;
      // Still no usable frames after grace — fall through to poster → invite.
      if (video.readyState < 2 || (video.paused && !needsTapToOpen)) {
        handleMediaFailure();
      }
    }, INTRO_STALL_GRACE_MS);
  }, [handleMediaFailure, needsTapToOpen]);

  // Session skip: same invitation, same browser tab, already finished once.
  // Replay Opening passes forcePlay / bumps ceremonyGeneration key.
  useEffect(() => {
    if (forcePlay || embedded || !invitationId) return;
    if (!hasSeenSoftIntroThisSession(invitationId)) return;
    finish();
  }, [embedded, finish, forcePlay, invitationId]);

  useEffect(() => {
    armFallbackTimeout(null);
    return () => clearTimers();
  }, [armFallbackTimeout, clearTimers]);

  // Mount + keep trying muted autoplay (Safari-safe: muted attribute is always on).
  useEffect(() => {
    const video = videoRef.current;
    if (!video || showPosterFallback) return;

    prepareIntroVideoElement(video);
    diagnose("mount");

    let cancelled = false;
    void (async () => {
      const ok = await tryMutedPlay("mount");
      if (cancelled || completed.current) return;
      if (!ok) {
        setNeedsTapToOpen(true);
        diagnose("autoplay-blocked");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [diagnose, showPosterFallback, tryMutedPlay]);

  const handleTapToOpen = useCallback(async () => {
    const video = videoRef.current;
    onUserGesture?.();
    if (!video) {
      beginExit();
      return;
    }

    prepareIntroVideoElement(video);
    // Gesture unlocks audio — unmute only after this explicit tap.
    setHtmlMuted(false);
    video.defaultMuted = false;
    video.muted = false;
    video.volume = 1;

    let result = await attemptVideoPlay(video, { muted: false });
    if (!result.ok) {
      lastPlayRejection.current = result.reason ?? result.name;
      setHtmlMuted(true);
      result = await attemptVideoPlay(video, { muted: true });
    }

    if (!result.ok) {
      lastPlayRejection.current = result.reason ?? result.name;
      diagnose("tap-to-open-failed");
      handleMediaFailure();
      return;
    }

    markPlaybackStarted();
    diagnose("tap-to-open-playing");
  }, [
    beginExit,
    diagnose,
    handleMediaFailure,
    markPlaybackStarted,
    onUserGesture,
  ]);

  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    try {
      video.currentTime = 0;
    } catch {
      /* ignore seek errors before ready */
    }
    armFallbackTimeout(video.duration);
    void tryMutedPlay("loadedmetadata");
  }, [armFallbackTimeout, tryMutedPlay]);

  const handleCanPlay = useCallback(() => {
    if (stallTimer.current) clearTimeout(stallTimer.current);
    void tryMutedPlay("canplay");
  }, [tryMutedPlay]);

  const handleVideoEnded = useCallback(() => {
    if (fallbackTimer.current) clearTimeout(fallbackTimer.current);
    const video = videoRef.current;
    if (video) {
      try {
        video.pause();
        video.muted = true;
      } catch {
        /* ignore */
      }
    }
    beginExit();
  }, [beginExit]);

  const showVideo = !showPosterFallback;

  const rootClass = [
    styles.root,
    embedded ? styles.embedded : styles.live,
    invitationFontVars,
    showVideo ? styles.videoPlaying : "",
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
    >
      <p className={styles.srStatus} aria-live="polite">
        Preparing your invitation. Powered by Celeventic.
      </p>

      <div className={styles.atmosphere} aria-hidden={!needsTapToOpen}>
        {showVideo ? (
          <video
            ref={videoRef}
            className={styles.introVideo}
            src={CELEVENTIC_INVITATION_INTRO_VIDEO}
            poster={CELEVENTIC_INVITATION_INTRO_POSTER}
            // Critical: muted must be present on first HTML paint for Safari autoplay.
            muted={htmlMuted}
            autoPlay
            playsInline
            preload="auto"
            controls={false}
            disablePictureInPicture
            controlsList="nodownload nofullscreen noremoteplayback"
            onLoadedMetadata={handleLoadedMetadata}
            onCanPlay={handleCanPlay}
            onLoadedData={() => void tryMutedPlay("loadeddata")}
            onPlaying={() => {
              markPlaybackStarted();
              if (stallTimer.current) clearTimeout(stallTimer.current);
            }}
            onEnded={handleVideoEnded}
            onError={handleMediaFailure}
            onAbort={handleMediaFailure}
            onStalled={() => {
              diagnose("stalled");
              armStallWatch();
            }}
            onSuspend={() => {
              diagnose("suspend");
              const video = videoRef.current;
              if (video && video.readyState < 2) armStallWatch();
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

      {needsTapToOpen && !exiting && !showPosterFallback && (
        <div className={styles.tapGate}>
          <button
            type="button"
            className={styles.tapToOpen}
            onClick={() => void handleTapToOpen()}
            aria-label="Tap to Open Invitation"
          >
            Tap to Open Invitation
          </button>
        </div>
      )}

      {!embedded && !exiting && (
        <div className={styles.controls}>
          <button
            type="button"
            className={styles.skipButton}
            onClick={() => {
              if (invitationId && forcePlay) forgetSoftIntroThisSession(invitationId);
              beginExit();
            }}
            aria-label="Skip invitation intro video"
          >
            Skip intro
          </button>
        </div>
      )}
    </div>
  );
}
