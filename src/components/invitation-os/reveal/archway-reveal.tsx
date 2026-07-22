"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { RevealConfetti } from "@/components/invitation-os/reveal/reveal-confetti";

interface ArchwayRevealProps {
  guestName?: string;
  eventTitle: string;
  hostName?: string;
  onComplete: () => void;
}

export function ArchwayReveal({ guestName, eventTitle, hostName, onComplete }: ArchwayRevealProps) {
  const [opened, setOpened] = useState(false);

  function open() {
    if (opened) return;
    setOpened(true);
    setTimeout(onComplete, 1400);
  }

  return (
    <div className="fixed inset-0 z-[100] safe-area-pt safe-area-pb flex items-center justify-center bg-gradient-to-b from-emerald-950 via-emerald-900 to-[#0a1f14] overflow-hidden">
      {opened && <RevealConfetti active />}
      <div className="absolute inset-0 pointer-events-none opacity-40 bg-[radial-gradient(ellipse_at_top,rgba(212,175,55,0.25),transparent_50%)]" />

      <div className="relative z-10 text-center px-8 max-w-lg w-full">
        <p className="text-xs uppercase tracking-[0.4em] text-amber-300/70 mb-6">Palace gates</p>
        <h1 className="font-display text-xl sm:text-2xl text-amber-50 font-bold mb-2">{eventTitle}</h1>
        {guestName && <p className="text-emerald-100/55 text-sm mb-2">Dear {guestName}</p>}
        {hostName && <p className="text-amber-200/50 text-xs mb-8">Hosted by {hostName}</p>}

        <button
          type="button"
          onClick={open}
          disabled={opened}
          className="relative mx-auto touch-manipulation block w-full max-w-sm"
          aria-label="Open the archway gates"
        >
          <div className="relative h-56 mx-auto">
            <div className="absolute inset-x-8 top-0 bottom-8 rounded-t-full border-4 border-amber-500/45 bg-emerald-950/60" />
            <motion.div
              className="absolute left-8 top-10 bottom-8 w-[42%] origin-right bg-gradient-to-r from-emerald-900 to-emerald-800 border border-amber-400/40"
              animate={opened ? { rotateY: -78, opacity: 0.35 } : {}}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              style={{ transformStyle: "preserve-3d" }}
            />
            <motion.div
              className="absolute right-8 top-10 bottom-8 w-[42%] origin-left bg-gradient-to-l from-emerald-900 to-emerald-800 border border-amber-400/40"
              animate={opened ? { rotateY: 78, opacity: 0.35 } : {}}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              style={{ transformStyle: "preserve-3d" }}
            />
            {!opened && (
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-amber-300/90 text-sm tracking-wide">
                Enter
              </span>
            )}
          </div>
          {!opened && <p className="mt-2 text-amber-200/75 text-sm">Tap to open the gates</p>}
        </button>
      </div>
    </div>
  );
}
