"use client";

import { cn } from "@/lib/utils";
import { TM_PALETTE as PALETTE } from "./traditional-marriage-palette";
import {
  InvitationGalleryDisplay,
  type GalleryItem,
} from "@/components/invitation/invitation-gallery-display";
import type { SlideshowSettings } from "@/lib/invitation/slideshow-styles";

/**
 * Traditional Marriage Ceremony gallery — editorial title + full-bleed media stage.
 * Title: "The Couple" (ceremony vision-board voice; not generic "Gallery").
 */
export function TraditionalMarriageGallerySection({
  items,
  settings,
  interactive = true,
  className,
}: {
  items: GalleryItem[];
  settings?: Partial<SlideshowSettings>;
  interactive?: boolean;
  className?: string;
}) {
  if (!items.length) return null;

  return (
    <section
      id="gallery"
      aria-labelledby="tm-gallery-heading"
      className={cn(
        "tm-section-rise relative overflow-hidden rounded-sm border",
        className
      )}
      style={{
        borderColor: PALETTE.border,
        background: `linear-gradient(168deg, ${PALETTE.linen} 0%, ${PALETTE.peach} 48%, ${PALETTE.peachDeep} 100%)`,
        boxShadow: "0 22px 48px -28px rgba(92,61,46,0.35)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-3 rounded-sm border opacity-30"
        style={{ borderColor: `${PALETTE.mustard}55` }}
        aria-hidden
      />

      <header className="relative px-5 pt-7 pb-5 sm:px-7 text-center space-y-2">
        <p
          className="font-[family-name:var(--font-cormorant)] text-[11px] tracking-[0.36em] uppercase"
          style={{ color: PALETTE.bronzeDeep }}
        >
          In our frame
        </p>
        <h2
          id="tm-gallery-heading"
          className="font-[family-name:var(--font-great-vibes)] text-[2.45rem] sm:text-[2.75rem] leading-none"
          style={{ color: PALETTE.bronze }}
        >
          The Couple
        </h2>
        <p
          className="font-[family-name:var(--font-cormorant)] text-sm leading-relaxed max-w-[16rem] mx-auto"
          style={{ color: PALETTE.dress }}
        >
          Moments we hold dear. Tap to open, swipe to wander.
        </p>
        <div
          className="tm-hairline mx-auto mt-4 h-px w-16"
          style={{ backgroundColor: `${PALETTE.mustard}70` }}
          aria-hidden
        />
      </header>

      <div className="relative px-0 pb-0 sm:px-0">
        <InvitationGalleryDisplay
          items={items}
          interactive={interactive}
          chrome="linen"
          settings={{
            slideDurationSec: 5,
            autoplay: false,
            showCaptions: false,
            transition: "fade",
            ...settings,
            /* Calm full-bleed carousel — avoid padded collage grid on this template */
            style: "fade-carousel",
          }}
          className="tm-gallery-stage"
        />
      </div>
    </section>
  );
}
