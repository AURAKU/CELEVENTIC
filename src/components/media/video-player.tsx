"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Loader2, AlertTriangle, RotateCcw, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Module-level registry so at most N videos autoplay/play concurrently across the whole page (feeds, cards, galleries). */
const MAX_CONCURRENT_PLAYING = 2;
const playingRegistry = new Set<HTMLVideoElement>();

function registerPlaying(el: HTMLVideoElement) {
  playingRegistry.add(el);
  if (playingRegistry.size > MAX_CONCURRENT_PLAYING) {
    for (const other of playingRegistry) {
      if (other !== el) {
        other.pause();
        playingRegistry.delete(other);
        break;
      }
    }
  }
}
function unregisterPlaying(el: HTMLVideoElement) {
  playingRegistry.delete(el);
}

export type VideoPlayerStatus = "UPLOADING" | "UPLOADED" | "QUEUED" | "PROCESSING" | "READY" | "FAILED" | "CANCELLED";

export interface VideoPlayerProps {
  /** Direct MP4 URL — always required as the universal-compatibility fallback. */
  src: string | null;
  /** HLS master playlist (.m3u8) — used for ABR on longer videos when available. */
  hlsSrc?: string | null;
  poster?: string | null;
  status?: VideoPlayerStatus;
  failureReason?: string | null;
  onRetry?: () => void;
  captionsUrl?: string | null;
  captionsLabel?: string;
  className?: string;
  /** Card/list contexts: no metadata preload, play only after user interaction or explicit `autoPlayInView`. */
  preload?: "none" | "metadata" | "auto";
  autoPlayMuted?: boolean;
  /** Pause automatically when scrolled out of the viewport (recommended for feeds/grids). */
  pauseOffscreen?: boolean;
  loop?: boolean;
  controls?: boolean;
  ariaLabel?: string;
}

/**
 * Universal video player: MP4 fallback + native HLS (Safari) or hls.js (everywhere else),
 * poster, lazy metadata loading, pause-off-viewport, a bounded concurrent-autoplay limiter,
 * and processing/failed/loading skeleton states driven by the VideoAsset status model.
 */
export function VideoPlayer({
  src,
  hlsSrc,
  poster,
  status = "READY",
  failureReason,
  onRetry,
  captionsUrl,
  captionsLabel = "Captions",
  className,
  preload = "metadata",
  autoPlayMuted = false,
  pauseOffscreen = true,
  loop = false,
  controls = true,
  ariaLabel,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsInstanceRef = useRef<import("hls.js").default | null>(null);
  const [loadError, setLoadError] = useState(false);

  const isProcessing = status === "UPLOADING" || status === "UPLOADED" || status === "QUEUED" || status === "PROCESSING";
  const isFailed = status === "FAILED" || status === "CANCELLED";
  const playableSrc = hlsSrc || src;

  const attachHls = useCallback(async (video: HTMLVideoElement, url: string) => {
    const canNativeHls = video.canPlayType("application/vnd.apple.mpegurl") !== "";
    if (canNativeHls) {
      video.src = url;
      return;
    }
    const { default: Hls } = await import("hls.js");
    if (Hls.isSupported()) {
      const hls = new Hls({ maxBufferLength: 30 });
      hls.loadSource(url);
      hls.attachMedia(video);
      hlsInstanceRef.current = hls;
    } else if (src) {
      // No HLS support at all (very old browser) — fall back to progressive MP4.
      video.src = src;
    }
  }, [src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !playableSrc || isProcessing || isFailed) return;
    setLoadError(false);

    if (hlsSrc) {
      void attachHls(video, hlsSrc);
    } else if (src) {
      video.src = src;
    }

    return () => {
      if (hlsInstanceRef.current) {
        hlsInstanceRef.current.destroy();
        hlsInstanceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playableSrc, hlsSrc, src, isProcessing, isFailed]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !pauseOffscreen || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting && !video.paused) video.pause();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, [pauseOffscreen]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onPlay = () => registerPlaying(video);
    const onPauseOrEnd = () => unregisterPlaying(video);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPauseOrEnd);
    video.addEventListener("ended", onPauseOrEnd);
    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPauseOrEnd);
      video.removeEventListener("ended", onPauseOrEnd);
      unregisterPlaying(video);
    };
  }, []);

  if (isProcessing) {
    return (
      <div
        ref={containerRef}
        className={cn("relative flex items-center justify-center bg-slate-100 rounded-xl overflow-hidden", className)}
        role="status"
        aria-label="Video is processing"
      >
        {poster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={poster} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40 blur-sm" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-200 to-slate-100 animate-pulse" />
        )}
        <div className="relative z-10 flex flex-col items-center gap-2 text-slate-600 py-8 px-4 text-center">
          <Loader2 className="h-6 w-6 animate-spin" />
          <p className="text-xs font-medium">Preparing your video for smooth playback.</p>
        </div>
      </div>
    );
  }

  if (isFailed || loadError || !playableSrc) {
    return (
      <div
        className={cn("relative flex items-center justify-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden", className)}
        role="alert"
      >
        <div className="flex flex-col items-center gap-2 text-slate-500 py-8 px-4 text-center">
          <AlertTriangle className="h-6 w-6 text-amber-500" />
          <p className="text-xs font-medium">
            {failureReason ?? "We could not prepare this video. Please retry or upload another copy."}
          </p>
          {onRetry && (
            <Button type="button" size="sm" variant="outline" className="gap-1 mt-1" onClick={onRetry}>
              <RotateCcw className="h-3.5 w-3.5" /> Retry
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={cn("relative rounded-xl overflow-hidden bg-black", className)}>
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        ref={videoRef}
        poster={poster ?? undefined}
        controls={controls}
        muted={autoPlayMuted}
        autoPlay={autoPlayMuted}
        playsInline
        preload={preload}
        loop={loop}
        aria-label={ariaLabel}
        className="w-full h-full object-cover"
        onError={() => setLoadError(true)}
      >
        {captionsUrl && <track kind="captions" src={captionsUrl} label={captionsLabel} default />}
        {!hlsSrc && src && <source src={src} type="video/mp4" />}
      </video>
      {autoPlayMuted && (
        <button
          type="button"
          aria-label="Play video"
          className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 hover:opacity-100 transition-opacity"
          onClick={() => videoRef.current?.play()}
        >
          <PlayCircle className="h-10 w-10 text-white/90 drop-shadow" />
        </button>
      )}
    </div>
  );
}
