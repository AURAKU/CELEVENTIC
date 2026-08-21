"use client";

import styles from "./funeral-experience.module.css";

export function FamilyAnnouncementBlock({
  text,
  heading = "Invitation",
}: {
  text: string;
  heading?: string;
}) {
  if (!text.trim()) return null;
  return (
    <section className="px-4 py-4 max-w-lg mx-auto w-full text-center">
      <p className={`${styles.gold} text-[0.7rem] uppercase tracking-[0.24em] font-semibold mb-3`}>
        {heading}
      </p>
      <p className={`${styles.muted} text-[0.95rem] leading-relaxed`}>{text}</p>
      <div className={styles.divider} aria-hidden />
    </section>
  );
}

export function MemorialClosing({
  deceasedName,
  lifeDatesLabel,
  line = "Forever in Our Hearts",
  farewell = "Rest in perfect peace.",
}: {
  deceasedName: string;
  lifeDatesLabel?: string | null;
  line?: string;
  farewell?: string;
}) {
  return (
    <section className="px-4 py-12 max-w-lg mx-auto w-full text-center">
      <div className={styles.divider} aria-hidden />
      <p className={`${styles.gold} text-xs uppercase tracking-[0.28em] mt-6`}>{line}</p>
      <p className={`${styles.heading} text-2xl mt-3`}>{deceasedName}</p>
      {lifeDatesLabel ? <p className={`${styles.muted} text-sm mt-2`}>{lifeDatesLabel}</p> : null}
      {farewell ? <p className={`${styles.muted} text-sm mt-4 italic`}>{farewell}</p> : null}
      <p className={`${styles.muted} text-[10px] uppercase tracking-[0.2em] mt-10`}>
        Created with Celeventic
      </p>
    </section>
  );
}
