"use client";

import { useEffect, useState } from "react";
import { RevealConfetti } from "@/components/invitation-os/reveal/reveal-confetti";

interface PalaceEntranceRevealProps {
  guestName?: string;
  eventTitle: string;
  hostName?: string;
  onComplete: () => void;
}

export function PalaceEntranceReveal({ guestName, eventTitle, hostName, onComplete }: PalaceEntranceRevealProps) {
  const [phase, setPhase] = useState<"doors" | "hall" | "done">("doors");

  useEffect(() => {
    if (phase === "doors") {
      const t = setTimeout(() => setPhase("hall"), 1800);
      return () => clearTimeout(t);
    }
    if (phase === "hall") {
      const t = setTimeout(() => {
        setPhase("done");
        onComplete();
      }, 2200);
      return () => clearTimeout(t);
    }
  }, [phase, onComplete]);

  if (phase === "done") return null;

  return (
    <div className="fixed inset-0 z-[100] safe-area-pt safe-area-pb bg-[#0a0a12] overflow-hidden">
      <RevealConfetti active={phase === "hall"} />

      {/* Light beams */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-32 h-full bg-gradient-to-b from-[#D4A63A]/20 to-transparent blur-2xl animate-shimmer" />
        <div className="absolute top-0 right-1/4 w-32 h-full bg-gradient-to-b from-[#D4A63A]/15 to-transparent blur-2xl animate-shimmer" style={{ animationDelay: "0.5s" }} />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-full bg-gradient-to-b from-[#F5E6B8]/10 to-transparent blur-3xl" />
      </div>

      {/* Palace doors */}
      <div
        className="absolute top-0 bottom-0 left-0 w-1/2 bg-gradient-to-r from-[#1a1510] to-[#2d2418] border-r border-[#D4A63A]/30 transition-transform duration-[1.8s] ease-in-out z-20"
        style={{ transform: phase !== "doors" ? "translateX(-100%)" : "translateX(0)" }}
      >
        <div className="absolute inset-y-0 right-0 w-1 bg-[#D4A63A]/40" />
      </div>
      <div
        className="absolute top-0 bottom-0 right-0 w-1/2 bg-gradient-to-l from-[#1a1510] to-[#2d2418] border-l border-[#D4A63A]/30 transition-transform duration-[1.8s] ease-in-out z-20"
        style={{ transform: phase !== "doors" ? "translateX(100%)" : "translateX(0)" }}
      >
        <div className="absolute inset-y-0 left-0 w-1 bg-[#D4A63A]/40" />
      </div>

      {/* Hall center */}
      <div className={`absolute inset-0 flex items-center justify-center z-30 transition-opacity duration-1000 ${phase === "hall" ? "opacity-100" : "opacity-0"}`}>
        <div className="text-center px-8 max-w-md inv-fade-in">
          <p className="text-[#D4A63A] text-xs tracking-[0.4em] uppercase mb-4">Welcome to the celebration</p>
          {guestName && <p className="text-white/60 text-sm mb-2">Dear {guestName}</p>}
          <h1 className="font-display text-3xl text-[#F5E6B8] leading-tight">{eventTitle}</h1>
          {hostName && <p className="mt-4 text-[#D4A63A]/80 text-sm">Hosted by {hostName}</p>}
          <div className="mt-8 flex justify-center gap-2 text-2xl text-[#D4A63A]/50">✦ ✦ ✦</div>
        </div>
      </div>
    </div>
  );
}
