"use client";

import { useEffect } from "react";
import { CalendarDays, MapPin, Shirt, Store } from "lucide-react";
import { lockRevealScroll } from "@/lib/experience-engine/reveal-runtime";
import type { FashionNavDestination } from "@/lib/experience/luxury-fashion";
import styles from "./luxury-fashion-flagship.module.css";

const PORTALS: Array<{
  id: FashionNavDestination;
  label: string;
  Icon: typeof Store;
}> = [
  { id: "store-preview", label: "The store", Icon: Store },
  { id: "collection", label: "The collection", Icon: Shirt },
  { id: "event-details", label: "Opening details", Icon: CalendarDays },
  { id: "location", label: "The house", Icon: MapPin },
];

export function FashionBoutiqueExperience({
  houseName,
  open,
  available,
  onClose,
  onSelect,
}: {
  houseName: string;
  open: boolean;
  available?: FashionNavDestination[];
  onClose: () => void;
  onSelect: (id: FashionNavDestination) => void;
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
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div
      className={styles.boutique}
      role="dialog"
      aria-modal="true"
      aria-label={`${houseName} boutique`}
      data-testid="fashion-boutique-experience"
    >
      <button type="button" className={styles.boutiqueClose} onClick={onClose} data-testid="fashion-boutique-close">
        Close
      </button>
      <div className={styles.boutiqueCorridor} aria-hidden>
        <span className={styles.boutiqueRail} />
        <span className={styles.boutiqueDepth} />
      </div>
      <p className={styles.kicker}>{houseName}</p>
      <h2 className={styles.heading}>Step inside</h2>
      <p className={styles.lede}>A first corridor. Choose a room.</p>
      <div className={styles.boutiqueGrid}>
        {PORTALS.filter((portal) => !available || available.includes(portal.id)).map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            className={styles.boutiqueDoor}
            onClick={() => {
              onSelect(id);
              onClose();
            }}
          >
            <Icon size={18} strokeWidth={1.25} aria-hidden />
            {label}
          </button>
        ))}
      </div>
      <button type="button" className={styles.cta} onClick={onClose}>
        Return to the invitation
      </button>
    </div>
  );
}
