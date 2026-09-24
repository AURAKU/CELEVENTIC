"use client";

import { useCallback, useEffect } from "react";
import { useReducedMotion } from "framer-motion";
import { invitationFontVars } from "@/lib/invitation-fonts";
import styles from "./aurelia-editorial-opening.module.css";

export function AureliaEditorialOpening({
  monogram,
  embedded,
  allowSkip,
  onBegin,
  onComplete,
}: {
  monogram: string;
  eventTitle?: string;
  guestName?: string;
  embedded?: boolean;
  allowSkip?: boolean;
  onBegin?: () => void;
  onComplete: () => void;
}) {
  const reduceMotion = useReducedMotion();

  const open = useCallback(() => {
    onBegin?.();
    onComplete();
  }, [onBegin, onComplete]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        open();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <section
      className={`${styles.veil} ${invitationFontVars}`}
      data-embedded={embedded ? "true" : "false"}
      data-aurelia-opening="true"
      data-testid="aurelia-editorial-opening"
      data-reduced-motion={reduceMotion ? "true" : "false"}
    >
      <div>
        <p className={styles.monogram}>{monogram}</p>
        <p className={styles.line}>Together, a new chapter begins</p>
        <button type="button" className={styles.open} onClick={open}>
          Tap to Open
        </button>
        {allowSkip ? (
          <button type="button" className={styles.skip} onClick={open}>
            Continue
          </button>
        ) : null}
      </div>
    </section>
  );
}
