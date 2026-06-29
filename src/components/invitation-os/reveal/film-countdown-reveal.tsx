"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface FilmCountdownRevealProps {
  guestName?: string;
  eventTitle: string;
  onComplete: () => void;
}

export function FilmCountdownReveal({ guestName, eventTitle, onComplete }: FilmCountdownRevealProps) {
  const [count, setCount] = useState(3);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (count <= 0) {
      setDone(true);
      setTimeout(onComplete, 800);
      return;
    }
    const t = setTimeout(() => setCount((c) => c - 1), 900);
    return () => clearTimeout(t);
  }, [count, onComplete]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black overflow-hidden">
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)" }} />

      <div className="relative z-10 text-center px-8">
        <AnimatePresence mode="wait">
          {!done && count > 0 ? (
            <motion.div
              key={count}
              initial={{ scale: 2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="font-mono text-8xl sm:text-9xl font-bold text-white"
            >
              {count}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              <p className="text-xs uppercase tracking-[0.5em] text-teal-400">Now showing</p>
              <h1 className="font-display text-2xl sm:text-3xl text-white font-bold">{eventTitle}</h1>
              {guestName && <p className="text-white/50 text-sm">For {guestName}</p>}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
