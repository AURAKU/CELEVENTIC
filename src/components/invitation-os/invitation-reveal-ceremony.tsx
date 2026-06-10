"use client";

import { useState, useEffect } from "react";
import { CELEVENTIC_BRAND } from "@/lib/invitation-os/brand";
import { AGI_COPY } from "@/lib/agi-engine/branding";
import { AgiFooter } from "@/components/agi-engine/agi-badge";

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
  const [phase, setPhase] = useState<"loading" | "envelope" | "revealed">("loading");
  const [opened, setOpened] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("envelope"), 1200);
    return () => clearTimeout(t1);
  }, []);

  function handleOpen() {
    setOpened(true);
    setPhase("revealed");
    onRevealComplete();
  }

  if (phase === "revealed") {
    return <>{children}</>;
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: `linear-gradient(160deg, ${CELEVENTIC_BRAND.palette.midnight} 0%, #1a3a38 50%, ${CELEVENTIC_BRAND.palette.teal} 100%)` }}
    >
      {phase === "loading" && (
        <div className="text-center animate-pulse">
          <div className="w-16 h-16 mx-auto rounded-full border-2 border-[#D4A63A]/40 border-t-[#D4A63A] animate-spin" />
          <p className="mt-6 text-white/70 text-sm tracking-[0.3em] uppercase">Celeventic</p>
          <p className="mt-2 text-[#D4A63A] font-display text-lg">{AGI_COPY.preparing}</p>
        </div>
      )}

      {phase === "envelope" && !opened && (
        <button
          type="button"
          onClick={handleOpen}
          className="group text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A63A] rounded-2xl p-8 transition-transform hover:scale-[1.02] active:scale-[0.98]"
          aria-label="Open invitation"
        >
          <div className="relative mx-auto w-48 h-32 mb-8">
            <div className="absolute inset-0 bg-[#D4A63A]/20 rounded-lg transform group-hover:scale-105 transition-transform duration-500" />
            <div
              className="absolute inset-0 border-2 border-[#D4A63A]/60 rounded-lg"
              style={{
                background: "linear-gradient(135deg, rgba(212,166,58,0.15) 0%, rgba(11,138,131,0.1) 100%)",
              }}
            />
            <div
              className="absolute top-0 left-0 right-0 h-16 origin-top transition-transform duration-700 group-hover:-translate-y-2"
              style={{
                background: "linear-gradient(180deg, #D4A63A 0%, #B8860B 100%)",
                clipPath: "polygon(0 0, 50% 70%, 100% 0)",
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center pt-4">
              <span className="text-[#D4A63A] text-3xl">✦</span>
            </div>
          </div>

          <p className="text-white/50 text-xs uppercase tracking-[0.25em] mb-2">You&apos;re invited</p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white max-w-xs mx-auto leading-tight">
            {guestName ? `Dear ${guestName}` : eventTitle}
          </h1>
          {hostName && (
            <p className="mt-3 text-[#D4A63A]/90 text-sm">from {hostName}</p>
          )}
          <p className="mt-8 text-white/60 text-sm group-hover:text-[#D4A63A] transition-colors">
            Tap to open your invitation
          </p>
          {musicEnabled && (
            <p className="mt-2 text-white/30 text-xs">Ambient music will play after opening</p>
          )}
          <div className="mt-10"><AgiFooter /></div>
        </button>
      )}
    </div>
  );
}
