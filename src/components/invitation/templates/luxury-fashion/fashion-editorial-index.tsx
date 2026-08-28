"use client";

import {
  CalendarDays,
  DoorOpen,
  Instagram,
  Mail,
  MapPin,
  Shirt,
  Store,
  type LucideIcon,
} from "lucide-react";
import type { FashionNavDestination, FashionNavLabel } from "@/lib/experience/luxury-fashion";
import styles from "./luxury-fashion-flagship.module.css";

const ICONS: Record<FashionNavDestination, LucideIcon> = {
  experience: DoorOpen,
  "store-preview": Store,
  collection: Shirt,
  rsvp: Mail,
  location: MapPin,
  "event-details": CalendarDays,
  share: Mail,
  social: Instagram,
};

export function FashionEditorialIndex({
  labels,
  current,
  onSelect,
}: {
  labels: FashionNavLabel[];
  current?: FashionNavDestination;
  onSelect: (id: FashionNavDestination) => void;
}) {
  const folio = labels.filter((item) => item.id !== "share");

  return (
    <nav className={styles.index} aria-label="Invitation index" data-testid="fashion-nav">
      {folio.map((item) => {
        const Icon = ICONS[item.id];
        return (
          <button
            key={item.id}
            type="button"
            className={styles.tag}
            aria-current={current === item.id ? "true" : undefined}
            onClick={() => onSelect(item.id)}
          >
            <Icon size={16} strokeWidth={1.25} aria-hidden />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
