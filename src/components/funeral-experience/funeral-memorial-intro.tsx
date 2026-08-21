"use client";

import { useEffect, useState } from "react";
import type { FuneralIntroId, FuneralMotionLevel } from "@/lib/funeral-experience/themes";
import { introStorageKey } from "@/lib/funeral-experience/experience-resolver";
import styles from "./funeral-experience.module.css";

export type FuneralIntroProps = {
  memorialKey: string;
  introId: FuneralIntroId;
  deceasedName: string;
  lifeDatesLabel?: string;
  familyLine?: string;
  photoUrl?: string | null;
  memoryPhotos?: string[];
  motion: FuneralMotionLevel;
  /** always | once | disabled */
  policy?: "always" | "once" | "disabled";
  onEnter: () => void;
  onReplayReady?: (replay: () => void) => void;
};

const INTRO_COPY: Record<
  Exclude<FuneralIntroId, "instant">,
  { eyebrow: string; hint: string }
> = {
  "candle-remembrance": {
    eyebrow: "In Loving Memory",
    hint: "A quiet light for remembrance. Enter when you are ready.",
  },
  "heavenly-reveal": {
    eyebrow: "Forever in Our Hearts",
    hint: "Soft light and peace. Sound starts only if you choose it.",
  },
  "ghanaian-regal": {
    eyebrow: "Funeral Invitation",
    hint: "With honour and tradition. Enter the memorial when ready.",
  },
  "floral-reveal": {
    eyebrow: "In Loving Memory",
    hint: "Grace and love. Enter the memorial when you are ready.",
  },
  "memory-journey": {
    eyebrow: "A Life Well Lived",
    hint: "A brief journey through cherished moments.",
  },
  "minimal-memorial": {
    eyebrow: "In Remembrance",
    hint: "A simple memorial opening.",
  },
};

export function FuneralMemorialIntro({
  memorialKey,
  introId,
  deceasedName,
  lifeDatesLabel,
  familyLine,
  photoUrl,
  memoryPhotos = [],
  motion,
  policy = "once",
  onEnter,
  onReplayReady,
}: FuneralIntroProps) {
  const [visible, setVisible] = useState(false);
  const [phase, setPhase] = useState(0);
  const reduce = motion === "none" || motion === "minimal";

  function finish(persist: boolean) {
    if (persist && policy === "once") {
      try {
        localStorage.setItem(introStorageKey(memorialKey), "1");
      } catch {
        /* ignore */
      }
    }
    setVisible(false);
    onEnter();
  }

  function showIntro() {
    setPhase(0);
    setVisible(true);
  }

  useEffect(() => {
    onReplayReady?.(() => {
      try {
        localStorage.removeItem(introStorageKey(memorialKey));
      } catch {
        /* ignore */
      }
      showIntro();
    });
  }, [memorialKey, onReplayReady]);

  useEffect(() => {
    if (policy === "disabled" || introId === "instant") {
      onEnter();
      return;
    }
    if (policy === "once" && typeof window !== "undefined") {
      try {
        if (localStorage.getItem(introStorageKey(memorialKey)) === "1") {
          onEnter();
          return;
        }
      } catch {
        /* ignore */
      }
    }
    setVisible(true);
  }, [introId, memorialKey, onEnter, policy]);

  useEffect(() => {
    if (!visible || reduce) return;
    const timers = [
      window.setTimeout(() => setPhase(1), 700),
      window.setTimeout(() => setPhase(2), 1600),
      window.setTimeout(() => setPhase(3), 2600),
    ];
    return () => timers.forEach(clearTimeout);
  }, [visible, reduce]);

  if (!visible) return null;

  const copy = INTRO_COPY[introId === "instant" ? "minimal-memorial" : introId];
  const isCandle = introId === "candle-remembrance";
  const isHeaven = introId === "heavenly-reveal";
  const isRegal = introId === "ghanaian-regal";
  const isFloral = introId === "floral-reveal";
  const isJourney = introId === "memory-journey";
  const isMinimal = introId === "minimal-memorial";
  const journeySrc = memoryPhotos[Math.min(phase, Math.max(memoryPhotos.length - 1, 0))] || photoUrl;

  return (
    <div
      className={styles.introRoot}
      role="dialog"
      aria-modal="true"
      aria-label="Memorial introduction"
      data-intro={introId}
      data-phase={reduce ? 3 : phase}
      data-motion={motion}
    >
      {isHeaven ? <div className={styles.introClouds} aria-hidden /> : null}
      {isHeaven ? <div className={styles.introRays} aria-hidden /> : null}
      {isHeaven ? <div className={styles.introDove} aria-hidden /> : null}
      {isRegal ? <div className={styles.introTextile} aria-hidden /> : null}
      {isRegal ? <div className={styles.introGoldLine} aria-hidden /> : null}
      {isFloral ? <div className={styles.introFloral} aria-hidden /> : null}
      {isFloral && !reduce ? <div className={styles.introPetals} aria-hidden /> : null}
      {isCandle ? <div className={styles.introCandleBg} aria-hidden /> : null}
      {isMinimal ? <div className={styles.introMinimalBg} aria-hidden /> : null}
      {isJourney ? <div className={styles.introJourneyBg} aria-hidden /> : null}

      <div className={`${styles.introContent} relative z-10 max-w-md space-y-4 px-2`}>
        {isCandle && !reduce ? <div className={styles.introFlame} aria-hidden /> : null}

        {(isJourney || isFloral || isHeaven || isRegal) && (journeySrc || photoUrl) ? (
          <div
            className={styles.introPortrait}
            data-visible={reduce || phase >= 2 ? "1" : "0"}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={journeySrc || photoUrl || ""} alt="" />
          </div>
        ) : null}

        <p className={styles.introEyebrow}>{copy.eyebrow}</p>

        {isRegal && familyLine ? (
          <p className={styles.introFamily}>{familyLine}</p>
        ) : null}

        {isRegal ? (
          <p className={styles.introInvite}>Invite you to celebrate the life of</p>
        ) : null}

        <h1 className={styles.introName}>{deceasedName}</h1>

        {lifeDatesLabel ? <p className={styles.introDates}>{lifeDatesLabel}</p> : null}

        <p className={styles.introHint}>{copy.hint}</p>
      </div>

      <div className={styles.introControls}>
        <button type="button" className={styles.btnPrimary} onClick={() => finish(true)}>
          Enter Memorial
        </button>
        <button type="button" className={styles.btnGhost} onClick={() => finish(true)}>
          Skip Intro
        </button>
      </div>
    </div>
  );
}
