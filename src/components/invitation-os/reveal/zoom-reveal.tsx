"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface ZoomRevealProps {
  guestName?: string;
  eventTitle: string;
  onComplete: () => void;
}

export function ZoomReveal({ guestName, eventTitle, onComplete }: ZoomRevealProps) {
  const [zoomed, setZoomed] = useState(false);

  function handleZoom() {
    setZoomed(true);
    setTimeout(onComplete, 1100);
  }

  return (
    <div className="fixed inset-0 z-[100] safe-area-pt safe-area-pb flex items-center justify-center overflow-hidden bg-black">
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-amber-900 via-slate-900 to-black"
        animate={zoomed ? { scale: 3, opacity: 0 } : { scale: 1, opacity: 1 }}
        transition={{ duration: 1, ease: "easeInOut" }}
      />

      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        initial={{ scale: 0.3, opacity: 0 }}
        animate={zoomed ? { scale: 8, opacity: 0 } : { scale: 1, opacity: 1 }}
        transition={{ duration: 1, ease: "easeInOut" }}
      >
        <div className="w-32 h-32 rounded-full border-2 border-amber-400/60 shadow-[0_0_60px_rgba(251,191,36,0.4)]" />
      </motion.div>

      <div className="relative z-10 text-center px-8 max-w-md">
        {!zoomed ? (
          <>
            <p className="text-xs uppercase tracking-[0.4em] text-amber-300/80 mb-6">Tap to zoom in</p>
            <h1 className="font-display text-2xl sm:text-3xl text-white font-bold mb-2">{eventTitle}</h1>
            {guestName && <p className="text-slate-400 text-sm mb-10">For {guestName}</p>}
            <motion.button
              type="button"
              onClick={handleZoom}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="mx-auto w-20 h-20 rounded-full bg-amber-500/20 border border-amber-400/50 flex items-center justify-center touch-manipulation"
              aria-label="Zoom to reveal"
            >
              <span className="text-amber-300 text-2xl font-light">⊕</span>
            </motion.button>
          </>
        ) : (
          <motion.p
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-2xl font-display font-bold text-amber-200"
          >
            Welcome
          </motion.p>
        )}
      </div>
    </div>
  );
}
