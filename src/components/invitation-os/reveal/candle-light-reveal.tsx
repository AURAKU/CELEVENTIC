"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { RevealKeyboardFallback } from "@/components/experience/reveal-accessibility";

interface CandleLightRevealProps {
  guestName?: string;
  eventTitle: string;
  hostName?: string;
  onComplete: () => void;
}

/**
 * Memorial ceremony — soft dark field, unlit candle, tap/keyboard to light.
 * Reduced-motion callers should use ReducedMotionGate instead of this component.
 */
export function CandleLightReveal({
  guestName,
  eventTitle,
  hostName,
  onComplete,
}: CandleLightRevealProps) {
  const [lit, setLit] = useState(false);

  function light() {
    if (lit) return;
    setLit(true);
    setTimeout(onComplete, 1400);
  }

  return (
    <div className="fixed inset-0 z-[100] safe-area-pt safe-area-pb flex items-center justify-center bg-gradient-to-b from-stone-950 via-stone-900 to-black overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-1000"
        style={{
          opacity: lit ? 1 : 0.15,
          background:
            "radial-gradient(ellipse at 50% 62%, rgba(251,191,36,0.28) 0%, transparent 55%)",
        }}
      />

      <div className="relative z-10 text-center px-8 max-w-md">
        <p className="text-xs uppercase tracking-[0.4em] text-amber-200/50 mb-10">
          In loving memory
        </p>

        <button
          type="button"
          onClick={light}
          disabled={lit}
          aria-label={lit ? "Candle is lit" : "Tap to light the candle"}
          className="relative mx-auto mb-10 block h-44 w-24 touch-manipulation focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-400/60 disabled:pointer-events-none"
        >
          {/* Flame */}
          <motion.div
            className="absolute left-1/2 top-2 -translate-x-1/2 origin-bottom"
            initial={{ opacity: 0, scaleY: 0.2, scaleX: 0.6 }}
            animate={
              lit
                ? { opacity: 1, scaleY: [1, 1.08, 0.96, 1], scaleX: [1, 0.92, 1.05, 1] }
                : { opacity: 0, scaleY: 0.2, scaleX: 0.6 }
            }
            transition={
              lit
                ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" }
                : { duration: 0.4 }
            }
          >
            <div
              className="h-14 w-8 rounded-[50%] blur-[1px]"
              style={{
                background:
                  "radial-gradient(ellipse at 50% 70%, #FEF3C7 0%, #F59E0B 45%, #B45309 100%)",
              }}
            />
          </motion.div>

          {/* Wick */}
          <div className="absolute left-1/2 top-[3.6rem] h-3 w-0.5 -translate-x-1/2 bg-stone-600" />

          {/* Candle body */}
          <div
            className="absolute bottom-0 left-1/2 h-28 w-12 -translate-x-1/2 rounded-sm border border-stone-500/40"
            style={{
              background:
                "linear-gradient(90deg, #e7e5e4 0%, #fafaf9 45%, #d6d3d1 100%)",
              boxShadow: lit
                ? "0 0 40px rgba(251,191,36,0.35)"
                : "0 8px 24px rgba(0,0,0,0.45)",
            }}
          />
        </button>

        <motion.div animate={{ opacity: lit ? 1 : 0.55 }}>
          <h1 className="font-display text-2xl text-stone-100 font-semibold leading-tight">
            {eventTitle}
          </h1>
          {guestName && (
            <p className="text-stone-400 text-sm mt-2">Remembering with {guestName}</p>
          )}
          {hostName && (
            <p className="text-amber-200/40 text-xs mt-3">Hosted by {hostName}</p>
          )}
          {!lit && (
            <p className="text-stone-500 text-xs mt-8 tracking-wide">
              Tap the candle to light · Enter or Space
            </p>
          )}
          {lit && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-amber-200/70 text-sm mt-8"
            >
              Light carries the memory forward…
            </motion.p>
          )}
        </motion.div>
      </div>

      <RevealKeyboardFallback onComplete={light} />
    </div>
  );
}
