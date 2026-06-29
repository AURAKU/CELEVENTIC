"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface LightBeamRevealProps {
  guestName?: string;
  eventTitle: string;
  onComplete: () => void;
}

export function LightBeamReveal({ guestName, eventTitle, onComplete }: LightBeamRevealProps) {
  const [revealed, setRevealed] = useState(false);

  function reveal() {
    setRevealed(true);
    setTimeout(onComplete, 1000);
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
      style={{ background: "radial-gradient(circle at 50% 30%, #1a1a2e 0%, #000 70%)" }}
      onClick={!revealed ? reveal : undefined}
    >
      <motion.div
        className="absolute inset-0 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: revealed ? 1 : 0.3 }}
        transition={{ duration: 1.2 }}
        style={{
          background: `conic-gradient(from 0deg at 50% 40%, transparent 0deg, rgba(212,175,55,0.15) 30deg, transparent 60deg, rgba(212,175,55,0.1) 90deg, transparent 120deg)`,
        }}
      />

      <motion.div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-full pointer-events-none"
        initial={{ opacity: 0, scaleY: 0 }}
        animate={{ opacity: revealed ? 0.8 : 0.2, scaleY: revealed ? 1 : 0.3 }}
        transition={{ duration: 1 }}
        style={{
          background: "linear-gradient(180deg, rgba(255,248,220,0.6) 0%, rgba(212,175,55,0.2) 40%, transparent 100%)",
          filter: "blur(20px)",
        }}
      />

      <div className="relative z-10 text-center px-8 max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: revealed ? 1 : 0.6, y: revealed ? 0 : 20 }}
          transition={{ duration: 0.8 }}
        >
          <p className="text-xs uppercase tracking-[0.5em] text-amber-300/70 mb-6">
            {revealed ? "Presenting" : "Tap for spotlight"}
          </p>
          <h1 className="font-display text-2xl sm:text-4xl text-amber-50 font-bold tracking-wide">
            {eventTitle}
          </h1>
          {guestName && <p className="text-amber-200/60 text-sm mt-4">For {guestName}</p>}
        </motion.div>
      </div>
    </div>
  );
}
