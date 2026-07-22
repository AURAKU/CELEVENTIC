"use client";

import { useMemo } from "react";
import { InvitationRenderer } from "@/components/invitation/invitation-renderer";
import { buildLivePreviewProps } from "@/lib/invitation-mvp/demo-preview-data";
import { getDemoBackgroundUrl, getDemoHeroUrl } from "@/lib/invitation/demo-gallery-assets";
import { pageBackgroundFromDesign } from "@/lib/invitation/studio-media-utils";
import { getLayoutMediaPack } from "@/lib/invitation/layout-media-identity";
import { getLayoutVisualProfile } from "@/lib/experience/layout-visual-profiles";
import { cn } from "@/lib/utils";
import { InvitationStaticPreviewProvider } from "@/components/invitation/invitation-static-preview";

const FRAME_WIDTH = 390;

interface TemplatePreviewGlimpseProps {
  layoutSlug: string;
  /** Catalog SKU — required when multiple SKUs share a layout (Wave-1 pages) */
  catalogSlug?: string;
  category?: string;
  features?: string[];
  /** Scale of the faux phone frame inside the tile */
  scale?: number;
  compact?: boolean;
  className?: string;
}

/**
 * Static scaled render of the invitation layout — shown under the tap overlay
 * so catalogue tiles preview the real template before opening the live demo.
 */
export function TemplatePreviewGlimpse({
  layoutSlug,
  catalogSlug,
  category,
  features,
  scale = 0.36,
  compact = false,
  className,
}: TemplatePreviewGlimpseProps) {
  const preview = useMemo(
    () =>
      buildLivePreviewProps(layoutSlug, category, {
        features,
        musicEnabled: false,
        skipIntro: true,
        skipTapGate: true,
        catalogSlug: catalogSlug ?? layoutSlug,
      }),
    [layoutSlug, catalogSlug, category, features]
  );

  const bg = pageBackgroundFromDesign(preview.design);
  const pack = getLayoutMediaPack(layoutSlug);
  const visual = getLayoutVisualProfile(layoutSlug);
  const backdropUrl =
    pack?.background ?? bg.backgroundImageUrl ?? getDemoBackgroundUrl(layoutSlug, category);
  const coverUrl =
    preview.event.coverImageUrl ?? getDemoHeroUrl(layoutSlug, category);

  const eventWithCover = { ...preview.event, coverImageUrl: coverUrl };
  const visibleHeight = compact ? 108 : 200;

  return (
    <div
      className={cn("absolute inset-0 overflow-hidden pointer-events-none", className)}
      style={{ background: visual.background }}
      aria-hidden
    >
      <InvitationStaticPreviewProvider>
      <img
        src={backdropUrl}
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-90 mix-blend-overlay"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-transparent to-black/40" />

      <div className="absolute inset-x-0 top-0 flex justify-center pt-1">
        <div
          className="overflow-hidden rounded-t-[1.25rem] border border-white/30 bg-[#FAF8F4] shadow-lg"
          style={{
            width: FRAME_WIDTH * scale,
            height: visibleHeight,
          }}
        >
          <div
            style={{
              width: FRAME_WIDTH,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
          >
            <InvitationRenderer
              invitation={{
                id: `glimpse-${layoutSlug}`,
                name: preview.invitationName,
                message: preview.message,
                uniqueLink: "preview",
              }}
              event={eventWithCover}
              design={preview.design}
              guestName={preview.guestName}
            />
          </div>
        </div>
      </div>
      </InvitationStaticPreviewProvider>
    </div>
  );
}
