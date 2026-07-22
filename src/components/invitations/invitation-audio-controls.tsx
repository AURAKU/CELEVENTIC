"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX, Pause, Play, Music2 } from "lucide-react";
import type { InvitationAudioManager } from "@/lib/music/invitation-audio-manager";
import { cn } from "@/lib/utils";

interface InvitationAudioControlsProps {
  manager: InvitationAudioManager;
  /** Position inside a preview frame instead of the full guest viewport */
  embedded?: boolean;
  className?: string;
  /** Track name shown when the controller is expanded */
  trackTitle?: string;
  /** Template accent — tints the active/hover state so the control belongs to the design */
  accentColor?: string;
  /** Surface tone the control sits on; drives light vs. dark chrome */
  variant?: "light" | "dark";
}

/**
 * Premium, template-aware audio controller. Collapsed it is a single
 * unobtrusive pill in the top corner (never covers content). Tap to expand a
 * slim panel with play/pause, a volume slider and the track title. Behaviour
 * is identical across templates; appearance adapts to the template's accent
 * and surface so it never reads as a generic bolted-on button.
 */
export function InvitationAudioControls({
  manager,
  embedded,
  className,
  trackTitle,
  accentColor,
  variant = "dark",
}: InvitationAudioControlsProps) {
  const [muted, setMuted] = useState(manager.isMuted());
  const [playing, setPlaying] = useState(manager.isPlaying());
  const [volume, setVolume] = useState(manager.getVolume());
  const [expanded, setExpanded] = useState(false);
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep UI in sync with the underlying media element.
  useEffect(() => {
    const audio = manager.getAudio();
    setMuted(manager.isMuted());
    setPlaying(manager.isPlaying());
    setVolume(manager.getVolume());
    if (!audio) return;
    const sync = () => {
      setPlaying(!audio.paused);
      setMuted(manager.isMuted());
    };
    audio.addEventListener("play", sync);
    audio.addEventListener("pause", sync);
    return () => {
      audio.removeEventListener("play", sync);
      audio.removeEventListener("pause", sync);
    };
  }, [manager, expanded]);

  // Auto-collapse the expanded panel so it never lingers over content.
  function scheduleCollapse() {
    if (collapseTimer.current) clearTimeout(collapseTimer.current);
    collapseTimer.current = setTimeout(() => setExpanded(false), 4200);
  }
  useEffect(() => {
    if (expanded) scheduleCollapse();
    return () => {
      if (collapseTimer.current) clearTimeout(collapseTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded]);

  async function toggleMute() {
    if (muted) {
      manager.unmute();
      setMuted(false);
      if (!manager.isPlaying()) {
        await manager.play();
        setPlaying(true);
      }
    } else {
      manager.mute();
      setMuted(true);
    }
    scheduleCollapse();
  }

  async function togglePlay() {
    if (manager.isPlaying()) {
      manager.pause();
      setPlaying(false);
    } else {
      await manager.play();
      setPlaying(true);
      if (manager.isMuted()) {
        manager.unmute();
        setMuted(false);
      }
    }
    scheduleCollapse();
  }

  function onVolume(next: number) {
    setVolume(next);
    manager.setVolume(next);
    if (next > 0 && manager.isMuted()) {
      manager.unmute();
      setMuted(false);
    }
    scheduleCollapse();
  }

  const positionClass = embedded
    ? "absolute top-3 right-3"
    : "fixed safe-area-inset-top safe-area-inset-right";
  const chrome =
    variant === "light"
      ? "border-black/10 bg-white/70 text-slate-800"
      : "border-white/25 bg-black/35 text-white";
  const accentStyle = accentColor ? { color: accentColor } : undefined;

  return (
    <div
      className={cn("z-[80] flex items-center gap-1 rounded-full border shadow-lg backdrop-blur-md", positionClass, chrome, className)}
      onMouseEnter={() => {
        if (collapseTimer.current) clearTimeout(collapseTimer.current);
      }}
    >
      {/* Primary control: mute/unmute (always visible, keeps one-tap behaviour) */}
      <button
        type="button"
        onClick={() => void toggleMute()}
        onFocus={() => setExpanded(true)}
        className="flex h-10 w-10 items-center justify-center rounded-full transition-transform active:scale-95 touch-manipulation"
        aria-label={muted ? "Unmute music" : "Mute music"}
        style={!muted ? accentStyle : undefined}
      >
        {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </button>

      {/* Expandable panel: play/pause + volume + track title */}
      <div
        className={cn(
          "flex items-center gap-2 overflow-hidden transition-all duration-300",
          expanded ? "max-w-[13rem] pr-3 opacity-100" : "max-w-0 opacity-0"
        )}
      >
        <button
          type="button"
          onClick={() => void togglePlay()}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-transform active:scale-95"
          aria-label={playing ? "Pause music" : "Play music"}
          style={accentStyle}
        >
          {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={volume}
          onChange={(e) => onVolume(Number(e.target.value))}
          aria-label="Music volume"
          className="h-1 w-16 shrink-0 cursor-pointer accent-current"
          style={accentStyle}
        />
        {trackTitle && (
          <span className="flex min-w-0 items-center gap-1 text-[11px] font-medium">
            <Music2 className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
            <span className="truncate">{trackTitle}</span>
          </span>
        )}
      </div>

      {/* Expand toggle — only rendered when there's more to reveal */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className={cn("flex h-10 w-6 items-center justify-center rounded-full text-xs opacity-70 transition-opacity hover:opacity-100", expanded && "hidden")}
        aria-label="Show music controls"
        aria-expanded={expanded}
      >
        <span aria-hidden>⋯</span>
      </button>
    </div>
  );
}
