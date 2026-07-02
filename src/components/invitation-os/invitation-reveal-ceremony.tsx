"use client";

import { useState, useEffect } from "react";
import { CELEVENTIC_BRAND } from "@/lib/invitation-os/brand";
import { AGI_COPY } from "@/lib/agi-engine/branding";
import { RevealConfetti } from "@/components/invitation-os/reveal/reveal-confetti";

interface InvitationRevealCeremonyProps {
  guestName?: string;
  eventTitle: string;
  hostName?: string;
  musicEnabled?: boolean;
  onRevealComplete: () => void;
  children: React.ReactNode;
}

export function InvitationRevealCeremony({
  guestName,
  eventTitle,
  hostName,
  musicEnabled,
  onRevealComplete,
  children,
}: InvitationRevealCeremonyProps) {
  const [phase, setPhase] = useState<"loading" | "envelope" | "opening" | "revealed">("loading");
  const [opened, setOpened] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("envelope"), 1000);
    return () => clearTimeout(t1);
  }, []);

  function handleOpen() {
    if (opened) return;
    setOpened(true);
    setPhase("opening");
    setTimeout(() => {
      setPhase("revealed");
      onRevealComplete();
    }, 1100);
  }

  if (phase === "revealed") {
    return <div className="inv-portal-enter">{children}</div>;
  }

  const isOpening = phase === "opening";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
      style={{ background: `linear-gradient(160deg, ${CELEVENTIC_BRAND.palette.midnight} 0%, #1a3a38 50%, ${CELEVENTIC_BRAND.palette.teal} 100%)` }}
    >
      <RevealConfetti active={isOpening} />
      {/* Ambient shimmer orbs — reel-style luxury depth */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-[#D4A63A]/10 blur-3xl animate-shimmer" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-[#0B8A83]/15 blur-3xl animate-shimmer" style={{ animationDelay: "1s" }} />
      </div>

      {phase === "loading" && (
        <div className="text-center animate-pulse z-10">
          <div className="w-16 h-16 mx-auto rounded-full border-2 border-[#D4A63A]/40 border-t-[#D4A63A] animate-spin" />
          <p className="mt-6 text-white/70 text-sm tracking-[0.3em] uppercase">Celeventic</p>
          <p className="mt-2 text-[#D4A63A] font-display text-lg">{AGI_COPY.preparing}</p>
        </div>
      )}

      {(phase === "envelope" || phase === "opening") && (
        <button
          type="button"
          onClick={handleOpen}
          disabled={isOpening}
          className="group text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A63A] rounded-2xl p-8 transition-transform z-10"
          aria-label="Open invitation"
        >
          <div className="relative mx-auto w-56 h-36 mb-8" style={{ perspective: "800px" }}>
            {/* Envelope body */}
            <div
              className={`absolute inset-0 rounded-xl border-2 border-[#D4A63A]/50 shadow-2xl transition-transform duration-700 ${
                isOpening ? "scale-105 inv-envelope-glow" : "group-hover:scale-[1.02]"
              }`}
              style={{
                background: "linear-gradient(145deg, rgba(212,166,58,0.12) 0%, rgba(11,138,131,0.08) 100%)",
              }}
            />
            {/* Back flap */}
            <div
              className={`absolute top-0 left-0 right-0 h-20 origin-top transition-all duration-700 ease-out ${
                isOpening ? "-translate-y-full opacity-0 rotate-x-12" : "group-hover:-translate-y-1"
              }`}
              style={{
                background: "linear-gradient(180deg, #D4A63A 0%, #B8860B 100%)",
                clipPath: "polygon(0 0, 50% 85%, 100% 0)",
                transformStyle: "preserve-3d",
              }}
            />
            {/* Wax seal */}
            <div
              className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 transition-all duration-500 ${
                isOpening ? "scale-150 opacity-0" : "group-hover:scale-110"
              }`}
            >
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#C9A227] to-[#8B6914] border-2 border-[#F5E6B8]/50 shadow-lg flex items-center justify-center">
                <span className="text-[#F5E6B8] text-xl font-display">✦</span>
              </div>
            </div>
            {/* Inner card peek on open */}
            {isOpening && (
              <div className="absolute inset-x-4 bottom-2 top-8 rounded-lg bg-white/95 inv-fade-in flex items-center justify-center shadow-inner">
                <p className="text-[#0B8A83] text-sm font-medium tracking-wide">Opening…</p>
              </div>
            )}
          </div>

          <p className="text-white/50 text-xs uppercase tracking-[0.25em] mb-2">You&apos;re invited</p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white max-w-xs mx-auto leading-tight">
            {guestName ? `Dear ${guestName}` : eventTitle}
          </h1>
          {hostName && <p className="mt-3 text-[#D4A63A]/90 text-sm">from {hostName}</p>}
          {!isOpening && (
            <p className="mt-8 text-white/60 text-sm group-hover:text-[#D4A63A] transition-colors animate-pulse">
              Tap to break the seal & open
            </p>
          )}
          {musicEnabled && !isOpening && (
            <p className="mt-2 text-white/30 text-xs">Music plays after opening</p>
          )}
        </button>
      )}
    </div>
  );
}
