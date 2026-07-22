"use client";

import { motion, type TargetAndTransition } from "framer-motion";
import type { ReactNode } from "react";
import { useMotionProfile } from "./motion-profile-provider";

interface EntranceRevealProps {
  children: ReactNode;
  /** Stagger offset in seconds */
  delay?: number;
  className?: string;
}

/**
 * Foreground entrance reveal driven by the active motion profile.
 * Content is fully present in SSR HTML; the initial-hidden state only applies
 * after hydration (whileInView), so no-JS clients always see the text.
 */
export function EntranceReveal({ children, delay = 0, className }: EntranceRevealProps) {
  const { profile, hydrated, scrollContainerRef } = useMotionProfile();

  if (!hydrated) {
    return <div className={className}>{children}</div>;
  }

  const { transition, ...animateTarget } = profile.entrance.animate;
  return (
    <motion.div
      className={className}
      initial={profile.entrance.initial as TargetAndTransition}
      whileInView={animateTarget as TargetAndTransition}
      transition={{ ...transition, delay }}
      viewport={{ root: scrollContainerRef, amount: 0.3, once: true }}
    >
      {children}
    </motion.div>
  );
}
