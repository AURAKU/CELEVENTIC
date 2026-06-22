"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import {
  CELEVENTIC_LOGO_FULL,
  CELEVENTIC_PALETTE,
  INTRO_SKIP_AVAILABLE_MS,
  type IntroDurationSec,
} from "@/lib/experience/celeventic-palette";

interface ThemeTransitionColors {
  accent?: string;
  primary?: string;
  background?: string;
}

interface CeleventicIntroExperienceProps {
  durationSec?: IntroDurationSec;
  onComplete: () => void;
  logoUrl?: string;
  themeColors?: ThemeTransitionColors;
}

export function CeleventicIntroExperience({
  durationSec = 3,
  onComplete,
  logoUrl = CELEVENTIC_LOGO_FULL,
  themeColors,
}: CeleventicIntroExperienceProps) {
  const reduceMotion = useReducedMotion();
  const [canSkip, setCanSkip] = useState(false);
  const [exiting, setExiting] = useState(false);

  const accent = themeColors?.accent ?? CELEVENTIC_PALETTE.teal;
  const bgTarget = themeColors?.background ?? CELEVENTIC_PALETTE.ivory;

  useEffect(() => {
    if (reduceMotion) {
      onComplete();
      return;
    }

    const skipTimer = setTimeout(() => setCanSkip(true), INTRO_SKIP_AVAILABLE_MS);
    const completeTimer = setTimeout(() => {
      setExiting(true);
      setTimeout(onComplete, 480);
    }, durationSec * 1000);

    return () => {
      clearTimeout(skipTimer);
      clearTimeout(completeTimer);
    };
  }, [durationSec, onComplete, reduceMotion]);

  function handleSkip() {
    if (!canSkip) return;
    setExiting(true);
    setTimeout(onComplete, 320);
  }

  if (reduceMotion) return null;

  return (
    <motion.div
      className="fixed inset-0 z-[190] flex items-center justify-center overflow-hidden celeventic-intro-root"
      style={{
        background: exiting
          ? `linear-gradient(165deg, ${bgTarget} 0%, ${bgTarget} 100%)`
          : `radial-gradient(circle at 30% 20%, ${accent}33 0%, transparent 50%),
          radial-gradient(circle at 70% 80%, ${CELEVENTIC_PALETTE.coral}22 0%, transparent 45%),
          linear-gradient(165deg, ${CELEVENTIC_PALETTE.navy} 0%, #0a3d38 40%, ${accent} 100%)`,
      }}
      initial={{ opacity: 1 }}
      animate={{ opacity: exiting ? 0 : 1 }}
      transition={{ duration: 0.55, ease: "easeInOut" }}
    >
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 36 }).map((_, i) => (
          <span
            key={i}
            className="celeventic-intro-spark absolute"
            style={{
              left: `${(i * 13.7) % 100}%`,
              top: `${(i * 19.3) % 100}%`,
              animationDelay: `${i * 0.12}s`,
              background:
                i % 4 === 0
                  ? CELEVENTIC_PALETTE.gold
                  : i % 4 === 1
                    ? CELEVENTIC_PALETTE.coral
                    : i % 4 === 2
                      ? accent
                      : CELEVENTIC_PALETTE.ivory,
            }}
          />
        ))}
      </div>

      <motion.div
        className="absolute w-[min(90vw,420px)] h-[min(90vw,420px)] rounded-full blur-3xl opacity-30"
        style={{ background: `radial-gradient(circle, ${CELEVENTIC_PALETTE.gold} 0%, transparent 70%)` }}
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: exiting ? 1.4 : [0.85, 1.05, 1], opacity: exiting ? 0 : [0.2, 0.35, 0.28] }}
        transition={{ duration: exiting ? 0.4 : 2.8, ease: "easeOut" }}
      />

      <motion.div
        className="relative z-10 flex flex-col items-center px-6"
        initial={{ opacity: 0, y: 28, scale: 0.72 }}
        animate={{
          opacity: exiting ? 0 : 1,
          y: exiting ? -24 : [28, -6, 0],
          scale: exiting ? 0.92 : [0.72, 1.08, 1],
        }}
        transition={{
          duration: exiting ? 0.35 : 1.1,
          ease: [0.22, 1, 0.36, 1],
          times: exiting ? undefined : [0, 0.65, 1],
        }}
      >
        <div className="relative celeventic-logo-glow">
          <Image
            src={logoUrl}
            alt="Celeventic"
            width={240}
            height={280}
            className="w-auto h-auto max-w-[min(72vw,240px)] drop-shadow-2xl"
            priority
          />
        </div>
        <motion.p
          className="mt-6 text-[10px] uppercase tracking-[0.35em] text-white/50 font-medium"
          initial={{ opacity: 0 }}
          animate={{ opacity: exiting ? 0 : 1 }}
          transition={{ delay: 0.7, duration: 0.6 }}
        >
          Celebrate • Event • Ticket
        </motion.p>
      </motion.div>

      {canSkip && !exiting && (
        <motion.button
          type="button"
          onClick={handleSkip}
          className="absolute bottom-8 right-6 z-20 px-4 py-2 rounded-full text-xs font-medium text-white/70 border border-white/20 bg-white/5 backdrop-blur-sm hover:bg-white/10 hover:text-white transition-colors touch-manipulation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          Skip intro
        </motion.button>
      )}
    </motion.div>
  );
}
