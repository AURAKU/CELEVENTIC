"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useReducedMotion } from "framer-motion";
import { CELEVENTIC_LOGO_FULL } from "@/lib/experience/celeventic-palette";
import {
  SOFT_INTRO_EXIT_MS,
  SOFT_INTRO_FALLBACK_MS,
  softIntroHoldMs,
} from "@/lib/experience-engine/soft-intro";
import styles from "./celeventic-soft-intro.module.css";

/** Vertical filament positions (%). Accent indices get gold/teal treatment. */
const FILAMENT_LEFTS = [
  4, 9, 14, 19, 24, 29, 34, 39, 44, 48, 52, 56, 61, 66, 71, 76, 81, 86, 91, 96,
];
const ACCENT_INDEX = new Set([3, 7, 10, 13, 16]);

export interface CeleventicSoftIntroProps {
  onComplete: () => void;
  logoUrl?: string;
  /** Optional one-line microcopy under the logo */
  microcopy?: string;
}

/**
 * Platform-level Celeventic soft launch — always before template DNA intros / reveals.
 * Auto-advances, or continue on tap / click / Enter / Space. Never blocks forever.
 */
export function CeleventicSoftIntro({
  onComplete,
  logoUrl = CELEVENTIC_LOGO_FULL,
  microcopy = "An experience awaits",
}: CeleventicSoftIntroProps) {
  const reduceMotion = useReducedMotion();
  const [exiting, setExiting] = useState(false);
  const completed = useRef(false);
  const exitingRef = useRef(false);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const finish = useCallback(() => {
    if (completed.current) return;
    completed.current = true;
    if (exitTimer.current) clearTimeout(exitTimer.current);
    onComplete();
  }, [onComplete]);

  const beginExit = useCallback(() => {
    // Refs avoid re-creating beginExit on setState (which would clear exit timers).
    if (completed.current || exitingRef.current) return;
    exitingRef.current = true;
    setExiting(true);
    const delay = reduceMotion ? 0 : SOFT_INTRO_EXIT_MS;
    exitTimer.current = setTimeout(finish, delay);
  }, [finish, reduceMotion]);

  useEffect(() => {
    const hold = softIntroHoldMs(Boolean(reduceMotion));
    const auto = setTimeout(() => beginExit(), hold);
    // Hard fallback so a stuck exit never blanks the guest forever.
    const fallback = setTimeout(finish, SOFT_INTRO_FALLBACK_MS);
    return () => {
      clearTimeout(auto);
      clearTimeout(fallback);
    };
  }, [beginExit, finish, reduceMotion]);

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

  const rootClass = [
    styles.root,
    "invite-viewport-live",
    "safe-area-pt",
    "safe-area-pb",
    reduceMotion ? styles.static : "",
    exiting ? styles.exiting : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      role="button"
      tabIndex={0}
      className={rootClass}
      onClick={beginExit}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          beginExit();
        }
      }}
      aria-label="Continue to invitation. Powered by Celeventic."
    >
      <p className={styles.srStatus} aria-live="polite">
        Preparing your invitation. Powered by Celeventic.
      </p>

      <div className={styles.filaments} aria-hidden>
        {FILAMENT_LEFTS.map((left, i) => (
          <span
            key={left}
            className={`${styles.filament} ${ACCENT_INDEX.has(i) ? styles.filamentAccent : ""}`}
            style={{
              left: `${left}%`,
              animationDelay: `${(i % 7) * 0.18}s`,
            }}
          />
        ))}
      </div>
      <div className={styles.veil} aria-hidden />
      <div className={styles.logoGlow} aria-hidden />

      <div className={styles.stage}>
        <div className={styles.logoWrap}>
          <Image
            src={logoUrl}
            alt="Celeventic"
            width={240}
            height={100}
            className="w-[200px] sm:w-[220px] h-auto object-contain"
            priority
          />
        </div>
        {microcopy ? <p className={styles.microcopy}>{microcopy}</p> : null}
        <p className={styles.powered}>
          Powered by <em>Celeventic</em>
        </p>
      </div>

      {!reduceMotion && !exiting ? (
        <p className={styles.hint} aria-hidden>
          Tap to continue
        </p>
      ) : null}
    </div>
  );
}
