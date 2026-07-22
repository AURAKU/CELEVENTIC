"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { useMotionProfile } from "./motion-profile-provider";

interface DriftLayerProps {
  children: ReactNode;
  className?: string;
  /** Phase offset so multiple layers don't move in lockstep */
  phase?: number;
}

/**
 * Ambient decorative float (transform-only). Renders static when the profile
 * has no drift (still profile, reduced motion, low tier).
 */
export function DriftLayer({ children, className, phase = 0 }: DriftLayerProps) {
  const { profile, intensity, hydrated } = useMotionProfile();
  const drift = profile.drift;

  if (!hydrated || !drift || intensity <= 0) {
    return (
      <div className={className} aria-hidden>
        {children}
      </div>
    );
  }

  const distance = drift.y * intensity;
  return (
    <motion.div
      className={className}
      aria-hidden
      animate={{ y: [-distance, distance, -distance] }}
      transition={{
        duration: drift.durationSec,
        repeat: Infinity,
        ease: "easeInOut",
        delay: phase,
      }}
    >
      {children}
    </motion.div>
  );
}
