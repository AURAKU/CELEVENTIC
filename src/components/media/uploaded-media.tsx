"use client";

import { resolvePublicMediaUrl } from "@/lib/uploads/media-url";
import { CeleventicImage, CeleventicVideo } from "@/components/media/celeventic-media";

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

/**
 * Unified uploaded media renderer — routes through shared URL resolver + CeleventicImage/Video.
 */
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
  const resolved = resolvePublicMediaUrl(src);
  if (!resolved) return null;

  const looksLikeImage = /\.(jpe?g|png|webp|gif|avif)(\?|$)/i.test(resolved);
  const isVideo =
    !looksLikeImage &&
    (video ?? (/\.(mp4|webm|mov)(\?|$)/i.test(resolved) || resolved.includes("video/")));

  if (isVideo) {
    return (
      <CeleventicVideo
        src={resolved}
        poster={poster}
        className={className}
        autoPlayMuted={autoPlay && muted}
        loop={loop}
        controls={controls || !(autoPlay && muted)}
        preload="metadata"
        pauseOffscreen
      />
    );
  }

  return (
    <CeleventicImage
      src={resolved}
      alt={alt}
      className={className}
      fill={fill}
      width={width}
      height={height}
      priority={priority}
      sizes={sizes}
    />
  );
}
