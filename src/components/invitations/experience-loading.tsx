"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import { CELEVENTIC_LOGO_MARK, CELEVENTIC_PALETTE } from "@/lib/experience/celeventic-palette";

interface ExperienceLoadingProps {
  onComplete: () => void;
  eventTitle?: string;
  accentColor?: string;
  durationMs?: number;
}

export function ExperienceLoading({
  onComplete,
  eventTitle,
  accentColor = CELEVENTIC_PALETTE.teal,
  durationMs = 1800,
}: ExperienceLoadingProps) {
  const reduceMotion = useReducedMotion();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (reduceMotion) {
      onComplete();
      return;
    }

    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(100, (elapsed / durationMs) * 100);
      setProgress(pct);
      if (elapsed >= durationMs) {
        clearInterval(interval);
        onComplete();
      }
    }, 40);

    return () => clearInterval(interval);
  }, [durationMs, onComplete, reduceMotion]);

  if (reduceMotion) return null;

  return (
    <motion.div
      className="fixed inset-0 z-[195] flex flex-col items-center justify-center overflow-hidden"
      style={{
        background: `linear-gradient(165deg, ${CELEVENTIC_PALETTE.navy} 0%, #0a3d38 50%, ${accentColor} 100%)`,
      }}
      initial={{ opacity: 1 }}
      animate={{ opacity: progress >= 95 ? 0 : 1 }}
      transition={{ duration: 0.35 }}
    >
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 20 }).map((_, i) => (
          <span
            key={i}
            className="celeventic-intro-particle absolute rounded-full"
            style={{
              left: `${(i * 19) % 100}%`,
              top: `${(i * 27) % 100}%`,
              width: 3 + (i % 2),
              height: 3 + (i % 2),
              background: i % 2 === 0 ? CELEVENTIC_PALETTE.gold : accentColor,
              animationDelay: `${i * 0.1}s`,
            }}
          />
        ))}
      </div>

      <motion.div
        className="relative z-10 flex flex-col items-center px-8 text-center max-w-sm"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Image
          src={CELEVENTIC_LOGO_MARK}
          alt=""
          width={56}
          height={56}
          className="mb-6 opacity-90 drop-shadow-lg celeventic-logo-glow"
          priority
        />

        {eventTitle && (
          <p className="text-white/60 text-sm mb-4 line-clamp-2">{eventTitle}</p>
        )}

        <p className="text-white/90 text-sm font-medium tracking-wide mb-6">
          Preparing your experience
        </p>

        <div className="w-48 h-1 rounded-full bg-white/15 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, ${accentColor}, ${CELEVENTIC_PALETTE.gold})` }}
            initial={{ width: "0%" }}
            animate={{ width: `${progress}%` }}
            transition={{ ease: "easeOut" }}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}
