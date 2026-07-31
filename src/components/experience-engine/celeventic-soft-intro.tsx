"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { Volume2 } from "lucide-react";
import Image from "next/image";
import { useReducedMotion } from "framer-motion";
import { CELEVENTIC_PALETTE } from "@/lib/experience/celeventic-palette";
import { invitationFontVars } from "@/lib/invitation-fonts";
import {
  CELEVENTIC_INVITATION_INTRO_POSTER,
  CELEVENTIC_INVITATION_INTRO_VIDEO,
  SOFT_INTRO_EXIT_MS,
  SOFT_INTRO_FALLBACK_MS,
  softIntroHoldMs,
} from "@/lib/experience-engine/soft-intro";
import styles from "./celeventic-soft-intro.module.css";

export interface CeleventicSoftIntroProps {
  onComplete: () => void;
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
 * Platform soft launch, canonical Celeventic intro video for every template.
 * Starts immediately and advances when the full video ends or the guest uses
 * the explicit Skip Intro control.
 * No logo PNG overlay, the clip is the brand beat. Poster is only a still
 * of this same brand clip when motion or playback is unavailable.
 */
export function CeleventicSoftIntro({
  onComplete,
  accentColor = CELEVENTIC_PALETTE.teal,
  secondaryColor = CELEVENTIC_PALETTE.gold,
  quickHold = false,
  embedded = false,
}: CeleventicSoftIntroProps) {
  const reduceMotion = useReducedMotion();
  const [exiting, setExiting] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  /** Embedded previews stay silent; live playback attempts full audio first. */
  const [soundEnabled, setSoundEnabled] = useState(!embedded);
  const [soundBlocked, setSoundBlocked] = useState(false);
  const completed = useRef(false);
  const exitingRef = useRef(false);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const finish = useCallback(() => {
    if (completed.current) return;
    completed.current = true;
    if (exitTimer.current) clearTimeout(exitTimer.current);
    onComplete();
  }, [onComplete]);

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

  useEffect(() => {
    // Always arm a hard ceiling so a stalled buffer / broken autoplay path
    // cannot leave guests on a blank brand screen forever. Normal playback
    // ends via `onEnded` well before this timer fires.
    const fallback = setTimeout(finish, SOFT_INTRO_FALLBACK_MS);

    // Reduced motion / failed video: timed brand beat, no full clip.
    if (reduceMotion || videoFailed) {
      const hold = softIntroHoldMs(Boolean(reduceMotion), quickHold);
      const auto = setTimeout(() => beginExit(), hold);
      return () => {
        clearTimeout(auto);
        clearTimeout(fallback);
      };
    }

    return () => {
      clearTimeout(fallback);
    };
  }, [beginExit, finish, reduceMotion, quickHold, videoFailed]);

  useEffect(() => {
    return () => {
      if (exitTimer.current) clearTimeout(exitTimer.current);
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || reduceMotion || videoFailed) return;

    // Request audible autoplay first. Browsers that allow it start with sound
    // immediately. Browsers enforcing autoplay policy reject that promise; in
    // that case continue the complete intro muted rather than showing a gate.
    video.defaultMuted = embedded;
    video.muted = embedded;
    video.volume = 1;
    setSoundEnabled(!embedded);
    setSoundBlocked(false);

    const playback = video.play();
    if (playback && typeof playback.catch === "function") {
      playback.catch(() => {
        video.defaultMuted = true;
        video.muted = true;
        setSoundEnabled(false);
        setSoundBlocked(!embedded);
        const mutedPlayback = video.play();
        if (mutedPlayback && typeof mutedPlayback.catch === "function") {
          mutedPlayback.catch(() => setVideoFailed(true));
        }
      });
    }
  }, [embedded, reduceMotion, videoFailed]);

  const enableSound = useCallback(async () => {
    const video = videoRef.current;
    if (!video || completed.current) return;

    try {
      video.defaultMuted = false;
      video.muted = false;
      video.volume = 1;
      await video.play();
      setSoundEnabled(true);
      setSoundBlocked(false);
    } catch {
      // Leave the complete intro playing muted if a browser still rejects
      // audio after the explicit guest gesture.
      video.defaultMuted = true;
      video.muted = true;
      setSoundEnabled(false);
      setSoundBlocked(true);
    }
  }, []);

  const handleVideoEnded = useCallback(() => {
    // The media track naturally ends here; explicitly mute before the exit
    // crossfade so no browser can retain audio into the following invite beat.
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.muted = true;
    }
    setSoundEnabled(false);
    beginExit();
  }, [beginExit]);

  const showVideo = !reduceMotion && !videoFailed;

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
    >
      <p className={styles.srStatus} aria-live="polite">
        Preparing your invitation. Powered by Celeventic.
      </p>

      <div className={styles.atmosphere} aria-hidden>
        {showVideo ? (
          <>
            <video
              ref={videoRef}
              className={styles.introVideo}
              src={CELEVENTIC_INVITATION_INTRO_VIDEO}
              poster={CELEVENTIC_INVITATION_INTRO_POSTER}
              muted={!soundEnabled}
              playsInline
              autoPlay
              preload="metadata"
              disablePictureInPicture
              controlsList="nodownload nofullscreen noremoteplayback"
              onLoadedMetadata={(event) => {
                event.currentTarget.currentTime = 0;
              }}
              onEnded={handleVideoEnded}
              onError={() => setVideoFailed(true)}
              onStalled={() => {
                // Prolonged stall on cellular/WebViews — fall back to poster beat.
                const video = videoRef.current;
                if (!video || video.readyState >= 2) return;
                window.setTimeout(() => {
                  if (videoRef.current && videoRef.current.readyState < 2 && !completed.current) {
                    setVideoFailed(true);
                  }
                }, 8_000);
              }}
            />
          </>
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
                style={{ objectFit: "contain", objectPosition: "center" }}
              />
            </div>
          </>
        )}
      </div>

      {!showVideo && (
        <>
          <div className={styles.glassMask} aria-hidden />
          <div className={styles.warmBloom} aria-hidden />
        </>
      )}

      {!embedded && !exiting && (
        <div className={styles.controls}>
          {showVideo && soundBlocked && (
            <button
              type="button"
              className={styles.soundButton}
              onClick={() => void enableSound()}
              aria-label="Play invitation intro with sound"
            >
              <Volume2 size={16} aria-hidden />
              <span>Tap for sound</span>
            </button>
          )}
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
