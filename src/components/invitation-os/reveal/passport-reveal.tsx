"use client";

import { useState } from "react";
import { BookOpen } from "lucide-react";
import { CELEVENTIC_BRAND } from "@/lib/invitation-os/brand";
import { AGI_COPY } from "@/lib/agi-engine/branding";

interface PassportRevealProps {
  guestName?: string;
  eventTitle: string;
  hostName?: string;
  onComplete: () => void;
}

export function PassportReveal({ guestName, eventTitle, hostName, onComplete }: PassportRevealProps) {
  const [open, setOpen] = useState(false);

  function handleOpen() {
    setOpen(true);
    setTimeout(onComplete, 900);
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-6"
      style={{ background: `linear-gradient(165deg, ${CELEVENTIC_BRAND.palette.midnight} 0%, #1a2f2e 100%)` }}
    >
      <button
        type="button"
        onClick={handleOpen}
        disabled={open}
        className="relative w-full max-w-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A63A] rounded-2xl"
        aria-label="Open passport invitation"
      >
        <div
          className={`relative transition-transform duration-700 ease-out ${open ? "scale-105" : "hover:scale-[1.02]"}`}
          style={{ perspective: "1200px" }}
        >
          <div
            className="rounded-2xl border-2 border-[#D4A63A]/50 shadow-2xl overflow-hidden"
            style={{
              background: "linear-gradient(145deg, #0B3D3A 0%, #062A28 100%)",
              transform: open ? "rotateY(-8deg)" : "rotateY(0deg)",
              transition: "transform 0.9s ease",
            }}
          >
            <div className="px-8 py-10 text-center space-y-6">
              <div className="flex justify-center">
                <div className="h-14 w-14 rounded-full border-2 border-[#D4A63A]/60 flex items-center justify-center bg-[#D4A63A]/10">
                  <BookOpen className="h-7 w-7 text-[#D4A63A]" />
                </div>
              </div>
              <div>
                <p className="text-[10px] tracking-[0.4em] uppercase text-[#D4A63A]/80 mb-2">Official Invitation</p>
                <h2 className="font-display text-xl text-white leading-snug">{eventTitle}</h2>
                {hostName && <p className="text-white/50 text-sm mt-2">{hostName}</p>}
              </div>
              {guestName && (
                <p className="text-xs tracking-widest uppercase text-[#D4A63A]/70">Issued to {guestName}</p>
              )}
              <div className="h-1 w-24 mx-auto bg-gradient-to-r from-transparent via-[#D4A63A] to-transparent" />
              <p className="text-white/40 text-xs">{open ? AGI_COPY.preparing : "Tap to open passport"}</p>
            </div>
            <div className="h-2 bg-gradient-to-r from-[#D4A63A] via-[#F5E6B8] to-[#D4A63A]" />
          </div>
        </div>
      </button>
    </div>
  );
}
