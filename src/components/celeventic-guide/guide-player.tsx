"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { storyboardAspectCss } from "@/lib/celeventic-guide/storyboards";

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

type CaptionLocale = "en" | "fr";
type Aspect = "9:16" | "16:9" | "1:1";

export function GuidePlayer({
  slug,
  title,
  videoUrl,
  posterUrl,
  captionsUrl,
  captionsEnUrl,
  captionsFrUrl,
  transcript,
  aspect = "9:16",
  className,
}: {
  slug: string;
  title: string;
  videoUrl: string | null;
  posterUrl: string | null;
  /** @deprecated prefer captionsEnUrl */
  captionsUrl?: string | null;
  captionsEnUrl?: string | null;
  captionsFrUrl?: string | null;
  transcript?: string;
  aspect?: Aspect;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [volume, setVolume] = useState(0.8);
  const [captionsOn, setCaptionsOn] = useState(true);
  const [captionLocale, setCaptionLocale] = useState<CaptionLocale>("en");
  const [speed, setSpeed] = useState(1);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const milestones = useRef(new Set<number>());

  const enCaptions = captionsEnUrl ?? captionsUrl ?? null;
  const frCaptions = captionsFrUrl ?? null;
  const aspectClass = storyboardAspectCss(aspect);
  const maxW = aspect === "16:9" ? "max-w-2xl" : aspect === "1:1" ? "max-w-md" : "max-w-sm";

  useEffect(() => {
    try {
      const nav = typeof navigator !== "undefined" ? navigator.language.toLowerCase() : "en";
      if (nav.startsWith("fr") && frCaptions) setCaptionLocale("fr");
    } catch {
      /* ignore */
    }
  }, [frCaptions]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !videoUrl) return;
    const start = loadVideoPosition(slug);
    const onLoaded = () => {
      if (start > 0 && start < (v.duration || Infinity) - 2) v.currentTime = start;
      v.volume = volume;
    };
    v.addEventListener("loadedmetadata", onLoaded);
    return () => v.removeEventListener("loadedmetadata", onLoaded);
  }, [slug, videoUrl, volume]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    for (let i = 0; i < v.textTracks.length; i++) {
      const track = v.textTracks[i];
      const wantLang = captionLocale === "fr" ? "fr" : "en";
      const match = track.language === wantLang || (!track.language && wantLang === "en");
      track.mode = captionsOn && match ? "showing" : "disabled";
    }
  }, [captionsOn, captionLocale, enCaptions, frCaptions, videoUrl]);

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

  const onVolume = (value: number) => {
    const v = videoRef.current;
    const next = Math.min(1, Math.max(0, value));
    setVolume(next);
    if (v) {
      v.volume = next;
      if (next > 0 && v.muted) {
        v.muted = false;
        setMuted(false);
      }
      if (next === 0) {
        v.muted = true;
        setMuted(true);
      }
    }
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
        /* unsupported */
      }
    }
  };

  const share = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const canNativeShare = typeof navigator.share === "function";
    try {
      if (canNativeShare) await navigator.share({ title, url });
      else await navigator.clipboard.writeText(url);
      trackGuideEvent("guide_share", { slug, method: canNativeShare ? "native" : "clipboard" });
    } catch {
      /* cancelled */
    }
  };

  const progressLabel = useMemo(() => {
    const fmt = (s: number) => {
      const m = Math.floor(s / 60);
      const r = Math.floor(s % 60);
      return `${m}:${String(r).padStart(2, "0")}`;
    };
    return `${fmt(progress)} / ${fmt(duration || 0)}`;
  }, [progress, duration]);

  if (!videoUrl) {
    return (
      <div
        className={cn(
          "relative w-full mx-auto overflow-hidden rounded-2xl bg-gradient-to-br from-brand-800 via-brand-600 to-slate-900",
          aspectClass,
          maxW,
          "max-h-[70vh]",
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
        className={cn(
          "relative w-full mx-auto overflow-hidden rounded-2xl bg-black group",
          aspectClass,
          maxW,
          "max-h-[70vh]"
        )}
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
          {enCaptions && (
            <track kind="captions" srcLang="en" label="English" src={enCaptions} default={captionLocale === "en"} />
          )}
          {frCaptions && (
            <track kind="captions" srcLang="fr" label="Français" src={frCaptions} default={captionLocale === "fr"} />
          )}
        </video>

        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-3 space-y-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition">
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={progress}
            aria-label="Seek"
            className="w-full accent-brand-400"
            onChange={(e) => {
              const v = videoRef.current;
              const t = Number(e.target.value);
              if (v) v.currentTime = t;
              setProgress(t);
            }}
          />
          <div className="flex flex-wrap items-center gap-1.5 text-white">
            <Button type="button" size="sm" variant="ghost" className="text-white hover:bg-white/15" onClick={togglePlay} aria-label={playing ? "Pause" : "Play"}>
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button type="button" size="sm" variant="ghost" className="text-white hover:bg-white/15" onClick={toggleMute} aria-label={muted ? "Unmute" : "Mute"}>
              {muted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              aria-label="Volume"
              className="w-20 accent-brand-400"
              onChange={(e) => onVolume(Number(e.target.value))}
            />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-white hover:bg-white/15"
              onClick={() => setCaptionsOn((c) => !c)}
              aria-pressed={captionsOn}
              aria-label="Toggle captions"
            >
              <Captions className="h-4 w-4" />
            </Button>
            {frCaptions && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-white hover:bg-white/15 text-xs"
                onClick={() => setCaptionLocale((l) => (l === "en" ? "fr" : "en"))}
                aria-label="Caption language"
              >
                {captionLocale.toUpperCase()}
              </Button>
            )}
            <Button type="button" size="sm" variant="ghost" className="text-white hover:bg-white/15 text-xs" onClick={cycleSpeed}>
              {speed}x
            </Button>
            <Button type="button" size="sm" variant="ghost" className="text-white hover:bg-white/15" onClick={replay} aria-label="Replay">
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button type="button" size="sm" variant="ghost" className="text-white hover:bg-white/15 text-xs" onClick={pip}>
              PiP
            </Button>
            <Button type="button" size="sm" variant="ghost" className="text-white hover:bg-white/15" onClick={toggleFs} aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}>
              {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
            <Button type="button" size="sm" variant="ghost" className="text-white hover:bg-white/15" onClick={share} aria-label="Share">
              <Share2 className="h-4 w-4" />
            </Button>
            <span className="ml-auto text-[11px] tabular-nums text-white/80">{progressLabel}</span>
          </div>
        </div>
      </div>

      {transcript ? (
        <div className="space-y-2">
          <Button type="button" size="sm" variant="outline" onClick={() => setShowTranscript((s) => !s)}>
            {showTranscript ? "Hide transcript" : "Show transcript"}
          </Button>
          {showTranscript && (
            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap rounded-xl border border-slate-200 bg-white/80 p-4">
              {transcript}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
