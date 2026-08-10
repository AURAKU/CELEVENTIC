"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Captions,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  Share2,
  Volume2,
  VolumeX,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { loadVideoPosition, rememberVideoPosition } from "@/lib/celeventic-guide/tour-storage";
import { trackGuideEvent } from "@/lib/celeventic-guide/analytics";
import { Button } from "@/components/ui/button";

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

export function GuidePlayer({
  slug,
  title,
  videoUrl,
  posterUrl,
  captionsUrl,
  transcript,
  className,
}: {
  slug: string;
  title: string;
  videoUrl: string | null;
  posterUrl: string | null;
  captionsUrl?: string | null;
  transcript?: string;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [captionsOn, setCaptionsOn] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const milestones = useRef(new Set<number>());

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !videoUrl) return;
    const start = loadVideoPosition(slug);
    const onLoaded = () => {
      if (start > 0 && start < (v.duration || Infinity) - 2) {
        v.currentTime = start;
      }
    };
    v.addEventListener("loadedmetadata", onLoaded);
    return () => v.removeEventListener("loadedmetadata", onLoaded);
  }, [slug, videoUrl]);

  const onTime = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    setProgress(v.currentTime);
    setDuration(v.duration || 0);
    rememberVideoPosition(slug, v.currentTime);
    if (v.duration > 0) {
      const pct = v.currentTime / v.duration;
      for (const m of [0.25, 0.5, 0.75, 0.95]) {
        if (pct >= m && !milestones.current.has(m)) {
          milestones.current.add(m);
          trackGuideEvent("guide_video_milestone", { slug, milestone: m });
        }
      }
    }
  }, [slug]);

  const togglePlay = async () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      await v.play();
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  const cycleSpeed = () => {
    const v = videoRef.current;
    const idx = SPEEDS.indexOf(speed);
    const next = SPEEDS[(idx + 1) % SPEEDS.length];
    setSpeed(next);
    if (v) v.playbackRate = next;
  };

  const replay = async () => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = 0;
    milestones.current.clear();
    await v.play();
    setPlaying(true);
    trackGuideEvent("guide_motion_replay", { slug });
  };

  const toggleFs = async () => {
    const el = shellRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      await el.requestFullscreen?.();
      setFullscreen(true);
    } else {
      await document.exitFullscreen?.();
      setFullscreen(false);
    }
  };

  const pip = async () => {
    const v = videoRef.current as HTMLVideoElement & {
      requestPictureInPicture?: () => Promise<unknown>;
    };
    if (v?.requestPictureInPicture) {
      try {
        await v.requestPictureInPicture();
      } catch {
        /* unsupported / denied */
      }
    }
  };

  const share = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (navigator.share) await navigator.share({ title, url });
      else await navigator.clipboard.writeText(url);
      trackGuideEvent("guide_share", { slug, method: navigator.share ? "native" : "clipboard" });
    } catch {
      /* cancelled */
    }
  };

  if (!videoUrl) {
    return (
      <div
        className={cn(
          "relative aspect-[9/16] max-h-[70vh] w-full max-w-sm mx-auto overflow-hidden rounded-2xl bg-gradient-to-br from-brand-800 via-brand-600 to-slate-900",
          className
        )}
      >
        {posterUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={posterUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-80" loading="lazy" />
        )}
        <div className="absolute inset-0 flex flex-col items-center justify-end p-6 bg-gradient-to-t from-black/70 via-black/20 to-transparent">
          <p className="text-white font-display text-xl text-center">{title}</p>
          <p className="text-white/80 text-sm mt-2 text-center">
            Interactive walkthrough below — video recording coming soon.
          </p>
          <Button type="button" variant="secondary" className="mt-4" onClick={share}>
            <Share2 className="h-4 w-4 mr-2" /> Share
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div
        ref={shellRef}
        className="relative aspect-[9/16] max-h-[70vh] w-full max-w-sm mx-auto overflow-hidden rounded-2xl bg-black group"
      >
        <video
          ref={videoRef}
          className="h-full w-full object-contain"
          poster={posterUrl ?? undefined}
          preload="metadata"
          playsInline
          muted={muted}
          onTimeUpdate={onTime}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          aria-label={title}
        >
          <source src={videoUrl} />
          {captionsUrl && (
            <track kind="captions" srcLang="en" label="English" src={captionsUrl} default={captionsOn} />
          )}
        </video>

        <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition">
          <input
            type="range"
            min={0}
            max={duration || 1}
            step={0.1}
            value={progress}
            aria-label="Playback progress"
            className="w-full accent-brand-400"
            onChange={(e) => {
              const v = videoRef.current;
              const t = Number(e.target.value);
              if (v) v.currentTime = t;
              setProgress(t);
            }}
          />
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-white">
            <IconBtn label={playing ? "Pause" : "Play"} onClick={togglePlay}>
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </IconBtn>
            <IconBtn label={muted ? "Unmute" : "Mute"} onClick={toggleMute}>
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </IconBtn>
            <IconBtn label="Captions" onClick={() => setCaptionsOn((c) => !c)} pressed={captionsOn}>
              <Captions className="h-4 w-4" />
            </IconBtn>
            <IconBtn label={`Speed ${speed}x`} onClick={cycleSpeed}>
              <span className="text-[11px] font-semibold">{speed}x</span>
            </IconBtn>
            <IconBtn label="Replay" onClick={replay}>
              <RotateCcw className="h-4 w-4" />
            </IconBtn>
            <IconBtn label="Picture in picture" onClick={pip}>
              <span className="text-[10px] font-bold">PiP</span>
            </IconBtn>
            <IconBtn label={fullscreen ? "Exit fullscreen" : "Fullscreen"} onClick={toggleFs}>
              {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </IconBtn>
            <IconBtn label="Share" onClick={share}>
              <Share2 className="h-4 w-4" />
            </IconBtn>
          </div>
        </div>
      </div>

      {transcript ? (
        <div className="max-w-sm mx-auto">
          <button
            type="button"
            className="text-sm text-brand-700 hover:underline"
            onClick={() => setShowTranscript((s) => !s)}
            aria-expanded={showTranscript}
          >
            {showTranscript ? "Hide transcript" : "Show transcript"}
          </button>
          {showTranscript && (
            <p className="mt-2 text-sm text-slate-600 leading-relaxed whitespace-pre-wrap rounded-xl border border-slate-100 bg-white/70 p-4">
              {transcript}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

function IconBtn({
  label,
  onClick,
  children,
  pressed,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  pressed?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      onClick={onClick}
      className="inline-flex h-8 min-w-8 items-center justify-center rounded-md bg-white/10 px-1.5 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
    >
      {children}
    </button>
  );
}
