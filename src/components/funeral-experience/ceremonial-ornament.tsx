"use client";

import styles from "./funeral-experience.module.css";

/** Tasteful original ornaments — not copied from reference artwork. */
export function CeremonialOrnament({
  variant = "line",
}: {
  variant?: "line" | "flourish" | "heritage" | "cross";
}) {
  if (variant === "cross") {
    return (
      <div className={styles.ornament} aria-hidden>
        <svg width="28" height="36" viewBox="0 0 28 36" fill="none">
          <path
            d="M14 2v32M6 12h16"
            stroke="var(--funeral-gold)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </div>
    );
  }

  if (variant === "heritage") {
    return (
      <div className={styles.ornament} aria-hidden>
        <svg width="120" height="12" viewBox="0 0 120 12" fill="none">
          <path
            d="M2 6h20l6-4 6 4h20l6 4 6-4h34l6 4 6-4h14"
            stroke="var(--funeral-gold)"
            strokeWidth="1.2"
            opacity="0.85"
          />
        </svg>
      </div>
    );
  }

  if (variant === "flourish") {
    return (
      <div className={styles.ornament} aria-hidden>
        <svg width="80" height="16" viewBox="0 0 80 16" fill="none">
          <path
            d="M4 8c8-8 16-8 24 0s16 8 24 0 16-8 24 0"
            stroke="var(--funeral-gold)"
            strokeWidth="1.2"
            fill="none"
          />
        </svg>
      </div>
    );
  }

  return <div className={styles.divider} aria-hidden />;
}
