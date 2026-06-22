"use client";

import { useEffect, useState } from "react";
import { Volume2, VolumeX, Play, Pause, RotateCcw } from "lucide-react";
import type { InvitationAudioManager } from "@/lib/music/invitation-audio-manager";
import { cn } from "@/lib/utils";

interface InvitationAudioControlsProps {
  manager: InvitationAudioManager;
  trackTitle?: string;
  className?: string;
}

export function InvitationAudioControls({ manager, trackTitle, className }: InvitationAudioControlsProps) {
  const [playing, setPlaying] = useState(manager.isPlaying());
  const [muted, setMuted] = useState(manager.isMuted());
  const [expanded, setExpanded] = useState(false);
  const [volume, setVolume] = useState(manager.getVolume());

  useEffect(() => {
    const audio = manager.getAudio();
    if (!audio) return;

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);

    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
    };
  }, [manager]);

  async function handleToggle() {
    const nowPlaying = await manager.toggle();
    setPlaying(nowPlaying);
  }

  function handleMute() {
    if (muted) {
      manager.unmute();
      setMuted(false);
    } else {
      manager.mute();
      setMuted(true);
    }
  }

  function handleVolume(v: number) {
    setVolume(v);
    manager.setVolume(v);
    if (v > 0 && muted) {
      manager.unmute();
      setMuted(false);
    }
  }

  async function handleRestart() {
    const ok = await manager.restart();
    setPlaying(ok);
  }

  return (
    <div
      className={cn(
        "fixed bottom-20 left-4 z-[80] flex flex-col items-start gap-2",
        className
      )}
    >
      {expanded && (
        <div className="rounded-2xl border border-white/20 bg-white/95 backdrop-blur-xl shadow-lg px-3 py-3 w-44 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <label className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">Volume</label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={muted ? 0 : volume}
            onChange={(e) => handleVolume(parseFloat(e.target.value))}
            className="w-full mt-1 accent-[#0B8A83]"
            aria-label="Volume"
          />
        </div>
      )}

      <div className="flex items-center gap-1 rounded-full border border-slate-200/80 bg-white/95 backdrop-blur-xl shadow-lg p-1 max-w-[min(100vw-2rem,320px)]">
        {trackTitle && (
          <span className="hidden sm:block pl-3 pr-1 text-xs text-slate-500 truncate max-w-[120px]" title={trackTitle}>
            {trackTitle}
          </span>
        )}
        <button
          type="button"
          onClick={() => void handleToggle()}
          className="h-9 w-9 rounded-full flex items-center justify-center text-[#0B8A83] hover:bg-[#0B8A83]/10 transition-colors touch-manipulation"
          aria-label={playing ? "Pause music" : "Play music"}
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={handleMute}
          className="h-9 w-9 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors touch-manipulation"
          aria-label={muted ? "Unmute" : "Mute"}
        >
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={() => void handleRestart()}
          className="h-9 w-9 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors touch-manipulation"
          aria-label="Restart music"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="h-9 px-2 rounded-full text-[10px] font-semibold uppercase tracking-wide text-slate-500 hover:bg-slate-100 transition-colors touch-manipulation"
        >
          {expanded ? "Less" : "Vol"}
        </button>
      </div>
    </div>
  );
}
