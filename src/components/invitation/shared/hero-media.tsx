"use client";

import { UploadedMedia } from "@/components/media/uploaded-media";
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
}

export function HeroMedia({
  coverImageUrl,
  media,
  animation,
  layout,
  className = "",
  overlay = true,
}: HeroMediaProps) {
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

  const mediaNode =
    heroType === "video" ? (
      <UploadedMedia
        src={heroUrl}
        video
        className={cn("absolute inset-0 h-full w-full object-cover", animClass)}
      />
    ) : (
      <UploadedMedia
        src={heroUrl}
        alt="Invitation"
        fill
        className={animClass}
        sizes="(max-width: 768px) 100vw, 480px"
      />
    );

  return (
    <div className={cn("relative overflow-hidden", entranceClass, className)}>
      {mediaNode}
      {overlay && (
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-black/20 pointer-events-none"
          aria-hidden
        />
      )}
    </div>
  );
}
