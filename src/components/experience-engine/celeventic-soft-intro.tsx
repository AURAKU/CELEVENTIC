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
   * Fired after an explicit guest gesture (Tap to Open / Skip / first touch unlock).
   * Use this to unlock invitation template or uploaded music in the same
   * user-activation chain — never start music from a programmatic timer alone.
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
 * Starts muted on first paint (Safari autoplay requirement), then auto-unmutes
 * as soon as the browser allows — no “Tap for sound” CTA. If policy still
 * blocks sound, the next real guest gesture silently unlocks audio.
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
  const playbackAttemptedRef = useRef(false);
  const loadCalledRef = useRef(false);
  const soundUnlockedRef = useRef(false);
  const onUserGestureRef = useRef(onUserGesture);
  onUserGestureRef.current = onUserGesture;

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
        if (completed.current) return;
        // Never finish at t=0 before a play attempt; at the hard ceiling, reveal anyway.
        if (!playbackAttemptedRef.current && !videoFailed) {
          playbackAttemptedRef.current = true;
          fallbackTimer.current = setTimeout(() => {
            if (!completed.current) beginExit();
          }, 1_500);
          return;
        }
        beginExit();
      }, ms);
    },
    [beginExit, videoFailed]
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

  /** Turn sound on without a visible CTA whenever the browser allows it. */
  const unlockIntroSound = useCallback(
    async (label: string, fromGesture: boolean) => {
      const video = videoRef.current;
      if (!video || completed.current || exitingRef.current || soundUnlockedRef.current) {
        return soundUnlockedRef.current;
      }

      if (fromGesture) {
        onUserGestureRef.current?.();
      }

      prepareIntroVideoElement(video, false);
      setHtmlMuted(false);
      const result = await playIntroWithMutedFallback(video, true);

      if (result.playing && !result.muted) {
        soundUnlockedRef.current = true;
        setHtmlMuted(false);
        prepareIntroVideoElement(video, false);
        markPlaybackStarted();
        diagnose(`${label}:unmuted`);
        return true;
      }

      // Stay playing muted if unmute was blocked — keep attribute in sync.
      if (result.playing) {
        setHtmlMuted(true);
        prepareIntroVideoElement(video, true);
        markPlaybackStarted();
        diagnose(`${label}:still-muted`);
      } else {
        setHtmlMuted(true);
        prepareIntroVideoElement(video, true);
        diagnose(`${label}:unmute-failed`);
      }
      return false;
    },
    [diagnose, markPlaybackStarted]
  );

  const tryMutedAutoplay = useCallback(
    async (label: string) => {
      const video = videoRef.current;
      if (!video || completed.current || exitingRef.current || videoFailed) return false;

      playbackAttemptedRef.current = true;
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
      // Immediately try to enable sound — succeeds on many desktop browsers.
      void unlockIntroSound(`${label}:auto-unmute`, false);
      return true;
    },
    [diagnose, markPlaybackStarted, unlockIntroSound, videoFailed]
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

  // Mount: load() once, then muted autoplay (Safari requires muted on first HTML paint).
  useEffect(() => {
    if (videoFailed) return;
    const video = videoRef.current;
    if (!video) return;

    prepareIntroVideoElement(video, true);
    if (!loadCalledRef.current) {
      loadCalledRef.current = true;
      try {
        video.load();
      } catch {
        /* ignore */
      }
    }
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

  // Silent sound unlock: any real guest gesture enables intro audio (no CTA).
  useEffect(() => {
    if (videoFailed || exiting || needsTapToOpen) return;
    if (soundUnlockedRef.current) return;

    const onGesture = () => {
      if (soundUnlockedRef.current || completed.current || exitingRef.current) return;
      void unlockIntroSound("gesture-unmute", true);
    };

    window.addEventListener("pointerdown", onGesture, { capture: true, passive: true });
    window.addEventListener("keydown", onGesture, { capture: true });
    window.addEventListener("touchstart", onGesture, { capture: true, passive: true });

    return () => {
      window.removeEventListener("pointerdown", onGesture, true);
      window.removeEventListener("keydown", onGesture, true);
      window.removeEventListener("touchstart", onGesture, true);
    };
  }, [exiting, needsTapToOpen, unlockIntroSound, videoFailed]);

  const handleTapToOpen = useCallback(async () => {
    const video = videoRef.current;
    onUserGesture?.();
    if (!video) {
      beginExit();
      return;
    }

    playbackAttemptedRef.current = true;
    diagnose("tap-to-open");

    const unmuted = await unlockIntroSound("tap-to-open", false);
    if (unmuted || playbackStartedRef.current) return;

    // Last resort: muted play so the invite still opens.
    prepareIntroVideoElement(video, true);
    setHtmlMuted(true);
    const result = await playIntroWithMutedFallback(video, false);
    if (!result.playing) {
      diagnose("tap-to-open-failed");
      handleRealLoadFailure();
      return;
    }
    markPlaybackStarted();
    diagnose("tap-to-open-playing-muted");
  }, [
    beginExit,
    diagnose,
    handleRealLoadFailure,
    markPlaybackStarted,
    onUserGesture,
    unlockIntroSound,
  ]);

  const handleSkip = useCallback(() => {
    // Skip is an explicit gesture — unlock invitation music for the next beat.
    onUserGesture?.();
    beginExit();
  }, [beginExit, onUserGesture]);

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
