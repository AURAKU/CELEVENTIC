"use client";

import Image from "next/image";
import { resolveMediaUrl, shouldUnoptimizeNextImage } from "@/lib/uploads/media-url";
import { cn } from "@/lib/utils";

interface UploadedMediaProps {
  src: string | null | undefined;
  alt?: string;
  className?: string;
  fill?: boolean;
  width?: number;
  height?: number;
  video?: boolean;
  /** Poster frame for the `<video>` element (e.g. the processed asset's JPEG poster). */
  poster?: string | null;
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
  poster,
  autoPlay = true,
  muted = true,
  loop = true,
  controls = false,
  priority,
  sizes,
}: UploadedMediaProps) {
  const resolved = resolveMediaUrl(src);
  if (!resolved) return null;

  // Never point a <video> element's src at an image (a caller-forced `video` combined with a
  // thumbnail-only `src` — e.g. a grid tile falling back to a poster JPEG — must still render
  // as an image). Extension sniffing here is a safety net, not the primary signal.
  const looksLikeImage = /\.(jpe?g|png|webp|gif|avif)(\?|$)/i.test(resolved);
  const isVideo =
    !looksLikeImage && (video ?? (/\.(mp4|webm|mov)(\?|$)/i.test(resolved) || resolved.includes("video/")));
  const unoptimized = shouldUnoptimizeNextImage(resolved);

  if (isVideo) {
    return (
      <video
        src={resolved}
        poster={poster ?? undefined}
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
        unoptimized={unoptimized}
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
        unoptimized={unoptimized}
        priority={priority}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={resolved} alt={alt} className={className} loading={priority ? "eager" : "lazy"} />
  );
}
