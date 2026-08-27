"use client";

import { useEffect, useMemo, useState } from "react";
import type { FashionLookbookItem } from "@/lib/experience/luxury-fashion";
import { lockRevealScroll } from "@/lib/experience-engine/reveal-runtime";
import styles from "./luxury-fashion-flagship.module.css";

const PAGE_SIZE = 6;

export function EditorialLookbook({
  title,
  items,
  onOpen,
}: {
  title: string;
  items: FashionLookbookItem[];
  onOpen?: () => void;
}) {
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [focus, setFocus] = useState<FashionLookbookItem | null>(null);
  const slice = useMemo(() => items.slice(0, visible), [items, visible]);

  useEffect(() => {
    if (!focus) return;
    const unlock = lockRevealScroll();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setFocus(null);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      unlock();
    };
  }, [focus]);

  if (!items.length) {
    return (
      <div className={styles.placeholder} data-testid="fashion-lookbook-empty">
        <p>Collection stills will appear here when the organizer adds them.</p>
      </div>
    );
  }

  return (
    <div data-testid="fashion-lookbook">
      <div className={styles.lookbook}>
        {slice.map((item) => (
          <button
            key={item.id}
            type="button"
            className={styles.look}
            onClick={() => {
              setFocus(item);
              onOpen?.();
            }}
          >
            <figure>
              {item.type === "video" ? (
                <video src={item.url} poster={item.posterUrl ?? undefined} muted playsInline preload="metadata" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.url} alt={item.caption || item.collectionName || title} loading="lazy" />
              )}
              <figcaption>
                {item.collectionName ? `${item.collectionName} · ` : ""}
                {item.caption || "Look"}
              </figcaption>
            </figure>
          </button>
        ))}
      </div>
      {visible < items.length ? (
        <button
          type="button"
          className={styles.cta}
          style={{ marginTop: "1rem" }}
          onClick={() => setVisible((n) => n + PAGE_SIZE)}
        >
          View more looks
        </button>
      ) : null}
      {focus ? (
        <div className={styles.focus} role="dialog" aria-modal="true" aria-label={focus.caption || title}>
          <button type="button" className={styles.focusClose} onClick={() => setFocus(null)}>
            Close
          </button>
          {focus.type === "video" ? (
            <video src={focus.url} poster={focus.posterUrl ?? undefined} controls autoPlay playsInline />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={focus.url} alt={focus.caption || title} />
          )}
        </div>
      ) : null}
    </div>
  );
}
