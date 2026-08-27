"use client";

import type { FashionNavDestination, FashionNavLabel } from "@/lib/experience/luxury-fashion";
import styles from "./luxury-fashion-flagship.module.css";

export function FashionEditorialIndex({
  labels,
  current,
  onSelect,
}: {
  labels: FashionNavLabel[];
  current?: FashionNavDestination;
  onSelect: (id: FashionNavDestination) => void;
}) {
  return (
    <nav className={styles.index} aria-label="Invitation index" data-testid="fashion-nav">
      {labels.map((item) => (
        <button
          key={item.id}
          type="button"
          aria-current={current === item.id ? "true" : undefined}
          onClick={() => onSelect(item.id)}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}
