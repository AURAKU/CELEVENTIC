"use client";

import Image from "next/image";
import type { InvitationMediaAsset } from "@/types/invitation-design";

interface HeroMediaProps {
  coverImageUrl?: string | null;
  media?: InvitationMediaAsset[];
  animation?: string;
  className?: string;
  overlay?: boolean;
}

export function HeroMedia({ coverImageUrl, media, animation, className = "", overlay = true }: HeroMediaProps) {
  const hero = media?.find((m) => m.role === "hero" || m.role === "background");
  const heroUrl = hero?.url || coverImageUrl;
  const heroType = hero?.type ?? "image";

  if (!heroUrl) {
    return (
      <div className={`relative bg-gradient-to-br from-stone-200 via-stone-100 to-stone-300 ${className}`}>
        <div className="absolute inset-0 flex items-center justify-center text-stone-400 text-sm">
          Add a photo or video in Invitation Studio
        </div>
      </div>
    );
  }

  const animClass =
    animation === "ken-burns" ? "animate-ken-burns" :
    animation === "parallax" ? "animate-parallax-slow" : "";

  if (heroType === "video") {
    return (
      <div className={`relative overflow-hidden ${className}`}>
        <video
          src={heroUrl}
          autoPlay
          muted
          loop
          playsInline
          className={`absolute inset-0 h-full w-full object-cover ${animClass}`}
        />
        {overlay && <div className="absolute inset-0 bg-black/20" />}
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <Image
        src={heroUrl}
        alt="Invitation"
        fill
        className={`object-cover ${animClass}`}
        sizes="(max-width: 768px) 100vw, 480px"
        unoptimized={heroUrl.startsWith("/uploads/")}
      />
      {overlay && <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />}
    </div>
  );
}
