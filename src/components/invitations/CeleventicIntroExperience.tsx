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
import { BRAND_MOTTO } from "@/lib/constants";

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
  const bgTarget = themeColors?.background ?? CELEVENTIC_PALETTE.navy;

  useEffect(() => {
    if (reduceMotion) {
      onComplete();
      return;
    }

    const skipTimer = setTimeout(() => setCanSkip(true), INTRO_SKIP_AVAILABLE_MS);
    const completeTimer = setTimeout(() => {
      setExiting(true);
      setTimeout(onComplete, 600);
    }, durationSec * 1000);

    return () => {
      clearTimeout(skipTimer);
      clearTimeout(completeTimer);
    };
  }, [durationSec, onComplete, reduceMotion]);

  function handleSkip() {
    if (!canSkip) return;
    setExiting(true);
    setTimeout(onComplete, 400);
  }

  if (reduceMotion) return null;

  return (
    <motion.div
      className="fixed inset-0 z-[190] flex items-center justify-center overflow-hidden celeventic-intro-root celeventic-intro-future"
      style={{
        background: exiting
          ? bgTarget
          : `linear-gradient(165deg, ${CELEVENTIC_PALETTE.navy} 0%, #061a18 35%, ${accent}22 100%)`,
      }}
      initial={{ opacity: 1 }}
      animate={{ opacity: exiting ? 0 : 1 }}
      transition={{ duration: 0.65, ease: "easeInOut" }}
    >
      {/* Futuristic grid */}
      <div className="absolute inset-0 celeventic-intro-grid opacity-30 pointer-events-none" />
      <div className="absolute inset-0 celeventic-intro-scanlines pointer-events-none" />

      {/* Logo blended into background — built-in watermark */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden"
        initial={{ opacity: 0, scale: 1.15 }}
        animate={{
          opacity: exiting ? 0 : [0.12, 0.22, 0.18],
          scale: exiting ? 1.25 : [1.15, 1.08, 1.1],
        }}
        transition={{ duration: exiting ? 0.5 : durationSec, ease: "easeOut" }}
      >
        <Image
          src={logoUrl}
          alt=""
          width={900}
          height={600}
          className="max-w-[140vw] max-h-[90vh] w-auto h-auto object-contain mix-blend-soft-light opacity-40 blur-[0.5px] celeventic-intro-watermark"
          priority
        />
      </motion.div>

      {/* Ambient particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 48 }).map((_, i) => (
          <span
            key={i}
            className="celeventic-intro-spark absolute"
            style={{
              left: `${(i * 13.7) % 100}%`,
              top: `${(i * 19.3) % 100}%`,
              animationDelay: `${i * 0.08}s`,
              background: i % 3 === 0 ? CELEVENTIC_PALETTE.gold : i % 3 === 1 ? accent : CELEVENTIC_PALETTE.coral,
            }}
          />
        ))}
      </div>

      {/* Foreground UI flow */}
      <motion.div
        className="relative z-10 flex flex-col items-center px-6 text-center max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: exiting ? 0 : 1, y: exiting ? -16 : 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      >
        <div className="celeventic-intro-hud mb-8 px-6 py-3 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md">
          <p className="text-[10px] uppercase tracking-[0.45em] text-white/50 font-medium mb-1">
            Celeventic Experience Engine
          </p>
          <div className="h-px w-full bg-gradient-to-r from-transparent via-white/30 to-transparent my-2" />
          <p className="text-xs uppercase tracking-[0.35em] text-white/70 font-semibold">{BRAND_MOTTO}</p>
        </div>

        <motion.div
          className="relative w-16 h-16 mb-6"
          animate={{ rotate: 360 }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
        >
          <div
            className="absolute inset-0 rounded-full border border-dashed opacity-40"
            style={{ borderColor: accent }}
          />
          <div
            className="absolute inset-2 rounded-full border opacity-60"
            style={{ borderColor: CELEVENTIC_PALETTE.gold }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-2 w-2 rounded-full animate-pulse" style={{ background: accent }} />
          </div>
        </motion.div>

        <motion.p
          className="text-sm text-white/60 tracking-wide"
          initial={{ opacity: 0 }}
          animate={{ opacity: exiting ? 0 : 1 }}
          transition={{ delay: 0.9, duration: 0.6 }}
        >
          Preparing your cinematic invitation…
        </motion.p>

        <motion.div
          className="mt-8 h-1 w-48 rounded-full overflow-hidden bg-white/10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <motion.div
            className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, ${accent}, ${CELEVENTIC_PALETTE.gold})` }}
            initial={{ width: "0%" }}
            animate={{ width: exiting ? "100%" : "85%" }}
            transition={{ duration: durationSec * 0.9, ease: "easeInOut" }}
          />
        </motion.div>
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
