"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { RevealConfetti } from "@/components/invitation-os/reveal/reveal-confetti";

interface SatinBowRevealProps {
  guestName?: string;
  eventTitle: string;
  onComplete: () => void;
}

export function SatinBowReveal({ guestName, eventTitle, onComplete }: SatinBowRevealProps) {
  const [opened, setOpened] = useState(false);

  function open() {
    if (opened) return;
    setOpened(true);
    setTimeout(onComplete, 1100);
  }

  return (
    <div className="fixed inset-0 z-[100] safe-area-pt safe-area-pb flex items-center justify-center bg-gradient-to-b from-[#fff5f7] via-[#fce4ec] to-[#f8bbd0] overflow-hidden">
      {opened && <RevealConfetti active />}

      <div className="relative z-10 text-center px-8 max-w-md">
        <p className="text-xs uppercase tracking-[0.4em] text-rose-400/80 mb-6">Tied with love</p>
        <h1 className="font-display text-xl sm:text-2xl text-rose-950 font-bold mb-2">{eventTitle}</h1>
        {guestName && <p className="text-rose-700/60 text-sm mb-10">For {guestName}</p>}

        <button
          type="button"
          onClick={open}
          disabled={opened}
          className="relative mx-auto touch-manipulation block"
          aria-label="Untie the satin bow"
        >
          <div className="relative w-48 h-36 mx-auto">
            <div className="absolute inset-x-6 top-10 bottom-6 rounded-sm bg-gradient-to-b from-stone-50 to-stone-100 border border-rose-200/60 shadow-md" />
            <motion.div
              className="absolute left-1/2 top-4 -translate-x-1/2 w-3 h-28 bg-gradient-to-b from-rose-400 to-rose-700 rounded-full shadow"
              animate={opened ? { scaleY: 0.2, opacity: 0.3, y: 40 } : {}}
              transition={{ duration: 0.6 }}
            />
            <motion.div
              className="absolute left-1/2 top-12 -translate-x-1/2 w-28 h-14"
              animate={opened ? { scale: 1.4, opacity: 0, rotate: -12 } : {}}
              transition={{ duration: 0.7 }}
            >
              <div className="absolute left-0 top-2 w-14 h-10 bg-gradient-to-br from-rose-300 to-rose-600 [clip-path:polygon(100%_50%,0_0,0_100%)] shadow" />
              <div className="absolute right-0 top-2 w-14 h-10 bg-gradient-to-bl from-rose-300 to-rose-600 [clip-path:polygon(0_50%,100%_0,100%_100%)] shadow" />
              <div className="absolute left-1/2 top-3 -translate-x-1/2 w-7 h-7 rounded-full bg-gradient-to-br from-rose-200 to-rose-500 border border-rose-100/80 shadow-inner" />
            </motion.div>
          </div>
          {!opened && <p className="mt-4 text-rose-600/80 text-sm">Tap to untie the bow</p>}
        </button>
      </div>
    </div>
  );
}
