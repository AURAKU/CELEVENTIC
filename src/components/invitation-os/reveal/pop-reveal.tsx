"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RevealConfetti } from "@/components/invitation-os/reveal/reveal-confetti";

interface PopRevealProps {
  guestName?: string;
  eventTitle: string;
  onComplete: () => void;
}

export function PopReveal({ guestName, eventTitle, onComplete }: PopRevealProps) {
  const [popped, setPopped] = useState(false);

  function handlePop() {
    setPopped(true);
    setTimeout(onComplete, 900);
  }

  return (
    <div className="fixed inset-0 z-[100] safe-area-pt safe-area-pb flex items-center justify-center bg-gradient-to-br from-rose-100 via-amber-50 to-teal-50 overflow-hidden">
      <AnimatePresence>
        {popped && <RevealConfetti active />}
      </AnimatePresence>

      <div className="relative z-10 text-center px-8 max-w-md">
        <p className="text-xs uppercase tracking-[0.4em] text-rose-400 mb-6">Tap to pop</p>
        <h1 className="font-display text-2xl sm:text-3xl text-slate-800 font-bold mb-2">{eventTitle}</h1>
        {guestName && <p className="text-slate-500 text-sm mb-10">For {guestName}</p>}

        {!popped ? (
          <motion.button
            type="button"
            onClick={handlePop}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.85 }}
            className="mx-auto w-28 h-28 rounded-full bg-gradient-to-br from-rose-400 via-fuchsia-400 to-amber-300 shadow-xl shadow-rose-300/50 flex items-center justify-center touch-manipulation"
            aria-label="Pop to reveal"
          >
            <span className="text-white font-bold text-lg">POP!</span>
          </motion.button>
        ) : (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="text-2xl font-display font-bold text-rose-600"
          >
            You&apos;re invited!
          </motion.div>
        )}
      </div>
    </div>
  );
}
