"use client";

import { useEffect, useState } from "react";
import type { FashionLookbookItem } from "@/lib/experience/luxury-fashion";
import { lockRevealScroll } from "@/lib/experience-engine/reveal-runtime";
import styles from "./luxury-fashion-flagship.module.css";

export function FashionStoreBrowse({
  items,
  onOpen,
}: {
  items: FashionLookbookItem[];
  onOpen?: () => void;
}) {
  const [focus, setFocus] = useState<FashionLookbookItem | null>(null);

  useEffect(() => {
    if (!focus) return;
    const unlock = lockRevealScroll();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setFocus(null);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      unlock();
    };
  }, [focus]);

  if (!items.length) {
    return (
      <div className={styles.placeholder} data-testid="fashion-store-browse-empty">
        <p>Store stills will appear here when the organizer adds gallery images in Studio.</p>
      </div>
    );
  }

  return (
    <div data-testid="fashion-store-browse">
      <div className={styles.storeStrip}>
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className={styles.storeStill}
            onClick={() => {
              setFocus(item);
              onOpen?.();
            }}
          >
            {item.type === "video" ? (
              <video src={item.url} poster={item.posterUrl ?? undefined} muted playsInline preload="metadata" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.url} alt={item.caption || "Store still"} loading="lazy" />
            )}
            <span>{item.caption}</span>
          </button>
        ))}
      </div>
      {focus ? (
        <div className={styles.focus} role="dialog" aria-modal="true" aria-label={focus.caption || "Store preview"}>
          <button type="button" className={styles.focusClose} onClick={() => setFocus(null)}>
            Close
          </button>
          {focus.type === "video" ? (
            <video src={focus.url} poster={focus.posterUrl ?? undefined} controls playsInline />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={focus.url} alt={focus.caption || "Store still"} />
          )}
        </div>
      ) : null}
    </div>
  );
}
