"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface LetterUnfoldRevealProps {
  guestName?: string;
  eventTitle: string;
  hostName?: string;
  onComplete: () => void;
}

export function LetterUnfoldReveal({ guestName, eventTitle, hostName, onComplete }: LetterUnfoldRevealProps) {
  const [unfolded, setUnfolded] = useState(false);

  function unfold() {
    setUnfolded(true);
    setTimeout(onComplete, 1100);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gradient-to-b from-amber-50 to-stone-200 overflow-hidden">
      <div className="relative z-10 text-center px-8 max-w-md">
        <p className="text-xs uppercase tracking-[0.4em] text-stone-500 mb-8">A letter for you</p>

        <motion.div
          onClick={!unfolded ? unfold : undefined}
          className="mx-auto bg-amber-50 border border-stone-300 shadow-2xl cursor-pointer touch-manipulation"
          style={{ width: 280, originY: "top" }}
          animate={unfolded ? { scaleY: 1.4, y: -20 } : { scaleY: 0.15, y: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="p-8 min-h-[200px] flex flex-col items-center justify-center">
            {unfolded ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                <h1 className="font-[family-name:var(--font-cormorant)] text-2xl text-stone-800 italic mb-2">{eventTitle}</h1>
                {guestName && <p className="text-stone-500 text-sm">Dear {guestName}</p>}
                {hostName && <p className="text-stone-400 text-xs mt-4">From {hostName}</p>}
              </motion.div>
            ) : (
              <p className="text-stone-400 text-sm">Tap to unfold</p>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
