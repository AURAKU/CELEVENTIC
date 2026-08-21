"use client";

import { MapPin } from "lucide-react";
import styles from "./funeral-experience.module.css";

export type ProgrammeItemView = {
  id?: string;
  dayLabel?: string | null;
  title: string;
  description?: string | null;
  startTime?: string | null;
  venue?: string | null;
};

export function FuneralProgrammeTimeline({
  items,
  heading = "Funeral Arrangements",
}: {
  items: ProgrammeItemView[];
  heading?: string;
}) {
  if (!items.length) return null;

  return (
    <section className="px-4 py-6 max-w-lg mx-auto w-full">
      <h2 className={`${styles.heading} text-lg mb-4`}>{heading}</h2>
      <ol className={styles.programmeList}>
        {items.map((item, i) => (
          <li key={item.id || `${item.title}-${i}`} className={styles.programmeItem}>
            {item.dayLabel ? <p className={styles.programmeDay}>{item.dayLabel}</p> : null}
            <p className={styles.programmeTitle}>{item.title}</p>
            {item.startTime ? (
              <p className={`${styles.muted} text-sm mt-1`}>{item.startTime}</p>
            ) : null}
            {item.description ? (
              <p className={`${styles.muted} text-sm mt-1 leading-relaxed`}>{item.description}</p>
            ) : null}
            {item.venue ? (
              <p className={`${styles.muted} mt-2 inline-flex items-center gap-1.5 text-xs`}>
                <MapPin className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--funeral-gold)" }} />
                {item.venue}
              </p>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
