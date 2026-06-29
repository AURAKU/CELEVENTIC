"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

interface SwipeRevealProps {
  guestName?: string;
  eventTitle: string;
  onComplete: () => void;
}

export function SwipeReveal({ guestName, eventTitle, onComplete }: SwipeRevealProps) {
  const [swiped, setSwiped] = useState(false);
  const [dragX, setDragX] = useState(0);

  function handleDragEnd(_: unknown, info: { offset: { x: number } }) {
    if (info.offset.x > 120) {
      setSwiped(true);
      setTimeout(onComplete, 600);
    } else {
      setDragX(0);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-black overflow-hidden">
      <div className="absolute inset-0 opacity-30">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute h-1 w-1 rounded-full bg-white"
            style={{ left: `${(i * 17) % 100}%`, top: `${(i * 23) % 100}%` }}
            animate={{ opacity: [0.2, 0.8, 0.2] }}
            transition={{ duration: 2 + i * 0.2, repeat: Infinity }}
          />
        ))}
      </div>

      <div className="relative z-10 text-center px-8 max-w-md">
        <Sparkles className="h-8 w-8 mx-auto text-cyan-300 mb-6 opacity-80" />
        <p className="text-xs uppercase tracking-[0.4em] text-cyan-200/70 mb-4">Swipe to reveal</p>
        <h1 className="font-display text-2xl sm:text-3xl text-white font-bold mb-2">{eventTitle}</h1>
        {guestName && <p className="text-white/60 text-sm mb-10">For {guestName}</p>}

        {!swiped && (
          <motion.div
            drag="x"
            dragConstraints={{ left: 0, right: 200 }}
            dragElastic={0.1}
            onDrag={(_, info) => setDragX(info.offset.x)}
            onDragEnd={handleDragEnd}
            style={{ x: dragX }}
            className="mx-auto w-48 h-14 rounded-full bg-gradient-to-r from-cyan-500 to-teal-400 flex items-center justify-center cursor-grab active:cursor-grabbing shadow-lg shadow-cyan-500/30 touch-manipulation"
          >
            <span className="text-white font-semibold text-sm tracking-wide">Swipe →</span>
          </motion.div>
        )}

        {swiped && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-cyan-200 text-lg"
          >
            Welcome…
          </motion.p>
        )}
      </div>
    </div>
  );
}
