"use client";

import { useEffect } from "react";
import { forceUnlockRevealScroll, lockRevealScroll } from "@/lib/experience-engine/reveal-runtime";
import styles from "./luxury-fashion-flagship.module.css";

export function FashionFlyerExperience({
  houseName,
  flyerUrl,
  open,
  onClose,
}: {
  houseName: string;
  flyerUrl: string;
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const unlock = lockRevealScroll();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      unlock();
      forceUnlockRevealScroll();
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div
      className={styles.flyerExperience}
      role="dialog"
      aria-modal="true"
      aria-label={`${houseName} invitation flyer`}
      data-testid="fashion-flyer-experience"
    >
      <button
        type="button"
        className={styles.flyerClose}
        onClick={onClose}
        data-testid="fashion-flyer-close"
      >
        Close
      </button>
      <div className={styles.flyerSilk} aria-hidden />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={styles.flyerPhoto} src={flyerUrl} alt={`${houseName} invitation`} />
    </div>
  );
}
