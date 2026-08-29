"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, MapPin, Store } from "lucide-react";
import { lockRevealScroll } from "@/lib/experience-engine/reveal-runtime";
import {
  fashionHouseLogoSrc,
  resolveFashionFlyerCard,
  resolveFashionVisionStore,
  type FashionLookbookItem,
  type FashionNavDestination,
  type LuxuryFashionHouseConfig,
} from "@/lib/experience/luxury-fashion";
import { FashionDressIcon } from "./fashion-dress-icon";
import { FashionVisionStore } from "./fashion-vision-store";
import styles from "./luxury-fashion-flagship.module.css";

const PORTALS: Array<{
  id: FashionNavDestination;
  label: string;
  Icon: typeof Store;
}> = [
  { id: "store-preview", label: "The flagship store", Icon: Store },
  { id: "collection", label: "The collection", Icon: FashionDressIcon },
  { id: "event-details", label: "Opening details", Icon: CalendarDays },
  { id: "location", label: "The location", Icon: MapPin },
];

export function FashionBoutiqueExperience({
  house,
  looks,
  open,
  available,
  onClose,
  onSelect,
}: {
  house: LuxuryFashionHouseConfig;
  looks?: FashionLookbookItem[];
  open: boolean;
  available?: FashionNavDestination[];
  onClose: () => void;
  onSelect: (id: FashionNavDestination) => void;
}) {
  const [mounted, setMounted] = useState(false);
  const cardSrc = useMemo(() => resolveFashionFlyerCard(house), [house]);
  const visionOpen = resolveFashionVisionStore(house);
  const logoSrc = useMemo(() => fashionHouseLogoSrc(house), [house]);
  const visionLooks = useMemo(() => {
    const clothing = (house.lookbookItems ?? []).filter(
      (item) => item.type === "image" && Boolean(item.url) && !/\.(mp4|webm|mov)(\?|$)/i.test(item.url)
    );
    const source = clothing.length ? clothing : looks ?? [];
    return source.filter(
      (item) => item.type === "image" && Boolean(item.url) && !/\.(mp4|webm|mov)(\?|$)/i.test(item.url)
    );
  }, [house.lookbookItems, looks]);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  if (!open || !mounted) return null;

  const node = (
    <div
      className={styles.boutique}
      role="dialog"
      aria-modal="true"
      aria-label={`${house.houseName} boutique`}
      data-testid="fashion-boutique-experience"
      data-vision={visionOpen ? "true" : "false"}
    >
      <button type="button" className={styles.boutiqueClose} onClick={onClose} data-testid="fashion-boutique-close">
        Close
      </button>
      <div className={styles.boutiqueCorridor} aria-hidden>
        <span className={styles.boutiqueRail} />
        <span className={styles.boutiqueDepth} />
      </div>
      <div className={styles.boutiqueInner}>
        <p className={styles.kicker}>{house.houseName}</p>
        <h2 className={styles.heading}>Step inside</h2>
        <div className={styles.boutiqueStage}>
          {visionOpen ? (
            <FashionVisionStore
              houseName={house.houseName}
              logoSrc={logoSrc}
              kicker={house.visionStoreKicker || "Online vision store"}
              title={house.visionStoreTitle || "The house, in your hands"}
              line={house.visionStoreLine || "A first look at shopping the collection from anywhere."}
              deliveryLine={house.visionStoreDeliveryLine || "Nationwide delivery"}
              soonLabel={house.visionStoreSoonLabel || "Opening soon"}
              looks={visionLooks}
            />
          ) : null}
          {cardSrc ? (
            <figure className={styles.boutiqueCard} data-testid="fashion-boutique-invitation">
              <div className={styles.boutiqueCardStage}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={cardSrc} alt="Invitation card" />
                <span className={styles.boutiqueCardSheen} aria-hidden />
              </div>
            </figure>
          ) : null}
        </div>
        {visionOpen ? null : <p className={styles.lede}>A first corridor. Choose a room.</p>}
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
    </div>
  );

  return createPortal(node, document.body);
}
