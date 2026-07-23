"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import { useReducedMotion } from "framer-motion";
import { BRAND_MOTTO } from "@/lib/constants";
import { CELEVENTIC_LOGO_FULL, CELEVENTIC_PALETTE } from "@/lib/experience/celeventic-palette";
import { invitationFontVars } from "@/lib/invitation-fonts";
import {
  SOFT_INTRO_EXIT_MS,
  SOFT_INTRO_FALLBACK_MS,
  softIntroHoldMs,
} from "@/lib/experience-engine/soft-intro";
import { resolveMediaUrl, shouldUnoptimizeNextImage } from "@/lib/uploads/media-url";
import styles from "./celeventic-soft-intro.module.css";

/** Particle seeds — positions + palette roles for a calm idle loop. */
const PARTICLE_SEEDS = [
  { left: 12, top: 22, size: 3, delay: 0, role: "gold" as const },
  { left: 78, top: 18, size: 4, delay: 0.4, role: "accent" as const },
  { left: 24, top: 68, size: 2, delay: 0.9, role: "secondary" as const },
  { left: 86, top: 58, size: 3, delay: 1.2, role: "gold" as const },
  { left: 48, top: 14, size: 2, delay: 0.2, role: "accent" as const },
  { left: 62, top: 74, size: 4, delay: 1.6, role: "secondary" as const },
  { left: 18, top: 44, size: 2, delay: 0.7, role: "gold" as const },
  { left: 72, top: 40, size: 3, delay: 1.1, role: "accent" as const },
  { left: 38, top: 82, size: 2, delay: 1.8, role: "gold" as const },
  { left: 54, top: 52, size: 3, delay: 0.5, role: "secondary" as const },
];

export interface CeleventicSoftIntroProps {
  onComplete: () => void;
  logoUrl?: string;
  /** Event / layout imagery used as layered atmosphere (not a flat plate) */
  atmosphereUrl?: string | null;
  accentColor?: string;
  secondaryColor?: string;
}

/**
 * Platform soft launch — cinematic brand + event atmosphere.
 * Event title + begin CTA live on the tap gate (no duplicated instructions).
 * Auto-advances (~3.2s); tap / Enter / Space skip with crossfade exit.
 */
export function CeleventicSoftIntro({
  onComplete,
  logoUrl = CELEVENTIC_LOGO_FULL,
  atmosphereUrl,
  accentColor = CELEVENTIC_PALETTE.teal,
  secondaryColor = CELEVENTIC_PALETTE.gold,
}: CeleventicSoftIntroProps) {
  const reduceMotion = useReducedMotion();
  const [exiting, setExiting] = useState(false);
  const completed = useRef(false);
  const exitingRef = useRef(false);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resolvedAtmosphere = useMemo(() => {
    const url = atmosphereUrl?.trim();
    return url ? resolveMediaUrl(url) : null;
  }, [atmosphereUrl]);

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
    invitationFontVars,
    "invite-viewport-live",
    "safe-area-pt",
    "safe-area-pb",
    reduceMotion ? styles.static : "",
    exiting ? styles.exiting : "",
  ]
    .filter(Boolean)
    .join(" ");

  const particleColor = (role: (typeof PARTICLE_SEEDS)[number]["role"]) => {
    if (role === "accent") return accentColor;
    if (role === "secondary") return secondaryColor;
    return CELEVENTIC_PALETTE.gold;
  };

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
        {resolvedAtmosphere ? (
          <>
            <div className={styles.atmosphereBlur}>
              <Image
                src={resolvedAtmosphere}
                alt=""
                fill
                sizes="100vw"
                priority
                unoptimized={shouldUnoptimizeNextImage(resolvedAtmosphere)}
              />
            </div>
            <div className={styles.atmospherePlate}>
              <Image
                src={resolvedAtmosphere}
                alt=""
                fill
                sizes="100vw"
                priority
                unoptimized={shouldUnoptimizeNextImage(resolvedAtmosphere)}
              />
            </div>
          </>
        ) : (
          <div className={styles.atmosphereFallback} />
        )}
      </div>

      <div className={styles.glassMask} aria-hidden />
      <div className={styles.warmBloom} aria-hidden />
      <div className={styles.scan} aria-hidden />
      <div className={styles.horizon} aria-hidden />

      {!reduceMotion ? (
        <div className={styles.particles} aria-hidden>
          {PARTICLE_SEEDS.map((p, i) => (
            <span
              key={i}
              className={styles.particle}
              style={{
                left: `${p.left}%`,
                top: `${p.top}%`,
                width: p.size,
                height: p.size,
                background: particleColor(p.role),
                animationDelay: `${p.delay}s`,
                boxShadow: `0 0 ${8 + p.size * 2}px ${particleColor(p.role)}55`,
              }}
            />
          ))}
        </div>
      ) : null}

      <div className={styles.stage}>
        <div className={styles.brandMark}>
          <Image src={logoUrl} alt="Celeventic" width={240} height={100} priority />
        </div>
        <p className={styles.motto}>{BRAND_MOTTO}</p>
      </div>
    </div>
  );
}
