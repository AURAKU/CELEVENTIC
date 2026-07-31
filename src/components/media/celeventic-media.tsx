"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  resolvePublicMediaUrl,
  shouldUnoptimizeNextImage,
} from "@/lib/uploads/media-url";

export interface CeleventicImageProps {
  src: string | null | undefined;
  alt?: string;
  className?: string;
  fill?: boolean;
  width?: number;
  height?: number;
  priority?: boolean;
  sizes?: string;
  objectFit?: "cover" | "contain" | "fill" | "none";
  /** Shown when the primary src fails after retries. */
  fallbackSrc?: string | null;
  aspectRatio?: string;
}

/**
 * Shared resilient image renderer for invitations, galleries, Memory Vault, and admin previews.
 */
export function CeleventicImage({
  src,
  alt = "",
  className,
  fill,
  width,
  height,
  priority,
  sizes,
  objectFit = "cover",
  fallbackSrc,
  aspectRatio,
}: CeleventicImageProps) {
  const resolved = resolvePublicMediaUrl(src);
  const fallback = resolvePublicMediaUrl(fallbackSrc);
  const [current, setCurrent] = useState(resolved);
  const [failed, setFailed] = useState(false);
  const [retries, setRetries] = useState(0);

  useEffect(() => {
    setCurrent(resolved);
    setFailed(false);
    setRetries(0);
  }, [resolved]);

  const onError = useCallback(() => {
    if (retries < 1 && current) {
      setRetries((n) => n + 1);
      setCurrent(withBust(current));
      return;
    }
    if (fallback && current !== fallback) {
      setCurrent(fallback);
      return;
    }
    setFailed(true);
  }, [retries, current, fallback]);

  if (!current || failed) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-slate-100 text-slate-400 text-xs",
          className
        )}
        style={aspectRatio ? { aspectRatio } : undefined}
        role="img"
        aria-label={alt || "Image unavailable"}
      >
        Media unavailable
      </div>
    );
  }

  const unoptimized = shouldUnoptimizeNextImage(current);
  const fitClass =
    objectFit === "contain"
      ? "object-contain"
      : objectFit === "fill"
        ? "object-fill"
        : objectFit === "none"
          ? "object-none"
          : "object-cover";

  if (fill) {
    return (
      <Image
        src={current}
        alt={alt}
        fill
        className={cn(fitClass, className)}
        sizes={sizes ?? "(max-width: 768px) 100vw, 480px"}
        unoptimized={unoptimized}
        priority={priority}
        onError={onError}
      />
    );
  }

  if (width && height) {
    return (
      <Image
        src={current}
        alt={alt}
        width={width}
        height={height}
        className={cn(fitClass, className)}
        unoptimized={unoptimized}
        priority={priority}
        onError={onError}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={current}
      alt={alt}
      className={cn(fitClass, className)}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      onError={onError}
      style={aspectRatio ? { aspectRatio } : undefined}
    />
  );
}

function withBust(url: string): string {
  const join = url.includes("?") ? "&" : "?";
  return `${url}${join}retry=${Date.now()}`;
}

export interface CeleventicVideoProps {
  src: string | null | undefined;
  poster?: string | null;
  className?: string;
  controls?: boolean;
  autoPlayMuted?: boolean;
  loop?: boolean;
  preload?: "none" | "metadata" | "auto";
  pauseOffscreen?: boolean;
  ariaLabel?: string;
  onPlaybackError?: (detail: { src: string; code: number | null; message: string }) => void;
}

/**
 * Shared resilient video renderer — wraps progressive MP4 with poster, retry, and offscreen pause.
 * Prefer this (or `VideoPlayer` for processing-status-aware assets) over raw `<video src>`.
 */
export function CeleventicVideo({
  src,
  poster,
  className,
  controls = true,
  autoPlayMuted = false,
  loop = false,
  preload = "metadata",
  pauseOffscreen = true,
  ariaLabel,
  onPlaybackError,
}: CeleventicVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const resolved = resolvePublicMediaUrl(src);
  const resolvedPoster = resolvePublicMediaUrl(poster);
  const mime = useMemo(() => {
    const lower = resolved.toLowerCase();
    if (lower.includes(".webm")) return "video/webm";
    if (lower.includes(".mov")) return "video/quicktime";
    return "video/mp4";
  }, [resolved]);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setFailed(false);
    setAttempt(0);
  }, [resolved]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !pauseOffscreen || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting && !video.paused) video.pause();
        }
      },
      { threshold: 0.15, rootMargin: "80px" }
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, [pauseOffscreen, resolved]);

  if (!resolved || failed) {
    return (
      <div
        className={cn(
          "relative flex flex-col items-center justify-center gap-2 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden p-6 text-center",
          className
        )}
        role="alert"
      >
        {resolvedPoster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={resolvedPoster} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />
        ) : null}
        <p className="relative z-10 text-xs text-slate-600 font-medium">Video unavailable</p>
        {resolved ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="relative z-10 gap-1"
            onClick={() => {
              setFailed(false);
              setAttempt((n) => n + 1);
            }}
          >
            <RotateCcw className="h-3.5 w-3.5" /> Retry
          </Button>
        ) : null}
      </div>
    );
  }

  const playSrc = attempt > 0 ? `${resolved}${resolved.includes("?") ? "&" : "?"}r=${attempt}` : resolved;

  return (
    <div className={cn("relative rounded-xl overflow-hidden bg-black", className)}>
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        ref={videoRef}
        key={playSrc}
        poster={resolvedPoster || undefined}
        controls={controls}
        muted={autoPlayMuted}
        autoPlay={autoPlayMuted}
        playsInline
        preload={preload}
        loop={loop}
        aria-label={ariaLabel}
        className="w-full h-full object-cover"
        onError={() => {
          const mediaError = videoRef.current?.error;
          onPlaybackError?.({
            src: playSrc,
            code: mediaError?.code ?? null,
            message: mediaError?.message || "playback_error",
          });
          console.warn("[celeventic-video] playback failed", {
            src: playSrc,
            code: mediaError?.code ?? null,
          });
          setFailed(true);
        }}
      >
        <source src={playSrc} type={mime} />
      </video>
    </div>
  );
}
