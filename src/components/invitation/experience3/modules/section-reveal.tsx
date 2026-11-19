"use client";

import type { ReactNode } from "react";
import styles from "./section-reveal.module.css";

export function Experience3SectionReveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: 0 | 1 | 2 | 3;
  className?: string;
}) {
  const delayClass =
    delay === 1
      ? styles.revealDelay1
      : delay === 2
        ? styles.revealDelay2
        : delay === 3
          ? styles.revealDelay3
          : "";
  return <div className={[styles.reveal, delayClass, className].filter(Boolean).join(" ")}>{children}</div>;
}
