"use client";

import Image from "next/image";
import { resolveMediaUrl, isUploadedMediaUrl } from "@/lib/uploads/media-url";
import { cn } from "@/lib/utils";

interface UploadedMediaProps {
  src: string | null | undefined;
  alt?: string;
  className?: string;
  fill?: boolean;
  width?: number;
  height?: number;
  video?: boolean;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  controls?: boolean;
  priority?: boolean;
  sizes?: string;
}

export function UploadedMedia({
  src,
  alt = "",
  className,
  fill,
  width,
  height,
  video,
  autoPlay = true,
  muted = true,
  loop = true,
  controls = false,
  priority,
  sizes,
}: UploadedMediaProps) {
  const resolved = resolveMediaUrl(src);
  if (!resolved) return null;

  const isVideo =
    video ?? (/\.(mp4|webm|mov)(\?|$)/i.test(resolved) || resolved.includes("video/"));

  if (isVideo) {
    return (
      <video
        src={resolved}
        className={className}
        autoPlay={autoPlay}
        muted={muted}
        loop={loop}
        playsInline
        controls={controls}
      />
    );
  }

  if (fill) {
    return (
      <Image
        src={resolved}
        alt={alt}
        fill
        className={cn("object-cover", className)}
        sizes={sizes ?? "(max-width: 768px) 100vw, 480px"}
        unoptimized={isUploadedMediaUrl(resolved)}
        priority={priority}
      />
    );
  }

  if (width && height) {
    return (
      <Image
        src={resolved}
        alt={alt}
        width={width}
        height={height}
        className={className}
        unoptimized={isUploadedMediaUrl(resolved)}
        priority={priority}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={resolved} alt={alt} className={className} loading={priority ? "eager" : "lazy"} />
  );
}
