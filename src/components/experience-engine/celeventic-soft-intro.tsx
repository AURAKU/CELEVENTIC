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
  /**
   * Returning guest who has already completed the opening once, hold the
   * branded beat briefly rather than the full first-visit duration, but
   * never skip it entirely (guests should never feel "nothing happened").
   */
  quickHold?: boolean;
  /**
   * When true (catalogue / studio phone frame), fill the parent shell instead
   * of locking to the browser viewport with `position: fixed`.
   */
  embedded?: boolean;
}

/**
 * Platform soft launch, canonical Celeventic intro video for every template.
 * Starts immediately and advances only when the full video ends.
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
    // Reduced motion / failed video: timed brand beat, no full clip.
    if (reduceMotion || videoFailed) {
      const hold = softIntroHoldMs(Boolean(reduceMotion), quickHold);
      const auto = setTimeout(() => beginExit(), hold);
      const fallback = setTimeout(finish, SOFT_INTRO_FALLBACK_MS);
      return () => {
        clearTimeout(auto);
        clearTimeout(fallback);
      };
    }

    // Successful video playback owns completion through `onEnded`, ensuring
    // the canonical intro is never cut short by a timer or incidental tap.
    return;
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

    const playback = video.play();
    if (playback && typeof playback.catch === "function") {
      playback.catch(() => {
        video.defaultMuted = true;
        video.muted = true;
        setSoundEnabled(false);
        const mutedPlayback = video.play();
        if (mutedPlayback && typeof mutedPlayback.catch === "function") {
          mutedPlayback.catch(() => setVideoFailed(true));
        }
      });
    }
  }, [embedded, reduceMotion, videoFailed]);

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
            {/* A soft, cropped poster fills mismatched aspect-ratio margins.
                The actual video remains contained above it, fully uncropped. */}
            <div className={styles.videoBackdrop}>
              <Image
                src={CELEVENTIC_INVITATION_INTRO_POSTER}
                alt=""
                fill
                sizes="100vw"
                priority
              />
            </div>
            <video
              ref={videoRef}
              className={styles.introVideo}
              src={CELEVENTIC_INVITATION_INTRO_VIDEO}
              poster={CELEVENTIC_INVITATION_INTRO_POSTER}
              muted={!soundEnabled}
              playsInline
              autoPlay
              preload="auto"
              disablePictureInPicture
              controlsList="nodownload nofullscreen noremoteplayback"
              onEnded={handleVideoEnded}
              onError={() => setVideoFailed(true)}
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

    </div>
  );
}
