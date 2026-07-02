"use client";

import { useState, useEffect } from "react";
import { RevealConfetti } from "@/components/invitation-os/reveal/reveal-confetti";
import { triggerHapticLight } from "@/lib/haptics";
import { playRevealSounds } from "@/lib/experience/reveal-sounds";
import type { EnvelopeVisualTheme } from "@/lib/experience/opening-experiences";

interface EnvelopeCollectionRevealProps {
  theme: EnvelopeVisualTheme;
  guestName?: string;
  eventTitle: string;
  hostName?: string;
  musicEnabled?: boolean;
  enableSounds?: boolean;
  onComplete: () => void;
}

export function EnvelopeCollectionReveal({
  theme,
  guestName,
  eventTitle,
  hostName,
  musicEnabled,
  enableSounds,
  onComplete,
}: EnvelopeCollectionRevealProps) {
  const [phase, setPhase] = useState<"idle" | "opening" | "done">("idle");

  function handleOpen() {
    if (phase !== "idle") return;
    triggerHapticLight();
    playRevealSounds(enableSounds);
    setPhase("opening");
    setTimeout(() => {
      setPhase("done");
      onComplete();
    }, 1100);
  }

  if (phase === "done") return null;

  const isOpening = phase === "opening";
  const sealChar = theme.sealIcon ?? "✦";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
      style={{ background: "linear-gradient(160deg, #0F172A 0%, #1a3a38 50%, #0B8A83 100%)" }}
    >
      <RevealConfetti active={isOpening} />

      {/* Floral decoration */}
      {theme.floral && (
        <div className="absolute inset-0 pointer-events-none opacity-40">
          {["top-10 left-8", "top-16 right-10", "bottom-20 left-12", "bottom-16 right-8"].map((pos, i) => (
            <span key={i} className={`absolute ${pos} text-3xl text-pink-300 animate-float`} style={{ animationDelay: `${i * 0.4}s` }}>✿</span>
          ))}
        </div>
      )}

      {/* Royal corner trim */}
      {theme.royal && (
        <div className="absolute inset-8 border border-[#D4A63A]/30 pointer-events-none rounded-2xl">
          <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-[#D4A63A]/60 rounded-tl-2xl" />
          <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-[#D4A63A]/60 rounded-tr-2xl" />
          <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-[#D4A63A]/60 rounded-bl-2xl" />
          <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-[#D4A63A]/60 rounded-br-2xl" />
        </div>
      )}

      {/* Kente pattern strip */}
      {theme.kente && (
        <div className="absolute top-0 left-0 right-0 h-3 flex pointer-events-none">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="flex-1 h-full" style={{ background: i % 3 === 0 ? "#D4A63A" : i % 3 === 1 ? "#0B8A83" : "#c0392b" }} />
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={handleOpen}
        disabled={isOpening}
        className="group text-center focus:outline-none focus-visible:ring-2 rounded-2xl p-8 z-10"
        style={{ outlineColor: theme.accent }}
        aria-label="Open invitation"
      >
        <div className="relative mx-auto w-56 h-36 mb-8" style={{ perspective: "900px" }}>
          <div
            className={`absolute inset-0 rounded-xl border-2 shadow-2xl transition-all duration-700 ${isOpening ? "scale-105 inv-envelope-glow" : ""}`}
            style={{ background: theme.bodyBg, borderColor: theme.borderColor }}
          />
          <div
            className={`absolute top-0 left-0 right-0 h-20 origin-top transition-all duration-700 ${isOpening ? "-translate-y-full opacity-0" : "group-hover:-translate-y-1"}`}
            style={{ background: theme.flapGradient, clipPath: "polygon(0 0, 50% 85%, 100% 0)", transformStyle: "preserve-3d" }}
          />
          <div
            className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 transition-all duration-500 ${isOpening ? "scale-150 opacity-0 rotate-45" : "group-hover:scale-110"}`}
          >
            <div
              className="w-14 h-14 rounded-full border-2 shadow-lg flex items-center justify-center animate-pulse"
              style={{ background: theme.sealGradient, borderColor: theme.borderColor }}
            >
              <span className="text-xl font-display" style={{ color: theme.accent === "#757575" ? "#fff" : "#F5E6B8" }}>{sealChar}</span>
            </div>
          </div>
          {isOpening && (
            <div className="absolute inset-x-4 bottom-2 top-8 rounded-lg bg-white/95 inv-fade-in flex items-center justify-center">
              <p className="text-sm font-medium" style={{ color: theme.accent }}>Opening…</p>
            </div>
          )}
        </div>

        <p className="text-white/50 text-xs uppercase tracking-[0.25em] mb-2">{theme.label}</p>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-white max-w-xs mx-auto leading-tight">
          {guestName ? `Dear ${guestName}` : eventTitle}
        </h1>
        {hostName && <p className="mt-3 text-sm" style={{ color: theme.accent }}>from {hostName}</p>}
        {!isOpening && (
          <p className="mt-8 text-white/60 text-sm group-hover:text-white transition-colors">
            {theme.label}
          </p>
        )}
        {musicEnabled && !isOpening && <p className="mt-2 text-white/30 text-xs">Music plays after opening</p>}
      </button>
    </div>
  );
}
