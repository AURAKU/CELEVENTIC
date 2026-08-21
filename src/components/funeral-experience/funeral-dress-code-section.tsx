"use client";

import styles from "./funeral-experience.module.css";

export type DressCodeDay = {
  day: string;
  label: string;
  colors: string[];
  note?: string;
};

const DEFAULT_SWATCH: Record<string, string> = {
  black: "#111111",
  red: "#B91C1C",
  white: "#F8FAFC",
  gold: "#D4AF37",
  burgundy: "#6B1D32",
};

export function FuneralDressCodeSection({
  days,
  heading = "Dress Code",
}: {
  days: DressCodeDay[];
  heading?: string;
}) {
  if (!days.length) return null;

  return (
    <section className="px-4 py-6 max-w-lg mx-auto w-full">
      <h2 className={`${styles.heading} text-lg mb-4`}>{heading}</h2>
      <div className={styles.dressGrid}>
        {days.map((d) => (
          <article key={d.day} className={styles.dressCard}>
            <p className={styles.programmeDay}>{d.day}</p>
            <div className={styles.swatches} aria-hidden>
              {d.colors.map((c) => (
                <span
                  key={c}
                  className={styles.swatch}
                  style={{ background: DEFAULT_SWATCH[c.toLowerCase()] || c }}
                />
              ))}
            </div>
            <p className={`${styles.heading} text-sm`}>{d.label}</p>
            {d.note ? <p className={`${styles.muted} text-xs mt-1`}>{d.note}</p> : null}
          </article>
        ))}
      </div>
    </section>
  );
}
