"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { RevealKeyboardFallback } from "@/components/experience/reveal-accessibility";

interface FlowerBloomRevealProps {
  guestName?: string;
  eventTitle: string;
  onComplete: () => void;
}

/**
 * Botanical Bloom — tap flower or swipe petals outward to open.
 */
export function FlowerBloomReveal({ guestName, eventTitle, onComplete }: FlowerBloomRevealProps) {
  const [bloomed, setBloomed] = useState(false);
  const [dragY, setDragY] = useState(0);

  function bloom() {
    if (bloomed) return;
    setBloomed(true);
    setTimeout(onComplete, 1200);
  }

  function handleDragEnd(_: unknown, info: { offset: { y: number; x: number } }) {
    const distance = Math.hypot(info.offset.x, info.offset.y);
    if (distance > 70 || info.offset.y < -60) {
      bloom();
    } else {
      setDragY(0);
    }
  }

  const petals = 8;
  const petalSpread = bloomed ? 1.35 : 1 + Math.min(0.25, Math.abs(dragY) / 280);

  return (
    <div className="fixed inset-0 z-[100] safe-area-pt safe-area-pb flex items-center justify-center bg-gradient-to-b from-emerald-50 via-rose-50 to-white overflow-hidden">
      {/* Soft floating leaf parallax hints */}
      {[...Array(6)].map((_, i) => (
        <motion.span
          key={i}
          className="pointer-events-none absolute text-emerald-300/40 text-2xl"
          style={{ left: `${8 + i * 15}%`, top: `${12 + (i % 3) * 22}%` }}
          animate={{ y: [0, -10, 0], rotate: [0, 8, -6, 0] }}
          transition={{ duration: 5 + i * 0.4, repeat: Infinity, ease: "easeInOut" }}
        >
          ✿
        </motion.span>
      ))}

      <div className="relative z-10 text-center px-8 max-w-md">
        <motion.div
          className="relative mx-auto w-40 h-40 mb-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-rose-400 rounded-full touch-manipulation"
          onClick={!bloomed ? bloom : undefined}
          drag={!bloomed}
          dragConstraints={{ left: -40, right: 40, top: -80, bottom: 40 }}
          dragElastic={0.15}
          onDrag={(_, info) => setDragY(info.offset.y)}
          onDragEnd={handleDragEnd}
          role="button"
          tabIndex={bloomed ? -1 : 0}
          aria-label="Tap the flower or swipe petals to bloom"
          onKeyDown={(e) => {
            if (!bloomed && (e.key === "Enter" || e.key === " ")) {
              e.preventDefault();
              bloom();
            }
          }}
        >
          {[...Array(petals)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute top-1/2 left-1/2 w-8 h-16 -ml-4 -mt-8 rounded-full origin-bottom"
              style={{
                background: `linear-gradient(to top, #be185d, #fda4af)`,
                rotate: `${i * (360 / petals)}deg`,
              }}
              animate={
                bloomed
                  ? { scaleY: 1.35, scaleX: 1.1, opacity: 1, y: -6 }
                  : { scaleY: 0.35 * petalSpread, opacity: 0.75, y: 0 }
              }
              transition={{ duration: 0.8, delay: bloomed ? i * 0.05 : 0 }}
            />
          ))}
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-amber-400 shadow-md shadow-amber-300/50"
            animate={bloomed ? { scale: 1.25 } : { scale: 0.85 + Math.abs(dragY) / 400 }}
          />
        </motion.div>

        <motion.div animate={{ opacity: bloomed ? 1 : 0.55 }}>
          <h1 className="font-display text-2xl text-rose-900 font-bold">{eventTitle}</h1>
          {guestName && <p className="text-rose-400 text-sm mt-2">For {guestName}</p>}
          {!bloomed && (
            <p className="text-stone-400 text-xs mt-6">Tap the flower · swipe petals · Enter</p>
          )}
        </motion.div>
      </div>

      <RevealKeyboardFallback onComplete={bloom} />
    </div>
  );
}
