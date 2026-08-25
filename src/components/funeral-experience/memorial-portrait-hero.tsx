"use client";

import { cn } from "@/lib/utils";
import styles from "./funeral-experience.module.css";

export function MemorialPortraitHero({
  photoUrl,
  givenName,
  familyName,
  fullName,
  aka,
  relationship,
  lifeDatesLabel,
  ageYears,
  eyebrow = "In Loving Memory",
  frameShape = "oval",
}: {
  photoUrl?: string | null;
  givenName?: string | null;
  familyName?: string | null;
  fullName: string;
  aka?: string | null;
  relationship?: string | null;
  lifeDatesLabel?: string | null;
  ageYears?: number | null;
  eyebrow?: string;
  frameShape?: "oval" | "circle" | "rect";
}) {
  const showSplit = Boolean(givenName && familyName);

  return (
    <header className={styles.hero}>
      <p className={cn(styles.gold, "text-[0.7rem] uppercase tracking-[0.28em] font-semibold")}>
        {eyebrow}
      </p>

      <div className={styles.portraitFrame} data-shape={frameShape}>
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt="" className={styles.portraitImg} />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center text-sm"
            style={{ color: "var(--funeral-muted)" }}
          >
            Portrait
          </div>
        )}
      </div>

      {relationship ? (
        <p className={cn(styles.muted, "text-sm mb-1")}>{relationship}</p>
      ) : null}

      {showSplit ? (
        <>
          <p className={cn(styles.script, "text-4xl sm:text-5xl leading-none")}>{givenName}</p>
          <h1 className={cn(styles.heading, "text-3xl sm:text-4xl font-bold uppercase tracking-wide mt-1")}>
            {familyName}
          </h1>
        </>
      ) : (
        <h1 className={cn(styles.heading, "text-3xl sm:text-4xl font-bold mt-1")}>{fullName}</h1>
      )}

      {aka ? (
        <p className={cn(styles.gold, "mt-2 text-xs uppercase tracking-[0.18em]")}>
          A.K.A. “{aka.replace(/^a\.?k\.?a\.?\s*/i, "").replace(/^["']|["']$/g, "")}”
        </p>
      ) : null}

      {lifeDatesLabel ? (
        <p className={cn(styles.muted, "mt-3 text-sm tracking-wide")}>{lifeDatesLabel}</p>
      ) : null}

      {typeof ageYears === "number" ? (
        <div className={styles.ageBadge} aria-label={`Aged ${ageYears} years`}>
          <small>Aged</small>
          <strong>{ageYears}</strong>
          <small>Years</small>
        </div>
      ) : null}

      <div className={styles.divider} aria-hidden />
    </header>
  );
}
