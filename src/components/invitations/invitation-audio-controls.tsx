"use client";

import { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import type { InvitationAudioManager } from "@/lib/music/invitation-audio-manager";
import { cn } from "@/lib/utils";

interface InvitationAudioControlsProps {
  manager: InvitationAudioManager;
  /** Position inside a preview frame instead of the full guest viewport */
  embedded?: boolean;
  className?: string;
}

/** Minimal mute toggle — top corner, never blocks template content. */
export function InvitationAudioControls({
  manager,
  embedded,
  className,
}: InvitationAudioControlsProps) {
  const [muted, setMuted] = useState(manager.isMuted());

  useEffect(() => {
    setMuted(manager.isMuted());
  }, [manager]);

  async function handleToggleMute() {
    if (muted) {
      manager.unmute();
      setMuted(false);
      if (!manager.isPlaying()) {
        await manager.play();
      }
    } else {
      manager.mute();
      setMuted(true);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleToggleMute()}
      className={cn(
        "z-[80] flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-black/35 text-white shadow-lg backdrop-blur-md transition-colors hover:bg-black/50 touch-manipulation",
        embedded ? "absolute top-3 right-3 safe-area-inset-top safe-area-inset-right" : "fixed safe-area-inset-top safe-area-inset-right",
        className
      )}
      aria-label={muted ? "Unmute music" : "Mute music"}
      title={muted ? "Unmute" : "Mute"}
    >
      {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
    </button>
  );
}
