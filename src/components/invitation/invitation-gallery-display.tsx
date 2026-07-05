"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { UploadedMedia } from "@/components/media/uploaded-media";
import type { SlideshowSettings, SlideshowStyleId } from "@/lib/invitation/slideshow-styles";
import { DEFAULT_SLIDESHOW_SETTINGS } from "@/lib/invitation/slideshow-styles";

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
  /** User-controlled navigation — disables autoplay, enables swipe + arrows */
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
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const slides = useMemo(() => items.filter((i) => i.url), [items]);

  const goNext = useCallback(() => {
    setIndex((i) => (i + 1) % slides.length);
  }, [slides.length]);

  const goPrev = useCallback(() => {
    setIndex((i) => (i - 1 + slides.length) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    setIndex(0);
  }, [slides.length, items]);

  useEffect(() => {
    if (!autoplay || slides.length <= 1) return;
    const id = setInterval(() => {
      goNext();
    }, cfg.slideDurationSec * 1000);
    return () => clearInterval(id);
  }, [autoplay, cfg.slideDurationSec, slides.length, goNext]);

  function handleTouchStart(e: React.TouchEvent) {
    if (!interactive) return;
    touchStartX.current = e.touches[0]?.clientX ?? null;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (!interactive || touchStartX.current === null || slides.length <= 1) return;
    const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
    const delta = endX - touchStartX.current;
    touchStartX.current = null;
    if (delta < -SWIPE_THRESHOLD) goNext();
    else if (delta > SWIPE_THRESHOLD) goPrev();
  }

  if (!slides.length) return null;

  if (cfg.style === "magazine-collage" || cfg.style === "timeline-gallery") {
    return (
      <div className={cn("grid grid-cols-2 sm:grid-cols-3 gap-2", className)}>
        {slides.map((item, i) => (
          <button
            key={item.id ?? i}
            type="button"
            className={cn(
              "overflow-hidden rounded-xl bg-slate-100 inv-gallery-item text-left",
              cfg.style === "magazine-collage" && i % 5 === 0 && "col-span-2 row-span-2 aspect-[4/3]",
              cfg.style !== "magazine-collage" && "aspect-square"
            )}
            style={{ animationDelay: `${i * 80}ms` }}
            onClick={() => interactive && setIndex(i)}
          >
            <GalleryMedia item={item} className="w-full h-full object-cover" />
          </button>
        ))}
      </div>
    );
  }

  if (cfg.style === "polaroid-stack") {
    return (
      <div className={cn("relative h-72 sm:h-80", className)}>
        {slides.slice(0, 4).map((item, i) => (
          <button
            key={item.id ?? i}
            type="button"
            className="absolute left-1/2 top-1/2 w-44 sm:w-52 bg-white p-2 pb-8 shadow-xl rounded-sm"
            style={{
              transform: `translate(-50%, -50%) rotate(${(i - 1.5) * 7}deg) translateY(${i * -4}px)`,
              zIndex: i === index ? 10 : i,
            }}
            onClick={() => interactive && setIndex(i)}
          >
            <GalleryMedia item={item} className="w-full aspect-[4/5] object-cover" />
          </button>
        ))}
        {interactive && slides.length > 1 && (
          <GalleryNav index={index} total={slides.length} onPrev={goPrev} onNext={goNext} className="bottom-2" />
        )}
      </div>
    );
  }

  if (cfg.style === "swipe-story") {
    return (
      <div
        className={cn("flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 -mx-1 px-1 scroll-smooth", className)}
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {slides.map((item, i) => (
          <div
            key={item.id ?? i}
            className="snap-center shrink-0 w-[72%] sm:w-[45%] aspect-[9/16] rounded-2xl overflow-hidden shadow-lg inv-gallery-item"
          >
            <GalleryMedia item={item} className="w-full h-full object-cover" />
          </div>
        ))}
      </div>
    );
  }

  if (cfg.style === "floating-memories") {
    return (
      <div className={cn("relative h-80 sm:h-96", className)}>
        {slides.slice(0, 5).map((item, i) => (
          <button
            key={item.id ?? i}
            type="button"
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
            onClick={() => interactive && setIndex(i)}
          >
            <GalleryMedia item={item} className="w-full aspect-[4/5] object-cover" />
          </button>
        ))}
        {interactive && slides.length > 1 && (
          <GalleryNav index={index} total={slides.length} onPrev={goPrev} onNext={goNext} />
        )}
      </div>
    );
  }

  if (cfg.style === "split-media" && slides.length >= 2) {
    const left = slides[index];
    const right = slides[(index + 1) % slides.length];
    return (
      <div className={cn("space-y-2", className)}>
        <div className="grid grid-cols-2 gap-2 rounded-2xl overflow-hidden">
          <div className="aspect-[3/4] inv-gallery-item">
            <GalleryMedia item={left} className="w-full h-full object-cover" />
          </div>
          <div className="aspect-[3/4] inv-gallery-item">
            <GalleryMedia item={right} className="w-full h-full object-cover" />
          </div>
        </div>
        {interactive && slides.length > 1 && (
          <GalleryNav index={index} total={slides.length} onPrev={goPrev} onNext={goNext} compact />
        )}
      </div>
    );
  }

  if (cfg.style === "fullscreen-video") {
    const videoSlide = slides.find((s) => s.type === "video" || /\.(mp4|webm|mov)/i.test(s.url)) ?? slides[0];
    return (
      <div className={cn("relative aspect-video rounded-2xl overflow-hidden bg-black shadow-inner", className)}>
        <GalleryMedia item={videoSlide} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
      </div>
    );
  }

  return (
    <div
      className={cn("relative", className)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className={cn(
          "relative aspect-[4/5] sm:aspect-[16/10] rounded-2xl overflow-hidden bg-slate-900 shadow-inner inv-gallery-item",
          cfg.style === "luxury-frame" && "border-4 border-amber-500/70 p-1 bg-gradient-to-br from-amber-900/40 to-black/40"
        )}
      >
        {slides.map((item, i) => (
          <div
            key={item.id ?? i}
            className={cn(
              "absolute inset-0 transition-opacity duration-700",
              i === index ? "opacity-100" : "opacity-0 pointer-events-none"
            )}
          >
            <GalleryMedia item={item} className="w-full h-full object-cover" />
            {cfg.showCaptions && item.caption && (
              <p className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent text-white text-sm p-4">
                {item.caption}
              </p>
            )}
          </div>
        ))}

        {interactive && slides.length > 1 && (
          <GalleryNav
            index={index}
            total={slides.length}
            onPrev={goPrev}
            onNext={goNext}
            overlay
          />
        )}
      </div>

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
        <p className="text-center text-[10px] text-slate-400 mt-1 uppercase tracking-widest">
          Swipe or tap arrows to browse
        </p>
      )}
    </div>
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
        onClick={onPrev}
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
        onClick={onNext}
      >
        <ChevronRight className={compact ? "h-4 w-4" : "h-5 w-5"} />
      </button>
    </div>
  );
}

function GalleryMedia({ item, className }: { item: GalleryItem; className?: string }) {
  const isVideo = item.type === "video" || /\.(mp4|webm|mov)(\?|$)/i.test(item.url);
  return (
    <UploadedMedia
      src={item.url}
      alt={item.caption ?? "Gallery"}
      className={className}
      video={isVideo}
      controls={isVideo}
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
