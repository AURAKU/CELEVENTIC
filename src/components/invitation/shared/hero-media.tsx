"use client";

import { useState } from "react";
import { Maximize2 } from "lucide-react";
import { UploadedMedia } from "@/components/media/uploaded-media";
import { InvitationMediaLightbox } from "@/components/invitation/invitation-media-lightbox";
import { useInvitationMediaInteractive } from "@/components/invitation/invitation-media-context";
import type { InvitationMediaAsset } from "@/types/invitation-design";
import {
  getMediaEntranceClass,
  getMediaEntranceForLayout,
} from "@/lib/invitation/media-entrance-engine";
import { cn } from "@/lib/utils";

interface HeroMediaProps {
  coverImageUrl?: string | null;
  media?: InvitationMediaAsset[];
  animation?: string;
  layout?: string;
  className?: string;
  overlay?: boolean;
  /** Tap hero to open fullscreen viewer — defaults to InvitationMediaProvider context */
  interactive?: boolean;
}

export function HeroMedia({
  coverImageUrl,
  media,
  animation,
  layout,
  className = "",
  overlay = true,
  interactive: interactiveProp,
}: HeroMediaProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const ctxInteractive = useInvitationMediaInteractive();
  const interactive = interactiveProp ?? ctxInteractive;
  const hero = media?.find((m) => m.role === "hero" || m.role === "background");
  const heroUrl = hero?.url || coverImageUrl;
  const heroType = hero?.type ?? "image";
  const entranceClass = getMediaEntranceClass(getMediaEntranceForLayout(layout ?? "classic-gold"));

  if (!heroUrl) {
    return (
      <div className={`relative bg-gradient-to-br from-stone-200 via-stone-100 to-stone-300 ${className}`}>
        <div className="absolute inset-0 flex items-center justify-center text-stone-500 text-sm px-4 text-center inv-text-on-light">
          Upload a photo or video in the studio — preview updates instantly
        </div>
      </div>
    );
  }

  const animClass =
    animation === "ken-burns"
      ? "animate-ken-burns"
      : animation === "parallax"
        ? "animate-parallax-slow"
        : "";

  const isVideo = heroType === "video";

  const mediaNode = (
    <UploadedMedia
      src={heroUrl}
      alt="Invitation"
      className={cn("absolute inset-0 h-full w-full object-cover object-center", animClass)}
      video={isVideo}
      fill={!isVideo}
      sizes={!isVideo ? "(max-width: 768px) 100vw, 480px" : undefined}
      controls={false}
      muted={isVideo}
    />
  );

  const inner = (
    <>
      {mediaNode}
      {overlay && (
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-black/20 pointer-events-none"
          aria-hidden
        />
      )}
      {interactive && (
        <span className="absolute bottom-2 right-2 rounded-full bg-black/50 p-2 text-white opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity pointer-events-none z-10">
          <Maximize2 className="h-4 w-4" />
        </span>
      )}
    </>
  );

  return (
    <>
      <div className={cn("relative overflow-hidden inv-hero-media-frame", entranceClass, className)}>
        {interactive ? (
          <button
            type="button"
            className="relative block w-full h-full min-h-[inherit] group touch-manipulation"
            onClick={() => setLightboxOpen(true)}
            aria-label="Open hero media fullscreen"
          >
            {inner}
          </button>
        ) : (
          <div className="relative w-full h-full min-h-[inherit]">{inner}</div>
        )}
      </div>
      {lightboxOpen && (
        <InvitationMediaLightbox
          items={[{ id: "hero", url: heroUrl, type: isVideo ? "video" : "image" }]}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </>
  );
}
