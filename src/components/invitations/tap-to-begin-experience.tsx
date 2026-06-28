"use client";

import { motion } from "framer-motion";
import { CELEVENTIC_PALETTE } from "@/lib/experience/celeventic-palette";
import { BRAND_MOTTO } from "@/lib/constants";

interface TapToBeginExperienceProps {
  onBegin: () => void;
  eventTitle?: string;
  accentColor?: string;
}

export function TapToBeginExperience({ onBegin, eventTitle, accentColor }: TapToBeginExperienceProps) {
  const accent = accentColor ?? CELEVENTIC_PALETTE.teal;
  return (
    <motion.button
      type="button"
      onClick={onBegin}
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center cursor-pointer touch-manipulation celeventic-tap-begin celeventic-intro-future"
      style={{ background: `linear-gradient(165deg, ${CELEVENTIC_PALETTE.navy} 0%, #061a18 40%, ${accent}33 100%)` }}
      aria-label="Tap to begin experience"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      <div className="absolute inset-0 celeventic-intro-grid opacity-25 pointer-events-none" />
      <div className="absolute inset-0 celeventic-intro-scanlines pointer-events-none" />

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 24 }).map((_, i) => (
          <span
            key={i}
            className="celeventic-intro-particle absolute rounded-full"
            style={{
              left: `${(i * 17) % 100}%`,
              top: `${(i * 23) % 100}%`,
              width: 4 + (i % 3) * 2,
              height: 4 + (i % 3) * 2,
              background: i % 3 === 0 ? CELEVENTIC_PALETTE.gold : i % 3 === 1 ? CELEVENTIC_PALETTE.coral : accent,
              animationDelay: `${i * 0.15}s`,
            }}
          />
        ))}
      </div>

      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 flex flex-col items-center px-8 text-center max-w-sm"
      >
        <div className="celeventic-intro-hud mb-8 px-6 py-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md w-full max-w-xs">
          <p className="text-[10px] uppercase tracking-[0.4em] text-white/45 font-medium mb-2">
            Celeventic Experience Engine
          </p>
          <p className="text-[10px] uppercase tracking-[0.3em] text-white/60">{BRAND_MOTTO}</p>
        </div>

        {eventTitle && (
          <p className="text-white/60 text-sm font-medium tracking-wide mb-4 line-clamp-2">{eventTitle}</p>
        )}

        <p className="text-white font-display text-xl sm:text-2xl font-semibold tracking-tight mb-2">
          Tap to Begin Experience
        </p>
        <p className="text-white/50 text-sm">Music and your invitation will start</p>

        <motion.span
          className="mt-10 inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/25 bg-white/10 text-white/90 text-sm font-medium"
          animate={{ scale: [1, 1.04, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <span className="h-2 w-2 rounded-full bg-[#D4A63A] animate-pulse" />
          Touch anywhere
        </motion.span>
      </motion.div>
    </motion.button>
  );
}
