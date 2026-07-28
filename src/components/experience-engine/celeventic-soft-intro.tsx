"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import { useReducedMotion } from "framer-motion";
import { BRAND_MOTTO } from "@/lib/constants";
import {
  CELEVENTIC_LOGO_FULL,
  CELEVENTIC_PALETTE,
  INTRO_SKIP_AVAILABLE_MS,
} from "@/lib/experience/celeventic-palette";
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
  logoUrl?: string;
  /**
   * @deprecated Ignored — every invitation plays the canonical Celeventic
   * brand intro video. Kept so call sites do not break.
   */
  atmosphereUrl?: string | null;
  accentColor?: string;
  secondaryColor?: string;
  /**
   * Returning guest who has already completed the opening once — hold the
   * branded beat briefly rather than the full first-visit duration, but
   * never skip it entirely (guests should never feel "nothing happened").
   */
  quickHold?: boolean;
}

/**
 * Platform soft launch — canonical Celeventic intro video for every template.
 * Auto-advances when the video ends; tap / Enter / Space / Skip crossfade out.
 */
export function CeleventicSoftIntro({
  onComplete,
  logoUrl = CELEVENTIC_LOGO_FULL,
  accentColor = CELEVENTIC_PALETTE.teal,
  secondaryColor = CELEVENTIC_PALETTE.gold,
  quickHold = false,
}: CeleventicSoftIntroProps) {
  const reduceMotion = useReducedMotion();
  const [exiting, setExiting] = useState(false);
  const [canSkip, setCanSkip] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
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
      const skipReveal =
        hold > INTRO_SKIP_AVAILABLE_MS
          ? setTimeout(() => setCanSkip(true), INTRO_SKIP_AVAILABLE_MS)
          : setTimeout(() => setCanSkip(true), 200);
      return () => {
        clearTimeout(auto);
        clearTimeout(fallback);
        clearTimeout(skipReveal);
      };
    }

    // Returning guests still watch the brand video — Skip appears sooner.
    const skipAt = quickHold ? 400 : INTRO_SKIP_AVAILABLE_MS;
    const skipReveal = setTimeout(() => setCanSkip(true), skipAt);
    const fallback = setTimeout(finish, SOFT_INTRO_FALLBACK_MS);
    return () => {
      clearTimeout(skipReveal);
      clearTimeout(fallback);
    };
  }, [beginExit, finish, reduceMotion, quickHold, videoFailed]);

  useEffect(() => {
    return () => {
      if (exitTimer.current) clearTimeout(exitTimer.current);
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        beginExit();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [beginExit]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || reduceMotion || videoFailed) return;
    const play = video.play();
    if (play && typeof play.catch === "function") {
      play.catch(() => setVideoFailed(true));
    }
  }, [reduceMotion, videoFailed]);

  const rootClass = [
    styles.root,
    invitationFontVars,
    "invite-viewport-live",
    "safe-area-pt",
    "safe-area-pb",
    reduceMotion ? styles.static : "",
    exiting ? styles.exiting : "",
  ]
    .filter(Boolean)
    .join(" ");

  const showVideo = !reduceMotion && !videoFailed;

  return (
    <div
      role="button"
      tabIndex={0}
      className={rootClass}
      style={
        {
          ["--soft-accent"]: accentColor,
          ["--soft-secondary"]: secondaryColor,
        } as CSSProperties
      }
      onClick={beginExit}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          beginExit();
        }
      }}
      aria-label="Continue. Celeventic."
    >
      <p className={styles.srStatus} aria-live="polite">
        Preparing your invitation. Powered by Celeventic.
      </p>

      <div className={styles.atmosphere} aria-hidden>
        {showVideo ? (
          <video
            ref={videoRef}
            className={styles.introVideo}
            src={CELEVENTIC_INVITATION_INTRO_VIDEO}
            poster={CELEVENTIC_INVITATION_INTRO_POSTER}
            muted
            playsInline
            autoPlay
            preload="auto"
            onEnded={beginExit}
            onError={() => setVideoFailed(true)}
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
              />
            </div>
          </>
        )}
      </div>

      <div className={styles.glassMask} aria-hidden />
      <div className={styles.warmBloom} aria-hidden />

      {(!showVideo || canSkip) && (
        <div className={styles.stage}>
          <div className={styles.brandMark}>
            <Image src={logoUrl} alt="Celeventic" width={240} height={100} priority />
          </div>
          <p className={styles.motto}>{BRAND_MOTTO}</p>
        </div>
      )}

      {canSkip && !exiting && (
        <button
          type="button"
          className={styles.skipButton}
          onClick={(e) => {
            e.stopPropagation();
            beginExit();
          }}
        >
          Skip intro
        </button>
      )}
    </div>
  );
}
