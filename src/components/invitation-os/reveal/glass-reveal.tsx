"use client";

import { useState } from "react";
import { MoveHorizontal } from "lucide-react";

interface GlassRevealProps {
  guestName?: string;
  eventTitle: string;
  onComplete: () => void;
}

export function GlassReveal({ guestName, eventTitle, onComplete }: GlassRevealProps) {
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  function handleSwipe(e: React.PointerEvent<HTMLDivElement>) {
    if (done) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.min(100, Math.max(0, (x / rect.width) * 100));
    setProgress(pct);
    if (pct > 78) {
      setDone(true);
      setTimeout(onComplete, 600);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] safe-area-pt safe-area-pb bg-[#0a1628] flex flex-col items-center justify-center p-6">
      <div className="text-center mb-8 space-y-2">
        {guestName && <p className="text-white/50 text-xs tracking-widest uppercase">For {guestName}</p>}
        <h2 className="font-display text-2xl text-white/90">{eventTitle}</h2>
        <p className="text-white/40 text-sm flex items-center justify-center gap-2">
          <MoveHorizontal className="h-4 w-4" /> Swipe the glass to reveal
        </p>
      </div>

      <div
        className="relative w-full max-w-md h-64 rounded-3xl overflow-hidden border border-white/10 shadow-2xl touch-none"
        onPointerMove={handleSwipe}
        onPointerDown={handleSwipe}
      >
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, #0B8A83 0%, #0F172A 50%, #D4A63A 100%)",
            opacity: done ? 1 : 0.3 + progress / 140,
            transition: done ? "opacity 0.6s" : "none",
          }}
        >
          <p className="text-white/80 font-display text-lg tracking-wide">You&apos;re invited</p>
        </div>
        <div
          className="absolute inset-0 backdrop-blur-xl bg-white/10"
          style={{
            clipPath: `inset(0 ${100 - progress}% 0 0)`,
            transition: done ? "clip-path 0.6s ease" : "none",
          }}
        />
        <div
          className="absolute top-0 bottom-0 w-1 bg-white/60 shadow-[0_0_20px_rgba(255,255,255,0.5)]"
          style={{ left: `${progress}%`, opacity: done ? 0 : 1, transition: "opacity 0.4s" }}
        />
      </div>
    </div>
  );
}
