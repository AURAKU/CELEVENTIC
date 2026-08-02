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
  collectIntroVideoDiagnostics,
  forgetSoftIntroThisSession,
  logIntroDiagnostics,
  logIntroErrorDiagnostics,
  playIntroWithMutedFallback,
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
  /**
   * Invitation link or id — scopes sessionStorage only (never auto-skips the
   * visible intro on first paint).
   */
  invitationId?: string;
  /**
   * When true (Replay Opening), clear session memory for a fresh play.
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
  /** Retained for compatibility with older callers. */
  quickHold?: boolean;
  /**
   * When true (catalogue / studio phone frame), fill the parent shell instead
   * of locking to the browser viewport with `position: fixed`.
   */
  embedded?: boolean;
}

/**
 * Canonical Celeventic intro video.
 *
 * Root-cause fix: the HTML `muted` attribute must be present on first paint.
 * Live used to mount unmuted (`soundEnabled === true`), so Safari rejected
 * autoplay and the intro never started visibly.
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
  /** Only true for real load/decode failure — never for autoplay policy. */
  const [videoFailed, setVideoFailed] = useState(false);
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
  const playbackStartedRef = useRef(false);
  const needsTapRef = useRef(false);

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
    playbackStartedRef.current = true;
    needsTapRef.current = false;
    setPlaybackStarted(true);
    setNeedsTapToOpen(false);
  }, []);

  const tryMutedAutoplay = useCallback(
    async (label: string) => {
      const video = videoRef.current;
      if (!video || completed.current || exitingRef.current || videoFailed) return false;

      prepareIntroVideoElement(video, true);
      setHtmlMuted(true);
      const result = await playIntroWithMutedFallback(video, false);
      if (!result.playing) {
        lastPlayRejection.current =
          result.mutedResult?.reason ?? result.mutedResult?.name ?? "play-rejected";
        diagnose(`${label}:play-rejected`);
        // Autoplay policy → tap CTA. Never mark videoFailed.
        if (result.needsGesture) {
          needsTapRef.current = true;
          setNeedsTapToOpen(true);
        }
        return false;
      }
      lastPlayRejection.current = undefined;
      markPlaybackStarted();
      diagnose(`${label}:playing-muted`);
      return true;
    },
    [diagnose, markPlaybackStarted, videoFailed]
  );

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
    setNeedsTapToOpen(false);
    needsTapRef.current = false;
    try {
      videoRef.current?.pause();
    } catch {
      /* ignore */
    }
    // Keep poster visible briefly, then reveal invitation — never blank forever.
    if (errorHoldTimer.current) clearTimeout(errorHoldTimer.current);
    errorHoldTimer.current = setTimeout(() => beginExit(), INTRO_ERROR_POSTER_HOLD_MS);
  }, [beginExit, diagnose]);

  const armStallWatch = useCallback(() => {
    if (stallTimer.current) clearTimeout(stallTimer.current);
    stallTimer.current = setTimeout(() => {
      const video = videoRef.current;
      if (!video || completed.current || exitingRef.current) return;
      if (playbackStartedRef.current || needsTapRef.current) return;
      // Still no usable frames and no gesture CTA — treat as load failure.
      if (video.readyState < 2) {
        handleRealLoadFailure();
      }
    }, INTRO_STALL_GRACE_MS);
  }, [handleRealLoadFailure]);

  // Replay Opening: clear invitation-scoped session mark only.
  useEffect(() => {
    if (!forcePlay || !invitationId) return;
    forgetSoftIntroThisSession(invitationId);
  }, [forcePlay, invitationId]);

  // Hard ceiling (14s when duration unknown). Re-armed with real duration on metadata.
  useEffect(() => {
    armFallbackTimeout(null);
    return () => clearTimers();
  }, [armFallbackTimeout, clearTimers]);

  // Mount: muted autoplay (Safari requires muted on first HTML paint).
  useEffect(() => {
    if (videoFailed) return;
    const video = videoRef.current;
    if (!video) return;

    prepareIntroVideoElement(video, true);
    diagnose("mount");

    let cancelled = false;
    void (async () => {
      const ok = await tryMutedAutoplay("mount");
      if (cancelled || completed.current) return;
      if (!ok) diagnose("autoplay-needs-gesture-or-retry");
    })();

    return () => {
      cancelled = true;
    };
  }, [diagnose, tryMutedAutoplay, videoFailed]);

  const handleTapToOpen = useCallback(async () => {
    const video = videoRef.current;
    onUserGesture?.();
    if (!video) {
      beginExit();
      return;
    }

    // Gesture unlock — try unmuted, fall back to full muted intro if needed.
    setHtmlMuted(false);
    prepareIntroVideoElement(video, false);
    const result = await playIntroWithMutedFallback(video, true);
    if (result.unmutedRejected) {
      lastPlayRejection.current =
        result.unmutedRejected.reason ?? result.unmutedRejected.name;
    }

    if (!result.playing) {
      diagnose("tap-to-open-failed");
      // Still cannot play after a gesture → real failure path.
      handleRealLoadFailure();
      return;
    }

    setHtmlMuted(result.muted);
    prepareIntroVideoElement(video, result.muted);
    markPlaybackStarted();
    diagnose(result.muted ? "tap-to-open-playing-muted" : "tap-to-open-playing-unmuted");
  }, [beginExit, diagnose, handleRealLoadFailure, markPlaybackStarted, onUserGesture]);

  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (video.currentTime > 0.05) video.currentTime = 0;
    } catch {
      /* ignore seek errors before ready */
    }
    armFallbackTimeout(video.duration);
    void tryMutedAutoplay("loadedmetadata");
  }, [armFallbackTimeout, tryMutedAutoplay]);

  const handleCanPlay = useCallback(() => {
    if (stallTimer.current) clearTimeout(stallTimer.current);
    void tryMutedAutoplay("canplay");
  }, [tryMutedAutoplay]);

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

  const showVideo = !videoFailed;

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
      data-video-failed={videoFailed ? "true" : "false"}
    >
      <p className={styles.srStatus} aria-live="polite">
        Preparing your invitation. Powered by Celeventic.
      </p>

      <div className={styles.atmosphere}>
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
            onLoadedData={() => void tryMutedAutoplay("loadeddata")}
            onPlaying={() => {
              markPlaybackStarted();
              if (stallTimer.current) clearTimeout(stallTimer.current);
            }}
            onEnded={handleVideoEnded}
            onError={handleRealLoadFailure}
            onAbort={() => {
              // Safari often aborts mid-buffer — do NOT treat as load failure.
              diagnose("abort");
            }}
            onStalled={() => {
              diagnose("stalled");
              armStallWatch();
            }}
            onSuspend={() => {
              diagnose("suspend");
              const video = videoRef.current;
              if (video && video.readyState < 2 && !playbackStartedRef.current) {
                armStallWatch();
              }
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

      {needsTapToOpen && !exiting && !videoFailed && (
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
            onClick={beginExit}
            aria-label="Skip invitation intro video"
          >
            Skip intro
          </button>
        </div>
      )}
    </div>
  );
}
