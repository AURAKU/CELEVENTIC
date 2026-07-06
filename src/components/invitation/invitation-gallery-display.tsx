"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { UploadedMedia } from "@/components/media/uploaded-media";
import { InvitationMediaLightbox } from "@/components/invitation/invitation-media-lightbox";
import type { SlideshowSettings, SlideshowStyleId } from "@/lib/invitation/slideshow-styles";
import { DEFAULT_SLIDESHOW_SETTINGS, getGalleryFrameClass, getGalleryTapHint } from "@/lib/invitation/slideshow-styles";

export interface GalleryItem {
  id?: string;
  url: string;
  caption?: string | null;
  type?: "image" | "video";
}

interface InvitationGalleryDisplayProps {
  items: GalleryItem[];
  settings?: Partial<SlideshowSettings>;
  className?: string;
  /** User-controlled navigation — disables autoplay, enables swipe + arrows + tap fullscreen */
  interactive?: boolean;
}

const SWIPE_THRESHOLD = 48;

export function InvitationGalleryDisplay({
  items,
  settings,
  className,
  interactive = false,
}: InvitationGalleryDisplayProps) {
  const cfg = { ...DEFAULT_SLIDESHOW_SETTINGS, ...settings };
  const autoplay = interactive ? false : cfg.autoplay;
  const frameClass = getGalleryFrameClass(cfg.style);
  const tapHint = getGalleryTapHint(cfg.style);
  const [index, setIndex] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const touchStartX = useRef<number | null>(null);
  const pointerStartX = useRef<number | null>(null);

  const slides = useMemo(() => items.filter((i) => i.url), [items]);

  const goNext = useCallback(() => {
    setIndex((i) => (i + 1) % slides.length);
  }, [slides.length]);

  const goPrev = useCallback(() => {
    setIndex((i) => (i - 1 + slides.length) % slides.length);
  }, [slides.length]);

  const openLightbox = useCallback(
    (i: number) => {
      if (!interactive) return;
      setIndex(i);
      setLightboxIndex(i);
    },
    [interactive]
  );

  useEffect(() => {
    setIndex(0);
    setLightboxIndex(null);
  }, [slides.length, items]);

  useEffect(() => {
    if (!autoplay || slides.length <= 1) return;
    const id = setInterval(goNext, cfg.slideDurationSec * 1000);
    return () => clearInterval(id);
  }, [autoplay, cfg.slideDurationSec, slides.length, goNext]);

  function handleSwipeEnd(delta: number) {
    if (!interactive || slides.length <= 1) return;
    if (delta < -SWIPE_THRESHOLD) goNext();
    else if (delta > SWIPE_THRESHOLD) goPrev();
  }

  function handleTouchStart(e: React.TouchEvent) {
    if (!interactive) return;
    touchStartX.current = e.touches[0]?.clientX ?? null;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (!interactive || touchStartX.current === null) return;
    const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
    handleSwipeEnd(endX - touchStartX.current);
    touchStartX.current = null;
  }

  function handlePointerDown(e: React.PointerEvent) {
    if (!interactive || e.pointerType === "touch") return;
    pointerStartX.current = e.clientX;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }

  function handlePointerUp(e: React.PointerEvent) {
    if (!interactive || pointerStartX.current === null || e.pointerType === "touch") return;
    handleSwipeEnd(e.clientX - pointerStartX.current);
    pointerStartX.current = null;
  }

  if (!slides.length) return null;

  const lightbox =
    lightboxIndex !== null ? (
      <InvitationMediaLightbox
        items={slides}
        initialIndex={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
      />
    ) : null;

  if (cfg.style === "magazine-collage" || cfg.style === "timeline-gallery") {
    return (
      <>
        <div className={cn("grid grid-cols-2 sm:grid-cols-3 gap-2", frameClass, className)}>
          {slides.map((item, i) => (
            <GalleryTile
              key={item.id ?? i}
              item={item}
              interactive={interactive}
              className={cn(
                "inv-gallery-item",
                cfg.style === "magazine-collage" && i % 5 === 0 && "col-span-2 row-span-2 aspect-[4/3]",
                cfg.style !== "magazine-collage" && "aspect-square"
              )}
              style={{ animationDelay: `${i * 80}ms` }}
              onOpen={() => openLightbox(i)}
            />
          ))}
        </div>
        {interactive && (
          <p className="text-center text-[10px] text-slate-400 mt-2 uppercase tracking-widest">{tapHint}</p>
        )}
        {lightbox}
      </>
    );
  }

  if (cfg.style === "polaroid-stack") {
    return (
      <>
        <div className={cn("relative h-72 sm:h-80", frameClass, className)}>
          {slides.slice(0, 4).map((item, i) => (
            <button
              key={item.id ?? i}
              type="button"
              className={cn(
                "absolute left-1/2 top-1/2 w-44 sm:w-52 bg-white p-2 pb-8 shadow-xl rounded-sm transition-transform",
                interactive && "cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              )}
              style={{
                transform: `translate(-50%, -50%) rotate(${(i - 1.5) * 7}deg) translateY(${i * -4}px)`,
                zIndex: i === index ? 10 : i,
              }}
              onClick={() => openLightbox(i)}
            >
              <GalleryMedia item={item} className="w-full aspect-[4/5] object-cover" fit="cover" />
              {interactive && i === index && (
                <span className="absolute bottom-2 right-2 text-slate-400">
                  <Maximize2 className="h-3.5 w-3.5" />
                </span>
              )}
            </button>
          ))}
          {interactive && slides.length > 1 && (
            <GalleryNav index={index} total={slides.length} onPrev={goPrev} onNext={goNext} className="bottom-2" />
          )}
        </div>
        {interactive && (
          <p className="text-center text-[10px] text-slate-400 mt-2 uppercase tracking-widest">{tapHint}</p>
        )}
        {lightbox}
      </>
    );
  }

  if (cfg.style === "swipe-story") {
    return (
      <>
        <div
          className={cn(
            "flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 -mx-1 px-1 scroll-smooth",
            frameClass,
            className
          )}
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {slides.map((item, i) => (
            <GalleryTile
              key={item.id ?? i}
              item={item}
              interactive={interactive}
              className="snap-center shrink-0 w-[72%] sm:w-[45%] aspect-[9/16] rounded-2xl shadow-lg inv-gallery-item"
              onOpen={() => openLightbox(i)}
            />
          ))}
        </div>
        {interactive && (
          <p className="text-center text-[10px] text-slate-400 mt-2 uppercase tracking-widest">{tapHint}</p>
        )}
        {lightbox}
      </>
    );
  }

  if (cfg.style === "floating-memories") {
    return (
      <>
        <div className={cn("relative h-80 sm:h-96", frameClass, className)}>
          {slides.slice(0, 5).map((item, i) => (
            <GalleryTile
              key={item.id ?? i}
              item={item}
              interactive={interactive}
              className={cn(
                "absolute w-36 sm:w-44 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/80 inv-gallery-item inv-media-entrance-pop-in",
                i === index && "ring-2 ring-brand-500"
              )}
              style={{
                left: `${8 + i * 14}%`,
                top: `${10 + (i % 3) * 12}%`,
                transform: `rotate(${(i - 2) * 6}deg)`,
                zIndex: i === index ? 10 : i,
                animationDelay: `${i * 120}ms`,
              }}
              onOpen={() => openLightbox(i)}
            />
          ))}
          {interactive && slides.length > 1 && (
            <GalleryNav index={index} total={slides.length} onPrev={goPrev} onNext={goNext} />
          )}
        </div>
        {interactive && (
          <p className="text-center text-[10px] text-slate-400 mt-2 uppercase tracking-widest">{tapHint}</p>
        )}
        {lightbox}
      </>
    );
  }

  if (cfg.style === "split-media" && slides.length >= 2) {
    const left = slides[index];
    const right = slides[(index + 1) % slides.length];
    return (
      <>
        <div className={cn("space-y-2", frameClass, className)}>
          <div className="grid grid-cols-2 gap-2 rounded-2xl overflow-hidden">
            <GalleryTile item={left} interactive={interactive} className="aspect-[3/4] inv-gallery-item" onOpen={() => openLightbox(index)} />
            <GalleryTile
              item={right}
              interactive={interactive}
              className="aspect-[3/4] inv-gallery-item"
              onOpen={() => openLightbox((index + 1) % slides.length)}
            />
          </div>
          {interactive && slides.length > 1 && (
            <GalleryNav index={index} total={slides.length} onPrev={goPrev} onNext={goNext} compact />
          )}
        </div>
        {lightbox}
      </>
    );
  }

  if (cfg.style === "fullscreen-video") {
    const videoSlide = slides.find((s) => s.type === "video" || /\.(mp4|webm|mov)/i.test(s.url)) ?? slides[0];
    return (
      <>
        <GalleryTile
          item={videoSlide}
          interactive={interactive}
          className={cn("relative aspect-video rounded-2xl overflow-hidden bg-black shadow-inner inv-gallery-item", frameClass, className)}
          onOpen={() => openLightbox(slides.indexOf(videoSlide))}
          overlay={
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
          }
        />
        {interactive && (
          <p className="text-center text-[10px] text-slate-400 mt-2 uppercase tracking-widest">{tapHint}</p>
        )}
        {lightbox}
      </>
    );
  }

  return (
    <>
      <div
        className={cn("relative", frameClass, className)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
      >
        <button
          type="button"
          className={cn(
            "relative w-full aspect-[4/5] sm:aspect-[16/10] rounded-2xl overflow-hidden bg-slate-900 shadow-inner inv-gallery-item block",
            cfg.style === "luxury-frame" && "border-4 border-amber-500/70 p-1 bg-gradient-to-br from-amber-900/40 to-black/40",
            interactive && "cursor-pointer group"
          )}
          onClick={() => openLightbox(index)}
          aria-label={interactive ? "Open gallery fullscreen" : undefined}
        >
          {slides.map((item, i) => (
            <div
              key={item.id ?? i}
              className={cn(
                "absolute inset-0 transition-opacity duration-700",
                i === index ? "opacity-100" : "opacity-0 pointer-events-none"
              )}
            >
              <GalleryMedia item={item} className="w-full h-full object-cover" fit="cover" />
              {cfg.showCaptions && item.caption && (
                <p className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent text-white text-sm p-4 text-left">
                  {item.caption}
                </p>
              )}
            </div>
          ))}

          {interactive && (
            <span className="absolute top-3 right-3 rounded-full bg-black/45 p-2 text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <Maximize2 className="h-4 w-4" />
            </span>
          )}

          {interactive && slides.length > 1 && (
            <div className="absolute inset-y-0 inset-x-1 z-10 pointer-events-none" onClick={(e) => e.stopPropagation()}>
              <GalleryNav index={index} total={slides.length} onPrev={goPrev} onNext={goNext} overlay />
            </div>
          )}
        </button>

        {slides.length > 1 && (
          <div className="flex justify-center gap-1.5 mt-3">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Slide ${i + 1}`}
                className={cn(
                  "h-2 rounded-full transition-all touch-manipulation",
                  i === index ? "w-6 bg-brand-600" : "w-2 bg-slate-300"
                )}
                onClick={() => setIndex(i)}
              />
            ))}
          </div>
        )}

        {interactive && slides.length > 1 && (
          <p className="text-center text-[10px] text-slate-400 mt-1 uppercase tracking-widest">{tapHint}</p>
        )}
      </div>
      {lightbox}
    </>
  );
}

function GalleryTile({
  item,
  interactive,
  className,
  style,
  onOpen,
  overlay,
}: {
  item: GalleryItem;
  interactive?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onOpen: () => void;
  overlay?: React.ReactNode;
}) {
  if (!interactive) {
    return (
      <div className={cn("overflow-hidden rounded-xl bg-slate-100", className)} style={style}>
        <GalleryMedia item={item} className="w-full h-full object-cover" fit="cover" />
        {overlay}
      </div>
    );
  }
  return (
    <button
      type="button"
      className={cn(
        "overflow-hidden rounded-xl bg-slate-100 text-left relative group touch-manipulation",
        className
      )}
      style={style}
      onClick={onOpen}
    >
      <GalleryMedia item={item} className="w-full h-full object-cover" fit="cover" />
      {overlay}
      <span className="absolute bottom-2 right-2 rounded-full bg-black/50 p-1.5 text-white opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        <Maximize2 className="h-3.5 w-3.5" />
      </span>
    </button>
  );
}

function GalleryNav({
  index,
  total,
  onPrev,
  onNext,
  overlay,
  compact,
  className,
}: {
  index: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  overlay?: boolean;
  compact?: boolean;
  className?: string;
}) {
  if (total <= 1) return null;
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2",
        overlay && "absolute inset-y-0 inset-x-1 z-10 pointer-events-none",
        !overlay && !compact && "mt-2",
        className
      )}
    >
      <button
        type="button"
        aria-label="Previous"
        className={cn(
          "pointer-events-auto rounded-full p-2 touch-manipulation transition-colors",
          overlay
            ? "bg-black/40 text-white hover:bg-black/60 backdrop-blur-sm"
            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
        )}
        onClick={(e) => {
          e.stopPropagation();
          onPrev();
        }}
      >
        <ChevronLeft className={compact ? "h-4 w-4" : "h-5 w-5"} />
      </button>
      {!overlay && (
        <span className="text-xs text-slate-500 tabular-nums">
          {index + 1} / {total}
        </span>
      )}
      <button
        type="button"
        aria-label="Next"
        className={cn(
          "pointer-events-auto rounded-full p-2 touch-manipulation transition-colors",
          overlay
            ? "bg-black/40 text-white hover:bg-black/60 backdrop-blur-sm ml-auto"
            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
        )}
        onClick={(e) => {
          e.stopPropagation();
          onNext();
        }}
      >
        <ChevronRight className={compact ? "h-4 w-4" : "h-5 w-5"} />
      </button>
    </div>
  );
}

function GalleryMedia({
  item,
  className,
  fit = "cover",
}: {
  item: GalleryItem;
  className?: string;
  fit?: "cover" | "contain";
}) {
  const isVideo = item.type === "video" || /\.(mp4|webm|mov)(\?|$)/i.test(item.url);
  return (
    <UploadedMedia
      src={item.url}
      alt={item.caption ?? "Gallery"}
      className={cn(className, fit === "cover" ? "object-cover" : "object-contain")}
      video={isVideo}
      controls={isVideo && !className?.includes("pointer-events-none")}
      muted={isVideo}
    />
  );
}

export function slideshowStyleFromVariant(variant?: string): SlideshowStyleId {
  const map: Record<string, SlideshowStyleId> = {
    carousel: "fade-carousel",
    grid: "magazine-collage",
    polaroid: "polaroid-stack",
    story: "swipe-story",
    luxury: "luxury-frame",
  };
  return map[variant ?? ""] ?? "fade-carousel";
}
