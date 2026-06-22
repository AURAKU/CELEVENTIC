"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { CELEVENTIC_LOGO_MARK, CELEVENTIC_PALETTE } from "@/lib/experience/celeventic-palette";

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
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center cursor-pointer touch-manipulation celeventic-tap-begin"
      style={{ background: `linear-gradient(165deg, ${CELEVENTIC_PALETTE.navy} 0%, #0a3d38 45%, ${accent} 100%)` }}
      aria-label="Tap to begin experience"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
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
              background: i % 3 === 0 ? CELEVENTIC_PALETTE.gold : i % 3 === 1 ? CELEVENTIC_PALETTE.coral : CELEVENTIC_PALETTE.teal,
              animationDelay: `${i * 0.15}s`,
            }}
          />
        ))}
      </div>

      <motion.div
        initial={{ scale: 0.85, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 flex flex-col items-center px-8 text-center max-w-sm"
      >
        <div className="relative mb-8">
          <div
            className="absolute inset-0 rounded-full blur-3xl opacity-40 celeventic-logo-glow"
            style={{ background: CELEVENTIC_PALETTE.gold }}
          />
          <Image
            src={CELEVENTIC_LOGO_MARK}
            alt=""
            width={88}
            height={88}
            className="relative drop-shadow-2xl"
            priority
          />
        </div>

        {eventTitle && (
          <p className="text-white/70 text-sm font-medium tracking-wide mb-3 line-clamp-2">{eventTitle}</p>
        )}

        <p className="text-white font-display text-xl sm:text-2xl font-semibold tracking-tight mb-2">
          Tap to Begin Experience
        </p>
        <p className="text-white/55 text-sm">Your invitation awaits</p>

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
