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
  motion: FuneralMotionLevel;
  /** always | once | disabled */
  policy?: "always" | "once" | "disabled";
  onEnter: () => void;
};

export function FuneralMemorialIntro({
  memorialKey,
  introId,
  deceasedName,
  lifeDatesLabel,
  familyLine,
  motion,
  policy = "once",
  onEnter,
}: FuneralIntroProps) {
  const [visible, setVisible] = useState(false);
  const reduce = motion === "none";

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

  if (!visible) return null;

  const isCandle = introId === "candle-remembrance";
  const isHeaven = introId === "heavenly-reveal";
  const isRegal = introId === "ghanaian-regal";
  const isFloral = introId === "floral-reveal";

  return (
    <div
      className={styles.introRoot}
      role="dialog"
      aria-modal="true"
      aria-label="Memorial introduction"
      data-intro={introId}
    >
      {isHeaven ? <div className={styles.introClouds} aria-hidden /> : null}
      {isRegal ? <div className={styles.introTextile} aria-hidden /> : null}

      <div className="relative z-10 max-w-md space-y-4 px-2">
        {isCandle && !reduce ? <div className={styles.introFlame} aria-hidden /> : null}

        <p className="text-xs uppercase tracking-[0.28em] text-[#D4AF37]">
          {isHeaven
            ? "Forever in Our Hearts"
            : isFloral
              ? "In Loving Memory"
              : isRegal
                ? "Funeral Invitation"
                : "In Loving Memory"}
        </p>

        {isRegal && familyLine ? (
          <p className="text-sm leading-relaxed text-stone-300">{familyLine}</p>
        ) : null}

        <h1
          className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-[#F5F0E8]"
          style={{ fontFamily: "var(--funeral-heading-font, Georgia, serif)" }}
        >
          {deceasedName}
        </h1>

        {lifeDatesLabel ? (
          <p className="text-sm tracking-wide text-[#D4AF37]">{lifeDatesLabel}</p>
        ) : null}

        <p className="text-xs text-stone-400">
          Enter when you are ready. Sound starts only if you choose it.
        </p>
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
