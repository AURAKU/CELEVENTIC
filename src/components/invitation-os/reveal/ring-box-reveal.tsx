"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { RevealConfetti } from "@/components/invitation-os/reveal/reveal-confetti";

interface RingBoxRevealProps {
  guestName?: string;
  eventTitle: string;
  onComplete: () => void;
}

export function RingBoxReveal({ guestName, eventTitle, onComplete }: RingBoxRevealProps) {
  const [opened, setOpened] = useState(false);

  function open() {
    if (opened) return;
    setOpened(true);
    setTimeout(onComplete, 1300);
  }

  return (
    <div className="fixed inset-0 z-[100] safe-area-pt safe-area-pb flex items-center justify-center bg-gradient-to-b from-neutral-950 via-black to-neutral-900 overflow-hidden">
      {opened && <RevealConfetti active />}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(212,166,58,0.18),transparent_55%)]" />

      <div className="relative z-10 text-center px-8 max-w-md">
        <p className="text-xs uppercase tracking-[0.4em] text-amber-400/70 mb-6">Black tie vows</p>
        <h1 className="font-display text-xl sm:text-2xl text-amber-50 font-bold mb-2">{eventTitle}</h1>
        {guestName && <p className="text-amber-200/50 text-sm mb-10">For {guestName}</p>}

        <button
          type="button"
          onClick={open}
          disabled={opened}
          className="relative mx-auto touch-manipulation block perspective-[800px]"
          aria-label="Open the ring box"
        >
          <div className="relative w-40 h-32 mx-auto" style={{ perspective: 800 }}>
            <div className="absolute inset-x-2 bottom-0 h-16 rounded-b-md bg-gradient-to-b from-neutral-800 to-neutral-950 border border-amber-500/40 shadow-2xl flex items-center justify-center">
              <motion.div
                className="w-10 h-10 rounded-full border-2 border-amber-400/80 shadow-[0_0_20px_rgba(212,166,58,0.45)]"
                animate={opened ? { scale: [1, 1.15, 1], opacity: 1 } : { opacity: 0.85 }}
                transition={{ duration: 0.8 }}
              />
            </div>
            <motion.div
              className="absolute inset-x-2 top-0 h-16 origin-bottom rounded-t-md bg-gradient-to-b from-neutral-700 to-neutral-900 border border-amber-500/35"
              animate={opened ? { rotateX: -110 } : { rotateX: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              style={{ transformStyle: "preserve-3d" }}
            >
              <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-0.5 bg-amber-500/50" />
            </motion.div>
          </div>
          {!opened && <p className="mt-5 text-amber-300/80 text-sm">Tap to open the ring box</p>}
        </button>
      </div>
    </div>
  );
}
