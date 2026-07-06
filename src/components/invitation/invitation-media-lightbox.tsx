"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { UploadedMedia } from "@/components/media/uploaded-media";
import type { GalleryItem } from "@/components/invitation/invitation-gallery-display";

const SWIPE_THRESHOLD = 48;

interface InvitationMediaLightboxProps {
  items: GalleryItem[];
  initialIndex?: number;
  onClose: () => void;
}

export function InvitationMediaLightbox({ items, initialIndex = 0, onClose }: InvitationMediaLightboxProps) {
  const [index, setIndex] = useState(initialIndex);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const goNext = useCallback(() => {
    setIndex((i) => (i + 1) % items.length);
  }, [items.length]);

  const goPrev = useCallback(() => {
    setIndex((i) => (i - 1 + items.length) % items.length);
  }, [items.length]);

  useEffect(() => {
    setIndex(initialIndex);
  }, [initialIndex]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    }
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose, goNext, goPrev]);

  const item = items[index];
  if (!item) return null;

  const isVideo = item.type === "video" || /\.(mp4|webm|mov)(\?|$)/i.test(item.url);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0]?.clientX ?? null;
    touchStartY.current = e.touches[0]?.clientY ?? null;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null || items.length <= 1) return;
    const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
    const endY = e.changedTouches[0]?.clientY ?? touchStartY.current ?? 0;
    const deltaX = endX - touchStartX.current;
    const deltaY = Math.abs(endY - (touchStartY.current ?? 0));
    touchStartX.current = null;
    touchStartY.current = null;
    if (deltaY > 80) return;
    if (deltaX < -SWIPE_THRESHOLD) goNext();
    else if (deltaX > SWIPE_THRESHOLD) goPrev();
  }

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/95 flex flex-col touch-manipulation"
      role="dialog"
      aria-modal="true"
      aria-label="Media viewer"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
        <p className="text-white/80 text-sm tabular-nums">
          {index + 1} / {items.length}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-2 text-white hover:bg-white/10 transition-colors"
          aria-label="Close"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      <div className="relative flex-1 flex items-center justify-center min-h-0 px-2">
        {items.length > 1 && (
          <button
            type="button"
            onClick={goPrev}
            className="absolute left-2 z-10 rounded-full bg-white/10 p-2.5 text-white hover:bg-white/20 backdrop-blur-sm"
            aria-label="Previous"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}

        <div className="w-full h-full flex items-center justify-center max-h-[75vh]">
          <UploadedMedia
            src={item.url}
            alt={item.caption ?? "Gallery media"}
            className="max-w-full max-h-full w-auto h-auto object-contain rounded-lg"
            video={isVideo}
            controls={isVideo}
            autoPlay={isVideo}
          />
        </div>

        {items.length > 1 && (
          <button
            type="button"
            onClick={goNext}
            className="absolute right-2 z-10 rounded-full bg-white/10 p-2.5 text-white hover:bg-white/20 backdrop-blur-sm"
            aria-label="Next"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}
      </div>

      {item.caption && (
        <p className="px-4 py-3 text-center text-sm text-white/85">{item.caption}</p>
      )}

      {items.length > 1 && (
        <div className="flex justify-center gap-1.5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2">
          {items.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to slide ${i + 1}`}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === index ? "w-6 bg-white" : "w-1.5 bg-white/35"
              )}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      )}

      <p className="text-center text-[10px] text-white/40 pb-3 uppercase tracking-widest">
        Swipe or use arrows · tap outside close
      </p>
    </div>
  );
}
