"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface FlowerBloomRevealProps {
  guestName?: string;
  eventTitle: string;
  onComplete: () => void;
}

export function FlowerBloomReveal({ guestName, eventTitle, onComplete }: FlowerBloomRevealProps) {
  const [bloomed, setBloomed] = useState(false);

  function bloom() {
    setBloomed(true);
    setTimeout(onComplete, 1200);
  }

  const petals = 8;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gradient-to-b from-emerald-50 via-rose-50 to-white overflow-hidden">
      <div className="relative z-10 text-center px-8 max-w-md">
        <div className="relative mx-auto w-40 h-40 mb-10" onClick={!bloomed ? bloom : undefined}>
          {[...Array(petals)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute top-1/2 left-1/2 w-8 h-16 -ml-4 -mt-8 rounded-full origin-bottom"
              style={{
                background: `linear-gradient(to top, #be185d, #fda4af)`,
                rotate: `${i * (360 / petals)}deg`,
              }}
              animate={bloomed ? { scaleY: 1.2, opacity: 1 } : { scaleY: 0.3, opacity: 0.7 }}
              transition={{ duration: 0.8, delay: bloomed ? i * 0.05 : 0 }}
            />
          ))}
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-amber-400"
            animate={bloomed ? { scale: 1.2 } : { scale: 0.8 }}
          />
        </div>

        <motion.div animate={{ opacity: bloomed ? 1 : 0.5 }}>
          <h1 className="font-display text-2xl text-rose-900 font-bold">{eventTitle}</h1>
          {guestName && <p className="text-rose-400 text-sm mt-2">For {guestName}</p>}
          {!bloomed && <p className="text-stone-400 text-xs mt-6">Tap the flower to bloom</p>}
        </motion.div>
      </div>
    </div>
  );
}
