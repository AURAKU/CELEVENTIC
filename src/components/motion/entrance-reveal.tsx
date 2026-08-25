"use client";

import { motion, useInView, type TargetAndTransition } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";
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
 * after hydration. A failsafe always restores visibility — clip-path / portal
 * handoffs must never leave invitation copy stuck at opacity 0.
 */
export function EntranceReveal({ children, delay = 0, className }: EntranceRevealProps) {
  const { profile, hydrated, scrollContainerRef, reduced } = useMotionProfile();
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, {
    root: scrollContainerRef,
    amount: 0.15,
    once: true,
    margin: "40px 0px 40px 0px",
  });
  const [forceVisible, setForceVisible] = useState(false);

  useEffect(() => {
    if (!hydrated || reduced) return;
    // Envelope / portal clip animations can prevent IntersectionObserver from
    // firing. Never leave guest-facing copy invisible.
    const ms = Math.round(520 + delay * 1000);
    const id = window.setTimeout(() => setForceVisible(true), ms);
    return () => window.clearTimeout(id);
  }, [hydrated, reduced, delay]);

  if (!hydrated || reduced) {
    return <div className={className}>{children}</div>;
  }

  const { transition, ...animateTarget } = profile.entrance.animate;
  const visible = inView || forceVisible;

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={profile.entrance.initial as TargetAndTransition}
      animate={
        (visible ? animateTarget : profile.entrance.initial) as TargetAndTransition
      }
      transition={{ ...transition, delay: visible ? delay : 0 }}
    >
      {children}
    </motion.div>
  );
}
