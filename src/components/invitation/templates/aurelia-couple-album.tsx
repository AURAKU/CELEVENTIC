"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Minimize2, Play, X } from "lucide-react";
import {
  orderCoupleAlbumForPlayback,
  type AureliaCoupleAlbumItem,
} from "@/lib/experience/aurelia-editorial/couple-album";
import styles from "./aurelia-editorial-wedding.module.css";

const PHOTO_HOLD_MS = 4200;

export function AureliaCoupleAlbum({
  items,
  coupleNames,
  variant = "frame",
  look = "flush",
}: {
  items: AureliaCoupleAlbumItem[];
  coupleNames: string;
  variant?: "frame" | "story";
  look?: "flush" | "lookbook";
}) {
  const playlist = useMemo(() => orderCoupleAlbumForPlayback(items), [items]);
  const [slideIndex, setSlideIndex] = useState(0);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const filled = playlist.length > 0;
  const current = playlist[slideIndex] ?? null;
  const stageOpen = openIndex != null;
  const inlineVideoRef = useRef<HTMLVideoElement | null>(null);
  const isStory = variant === "story";

  const goNext = useCallback(() => {
    if (playlist.length < 2) return;
    setSlideIndex((currentIndex) => (currentIndex + 1) % playlist.length);
  }, [playlist.length]);

  const goPrev = useCallback(() => {
    if (playlist.length < 2) return;
    setSlideIndex((currentIndex) => (currentIndex - 1 + playlist.length) % playlist.length);
  }, [playlist.length]);

  useEffect(() => {
    if (slideIndex >= playlist.length) setSlideIndex(0);
  }, [playlist.length, slideIndex]);

  useEffect(() => {
    if (!filled || stageOpen || !current || current.type === "video" || playlist.length < 2) {
      return;
    }
    const timer = window.setTimeout(goNext, PHOTO_HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [current, filled, goNext, playlist.length, stageOpen]);

  useEffect(() => {
    if (stageOpen) inlineVideoRef.current?.pause();
  }, [stageOpen]);

  const slideMedia =
    current && current.type === "video" ? (
      <video
        key={current.id}
        ref={inlineVideoRef}
        src={current.url}
        poster={current.posterUrl || undefined}
        muted
        autoPlay={!stageOpen}
        playsInline
        preload="metadata"
        onEnded={goNext}
      />
    ) : current ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        key={current.id}
        className={isStory ? styles.storyImage : undefined}
        src={current.url}
        alt={current.caption || `${coupleNames}`}
        width={730}
        height={1024}
        sizes="100vw"
        decoding="async"
      />
    ) : null;

  const isLookbook = isStory && look === "lookbook";
  const slideCount = String(playlist.length).padStart(2, "0");
  const slideNo = String(slideIndex + 1).padStart(2, "0");

  return (
    <div
      className={`${styles.coupleAlbum} ${isStory ? styles.storyGallery : ""} ${isLookbook ? styles.storyLookbook : ""}`}
      data-testid="aurelia-couple-album"
    >
      {isStory ? null : (
        <>
          <p className={styles.coupleAlbumKicker}>Photographs &amp; films</p>
          {filled ? (
            <p className={styles.coupleAlbumLede}>
              Tap the frame to open {coupleNames}. Photographs play one at a time, then any film begins.
            </p>
          ) : null}
        </>
      )}
      <div className={styles.coupleReel} role="list">
        {filled && current ? (
          isStory ? (
            <div
              className={`${styles.storyGalleryFrame} ${current.type === "video" ? styles.storyGalleryFilm : ""}`}
              role="listitem"
            >
              {isLookbook ? (
                <p className={styles.storyGalleryPlate}>
                  <span>{current.type === "video" ? "Film" : "Photograph"}</span>
                  <span>
                    {slideNo} / {slideCount}
                  </span>
                </p>
              ) : null}
              <button
                type="button"
                className={styles.storyGalleryOpen}
                aria-label={`Open ${coupleNames} photographs, ${slideIndex + 1} of ${playlist.length}`}
                onClick={() => setOpenIndex(slideIndex)}
              >
                {slideMedia}
              </button>
              {playlist.length > 1 ? (
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
          ) : (
            <button
              type="button"
              className={styles.coupleTile}
              role="listitem"
              aria-label={`Open ${coupleNames} photographs and films, ${slideIndex + 1} of ${playlist.length}`}
              onClick={() => setOpenIndex(slideIndex)}
            >
              {slideMedia}
              {current.type === "video" ? (
                <span className={styles.couplePlay} aria-hidden>
                  <Play size={16} fill="currentColor" />
                </span>
              ) : null}
            </button>
          )
        ) : isStory ? null : (
          <div className={`${styles.coupleTile} ${styles.coupleTileGhost}`} role="listitem" aria-hidden />
        )}
      </div>
      {filled && playlist.length > 1 ? (
        <div className={styles.coupleDots} role="tablist" aria-label="Photograph and film slides">
          {playlist.map((item, index) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={index === slideIndex}
              aria-label={`Show ${item.type === "video" ? "film" : "photograph"} ${index + 1}`}
              className={`${styles.coupleDot} ${index === slideIndex ? styles.coupleDotActive : ""}`}
              onClick={() => setSlideIndex(index)}
            />
          ))}
        </div>
      ) : null}
      {openIndex != null && playlist[openIndex] ? (
        <CoupleAlbumStage
          items={playlist}
          startIndex={openIndex}
          onClose={() => setOpenIndex(null)}
          onIndexChange={setSlideIndex}
        />
      ) : null}
    </div>
  );
}

function CoupleAlbumStage({
  items,
  startIndex,
  onClose,
  onIndexChange,
}: {
  items: AureliaCoupleAlbumItem[];
  startIndex: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const item = items[index];
  const isVideo = item?.type === "video";

  const goTo = useCallback(
    (next: number) => {
      const wrapped = (next + items.length) % items.length;
      setIndex(wrapped);
      onIndexChange(wrapped);
    },
    [items.length, onIndexChange]
  );

  const goNext = useCallback(() => goTo(index + 1), [goTo, index]);

  useEffect(() => {
    setIndex(startIndex);
  }, [startIndex]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") goTo(index + 1);
      if (event.key === "ArrowLeft") goTo(index - 1);
    }
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [goTo, index, onClose]);

  useEffect(() => {
    if (!item || isVideo || items.length < 2) return;
    const timer = window.setTimeout(() => goTo(index + 1), PHOTO_HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [goTo, index, isVideo, item, items.length]);

  if (!item) return null;

  return (
    <div className={styles.coupleStage} role="dialog" aria-modal="true" aria-label="Couple photographs and films">
      <div className={styles.coupleStageBar}>
        <p>
          {index + 1} / {items.length}
        </p>
        <button type="button" onClick={onClose} aria-label="Minimize">
          <Minimize2 size={18} />
          Minimize
        </button>
        <button type="button" className={styles.coupleStageClose} onClick={onClose} aria-label="Close">
          <X size={20} />
        </button>
      </div>
      <div className={styles.coupleStageFrame}>
        {isVideo ? (
          <video
            key={item.id}
            src={item.url}
            poster={item.posterUrl || undefined}
            autoPlay
            playsInline
            controls
            onEnded={goNext}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={item.id} src={item.url} alt={item.caption || ""} />
        )}
      </div>
    </div>
  );
}
