"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  isJourneyFilm,
  journeyPosterUrl,
  type AureliaJourneyItem,
} from "@/lib/experience/aurelia-editorial/journey-moments";
import styles from "./aurelia-editorial-wedding.module.css";

const PHOTO_HOLD_MS = 4800;

export function AureliaJourneyMoments({
  items,
  coupleNames,
}: {
  items: AureliaJourneyItem[];
  coupleNames: string;
}) {
  const moments = items.filter((item) => item.imageUrl?.trim());
  const poster = journeyPosterUrl(moments);
  const [slideIndex, setSlideIndex] = useState(0);
  const current = moments[slideIndex] ?? null;
  const film = isJourneyFilm(current?.imageUrl);

  const goNext = useCallback(() => {
    if (moments.length < 2) return;
    setSlideIndex((index) => (index + 1) % moments.length);
  }, [moments.length]);

  const goPrev = useCallback(() => {
    if (moments.length < 2) return;
    setSlideIndex((index) => (index - 1 + moments.length) % moments.length);
  }, [moments.length]);

  useEffect(() => {
    if (slideIndex >= moments.length) setSlideIndex(0);
  }, [moments.length, slideIndex]);

  useEffect(() => {
    if (!current || film || moments.length < 2) return;
    const timer = window.setTimeout(goNext, PHOTO_HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [current, film, goNext, moments.length, slideIndex]);

  if (!current?.imageUrl) return null;

  const url = current.imageUrl.trim();

  return (
    <div className={styles.journeySlideshow} data-testid="seraphine-journey-moments">
      <figure className={styles.moment}>
        <div className={styles.momentFrame}>
          {film ? (
            <video
              key={current.id}
              src={url}
              poster={poster || undefined}
              controls
              playsInline
              muted
              autoPlay
              loop
              preload="metadata"
              aria-label={`${coupleNames} film`}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={current.id}
              src={url}
              alt={coupleNames}
              width={1200}
              height={1500}
              decoding="async"
            />
          )}
          {moments.length > 1 ? (
            <>
              <button
                type="button"
                className={`${styles.storyGalleryNav} ${styles.storyGalleryNavPrev}`}
                aria-label="Previous photograph"
                onClick={goPrev}
              >
                <ChevronLeft size={22} strokeWidth={1.75} />
              </button>
              <button
                type="button"
                className={`${styles.storyGalleryNav} ${styles.storyGalleryNavNext}`}
                aria-label="Next photograph"
                onClick={goNext}
              >
                <ChevronRight size={22} strokeWidth={1.75} />
              </button>
            </>
          ) : null}
        </div>
      </figure>
    </div>
  );
}
