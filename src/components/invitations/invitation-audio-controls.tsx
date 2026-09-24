"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Volume2, VolumeX, Pause, Play, Music2, ChevronLeft, ChevronRight } from "lucide-react";
import type { InvitationAudioManager } from "@/lib/music/invitation-audio-manager";
import { cn } from "@/lib/utils";

interface InvitationAudioControlsProps {
  manager: InvitationAudioManager;
  /** Position inside a preview frame instead of the full guest viewport */
  embedded?: boolean;
  className?: string;
  /** Track name shown when the controller is expanded */
  trackTitle?: string;
  /** Template accent, tints the active/hover state so the control belongs to the design */
  accentColor?: string;
  /** Surface tone the control sits on; drives light vs. dark chrome */
  variant?: "light" | "dark";
}

type MusicTray = "peek" | "idle" | "open";

const OPEN_IDLE_MS = 4200;
const DOCK_PEEK_MS = 2800;

/**
 * Premium, template-aware audio controller. Stays out of the way: the full
 * tray auto-tucks to a slim edge tab after a moment, and a tap or hover brings
 * it back. Mute / play never stop just because the chrome hides.
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
  const [tray, setTray] = useState<MusicTray>("idle");
  const [busy, setBusy] = useState(false);
  const hoverRef = useRef(false);
  const dockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function syncFromManager() {
    setMuted(manager.isMuted());
    setPlaying(manager.isPlaying());
    setVolume(manager.getVolume());
  }

  const clearDock = useCallback(() => {
    if (dockTimer.current) {
      clearTimeout(dockTimer.current);
      dockTimer.current = null;
    }
  }, []);

  const scheduleDock = useCallback(
    (from: MusicTray = tray) => {
      clearDock();
      if (hoverRef.current || from === "peek") return;
      dockTimer.current = setTimeout(
        () => {
          if (hoverRef.current) return;
          setTray((current) => {
            if (hoverRef.current) return current;
            if (current === "open") return "idle";
            if (current === "idle") return "peek";
            return current;
          });
        },
        from === "open" ? OPEN_IDLE_MS : DOCK_PEEK_MS
      );
    },
    [clearDock, tray]
  );

  useEffect(() => {
    const audio = manager.getAudio();
    syncFromManager();
    if (!audio) return;
    const sync = () => syncFromManager();
    audio.addEventListener("play", sync);
    audio.addEventListener("pause", sync);
    audio.addEventListener("volumechange", sync);
    audio.addEventListener("ended", sync);
    return () => {
      audio.removeEventListener("play", sync);
      audio.removeEventListener("pause", sync);
      audio.removeEventListener("volumechange", sync);
      audio.removeEventListener("ended", sync);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manager, tray]);

  useEffect(() => {
    scheduleDock(tray);
    return clearDock;
  }, [clearDock, scheduleDock, tray]);

  function showTray(next: MusicTray = "idle") {
    clearDock();
    setTray(next);
  }

  function hideTray() {
    hoverRef.current = false;
    clearDock();
    setTray("peek");
  }

  async function toggleMute() {
    if (busy) return;
    setBusy(true);
    try {
      if (manager.isMuted()) {
        manager.unmute();
        setMuted(false);
        if (!manager.isPlaying()) {
          const ok = await manager.play();
          setPlaying(ok);
        } else {
          setPlaying(true);
        }
      } else {
        manager.mute();
        setMuted(true);
        setPlaying(manager.isPlaying());
      }
      syncFromManager();
    } finally {
      setBusy(false);
      scheduleDock("idle");
    }
  }

  async function togglePlay() {
    if (busy) return;
    setBusy(true);
    try {
      if (manager.isPlaying()) {
        manager.pause();
        setPlaying(false);
      } else {
        const ok = await manager.play();
        setPlaying(ok);
        if (ok && manager.isMuted()) {
          manager.unmute();
          setMuted(false);
        }
      }
      syncFromManager();
    } finally {
      setBusy(false);
      scheduleDock("open");
    }
  }

  function onVolume(next: number) {
    setVolume(next);
    manager.setVolume(next);
    if (next > 0 && manager.isMuted()) {
      manager.unmute();
      setMuted(false);
    }
    if (next === 0 && !manager.isMuted()) {
      manager.mute();
      setMuted(true);
    }
    scheduleDock("open");
  }

  const peeked = tray === "peek";
  const expanded = tray === "open";
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
      className={cn(
        "z-[80] flex items-center gap-0.5 rounded-full border shadow-lg backdrop-blur-md transition-all duration-300 ease-out",
        peeked && "rounded-l-full rounded-r-none border-r-0 pr-0.5",
        positionClass,
        chrome,
        className
      )}
      data-music-tray={tray}
      onMouseEnter={() => {
        hoverRef.current = true;
        clearDock();
        if (tray === "peek") setTray("idle");
      }}
      onMouseLeave={() => {
        hoverRef.current = false;
        scheduleDock(tray === "peek" ? "idle" : tray);
      }}
    >
      {peeked ? (
        <button
          type="button"
          onClick={() => showTray("idle")}
          className="flex h-10 w-7 items-center justify-center rounded-full transition-transform active:scale-95 touch-manipulation"
          aria-label="Show music controls"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </button>
      ) : (
        <>
          <button
            type="button"
            onClick={() => void toggleMute()}
            onPointerDown={(e) => {
              if (e.pointerType === "touch") e.currentTarget.focus({ preventScroll: true });
            }}
            onFocus={() => showTray("open")}
            disabled={busy}
            className="flex h-10 w-10 items-center justify-center rounded-full transition-transform active:scale-95 touch-manipulation disabled:opacity-60"
            aria-label={muted ? "Unmute music" : "Mute music"}
            aria-pressed={muted}
            style={!muted ? accentStyle : undefined}
          >
            {muted ? <VolumeX className="h-4 w-4" aria-hidden /> : <Volume2 className="h-4 w-4" aria-hidden />}
          </button>
          <div
            className={cn(
              "flex items-center gap-2 overflow-hidden transition-all duration-300",
              expanded ? "max-w-[13rem] pr-1 opacity-100" : "max-w-0 opacity-0"
            )}
          >
            <button
              type="button"
              onClick={() => void togglePlay()}
              disabled={busy}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-transform active:scale-95 disabled:opacity-60"
              aria-label={playing ? "Pause music" : "Play music"}
              style={accentStyle}
            >
              {playing ? <Pause className="h-3.5 w-3.5" aria-hidden /> : <Play className="h-3.5 w-3.5" aria-hidden />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(e) => onVolume(Number(e.target.value))}
              onPointerDown={() => showTray("open")}
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
          <button
            type="button"
            onClick={() => showTray(expanded ? "idle" : "open")}
            className={cn(
              "flex h-10 w-6 items-center justify-center rounded-full text-xs opacity-70 transition-opacity hover:opacity-100",
              expanded && "hidden"
            )}
            aria-label="Show music controls"
            aria-expanded={expanded}
          >
            <span aria-hidden>⋯</span>
          </button>
          <button
            type="button"
            onClick={hideTray}
            className="flex h-10 w-6 shrink-0 items-center justify-center rounded-full opacity-70 transition-opacity hover:opacity-100 touch-manipulation"
            aria-label="Hide music controls"
            title="Hide"
          >
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </button>
        </>
      )}
    </div>
  );
}
