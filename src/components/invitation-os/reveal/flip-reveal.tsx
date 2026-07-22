"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface FlipRevealProps {
  guestName?: string;
  eventTitle: string;
  onComplete: () => void;
}

export function FlipReveal({ guestName, eventTitle, onComplete }: FlipRevealProps) {
  const [flipped, setFlipped] = useState(false);

  function handleFlip() {
    setFlipped(true);
    setTimeout(onComplete, 900);
  }

  return (
    <div className="fixed inset-0 z-[100] safe-area-pt safe-area-pb flex items-center justify-center bg-gradient-to-br from-slate-900 via-sky-950 to-black overflow-hidden">
      <div className="relative z-10 text-center px-8 max-w-md">
        <p className="text-xs uppercase tracking-[0.4em] text-sky-300/80 mb-8">Tap to flip</p>

        <div className="mx-auto mb-8" style={{ perspective: 1000 }}>
          <motion.button
            type="button"
            onClick={handleFlip}
            disabled={flipped}
            animate={{ rotateY: flipped ? 180 : 0 }}
            transition={{ duration: 0.7, ease: "easeInOut" }}
            style={{ transformStyle: "preserve-3d" }}
            className="relative w-56 h-72 rounded-2xl touch-manipulation disabled:pointer-events-none"
            aria-label="Flip to reveal"
          >
            <div
              className="absolute inset-0 rounded-2xl bg-gradient-to-br from-sky-400 via-indigo-500 to-violet-600 shadow-2xl shadow-sky-500/30 flex flex-col items-center justify-center p-6"
              style={{ backfaceVisibility: "hidden" }}
            >
              <span className="text-4xl mb-4">↻</span>
              <p className="text-white/90 text-sm font-medium">Tap to flip the card</p>
            </div>
            <div
              className="absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-200 via-amber-100 to-white shadow-2xl flex flex-col items-center justify-center p-6"
              style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
            >
              <p className="text-xs uppercase tracking-widest text-amber-700 mb-2">You&apos;re invited</p>
              <h2 className="font-display text-xl font-bold text-slate-900">{eventTitle}</h2>
              {guestName && <p className="text-slate-600 text-sm mt-2">Dear {guestName}</p>}
            </div>
          </motion.button>
        </div>

        {!flipped && (
          <>
            <h1 className="font-display text-2xl text-white font-bold mb-1">{eventTitle}</h1>
            {guestName && <p className="text-slate-400 text-sm">For {guestName}</p>}
          </>
        )}
      </div>
    </div>
  );
}
