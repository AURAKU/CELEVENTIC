"use client";

import { useState } from "react";
import styles from "./funeral-experience.module.css";

const FLOWERS = [
  { id: "rose", label: "Rose" },
  { id: "lily", label: "Lily" },
  { id: "white", label: "White Flower" },
] as const;

/**
 * Symbolic flower tribute only — no marketplace checkout.
 * Persists locally per memorial so guests can leave a gentle gesture.
 */
export function FlowerTribute({
  memorialKey,
  deceasedName,
  enabled = true,
}: {
  memorialKey: string;
  deceasedName: string;
  enabled?: boolean;
}) {
  const storageKey = `celeventic.funeral.flower.${memorialKey}`;
  const [chosen, setChosen] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      return localStorage.getItem(storageKey);
    } catch {
      return null;
    }
  });

  if (!enabled) return null;

  function leave(id: string) {
    try {
      localStorage.setItem(storageKey, id);
    } catch {
      /* ignore */
    }
    setChosen(id);
  }

  return (
    <section className="px-4 py-6 max-w-lg mx-auto w-full text-center">
      <h2 className={`${styles.heading} text-lg mb-2`}>Leave a Flower</h2>
      <p className={`${styles.muted} text-sm mb-4`}>
        A quiet symbolic gesture in remembrance of {deceasedName}.
      </p>
      {chosen ? (
        <p className={`${styles.gold} text-sm`}>
          Thank you — your {FLOWERS.find((f) => f.id === chosen)?.label ?? "flower"} has been left in
          remembrance.
        </p>
      ) : (
        <div className="flex flex-wrap justify-center gap-2">
          {FLOWERS.map((f) => (
            <button key={f.id} type="button" className={styles.btnGhost} onClick={() => leave(f.id)}>
              {f.label}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
