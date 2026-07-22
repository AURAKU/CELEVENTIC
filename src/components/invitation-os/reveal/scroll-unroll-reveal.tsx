"use client";

import { useState } from "react";
import { ScrollText } from "lucide-react";
import { CELEVENTIC_BRAND } from "@/lib/invitation-os/brand";
import { RevealConfetti } from "@/components/invitation-os/reveal/reveal-confetti";

interface ScrollUnrollRevealProps {
  guestName?: string;
  eventTitle: string;
  hostName?: string;
  onComplete: () => void;
}

export function ScrollUnrollReveal({ guestName, eventTitle, hostName, onComplete }: ScrollUnrollRevealProps) {
  const [phase, setPhase] = useState<"idle" | "unrolling" | "done">("idle");

  function handleTap() {
    if (phase !== "idle") return;
    setPhase("unrolling");
    setTimeout(() => {
      setPhase("done");
      onComplete();
    }, 1400);
  }

  return (
    <div
      className="fixed inset-0 z-[100] safe-area-pt safe-area-pb flex items-center justify-center p-6"
      style={{ background: `linear-gradient(180deg, #1a1510 0%, ${CELEVENTIC_BRAND.palette.midnight} 100%)` }}
    >
      <RevealConfetti active={phase === "unrolling"} />
      <button
        type="button"
        onClick={handleTap}
        disabled={phase !== "idle"}
        className="relative w-full max-w-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A63A] rounded-2xl"
        aria-label="Unroll invitation scroll"
      >
        <div className="flex justify-center mb-6">
          <div className="h-14 w-14 rounded-full border border-[#D4A63A]/40 flex items-center justify-center bg-[#D4A63A]/10 animate-float">
            <ScrollText className="h-7 w-7 text-[#D4A63A]" />
          </div>
        </div>

        <div className="relative mx-auto" style={{ perspective: "900px" }}>
          {/* Scroll rods */}
          <div className="absolute -top-3 left-2 right-2 h-3 rounded-full bg-gradient-to-b from-[#8B7355] to-[#5c4a32] shadow-lg z-20" />
          <div className="absolute -bottom-3 left-2 right-2 h-3 rounded-full bg-gradient-to-b from-[#5c4a32] to-[#3d2f1f] shadow-lg z-20" />

          <div
            className={`relative overflow-hidden rounded-sm border border-[#D4A63A]/25 shadow-2xl transition-all duration-[1.2s] ease-out inv-scroll-unroll ${
              phase === "unrolling" ? "inv-scroll-unroll-active" : ""
            }`}
            style={{
              background: "linear-gradient(180deg, #f5ebe0 0%, #ede4d4 50%, #e8dcc8 100%)",
              minHeight: phase === "idle" ? "120px" : "280px",
            }}
          >
            <div className="px-8 py-10 text-center space-y-4">
              <p className="text-[10px] tracking-[0.35em] uppercase text-[#8B7355]">Royal invitation</p>
              {guestName && <p className="text-sm text-[#5c4a32]/80">Dear {guestName}</p>}
              <h2 className="font-display text-xl text-[#3d2f1f] leading-snug">{eventTitle}</h2>
              {hostName && <p className="text-xs text-[#8B7355]">With love from {hostName}</p>}
              {phase === "idle" && (
                <p className="text-xs text-[#8B7355]/80 pt-4 animate-pulse">Tap to unroll your invitation</p>
              )}
            </div>
          </div>
        </div>
      </button>
    </div>
  );
}
