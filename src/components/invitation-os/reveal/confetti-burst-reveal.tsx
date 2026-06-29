"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { RevealConfetti } from "@/components/invitation-os/reveal/reveal-confetti";

interface ConfettiBurstRevealProps {
  guestName?: string;
  eventTitle: string;
  onComplete: () => void;
}

export function ConfettiBurstReveal({ guestName, eventTitle, onComplete }: ConfettiBurstRevealProps) {
  useEffect(() => {
    const t = setTimeout(onComplete, 2200);
    return () => clearTimeout(t);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gradient-to-br from-fuchsia-900 via-purple-950 to-black overflow-hidden">
      <RevealConfetti active />
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 150, delay: 0.3 }}
        className="relative z-10 text-center px-8 max-w-md"
      >
        <h1 className="font-display text-3xl sm:text-4xl text-white font-bold mb-2">{eventTitle}</h1>
        {guestName && <p className="text-fuchsia-200 text-sm">Hey {guestName} — you&apos;re invited!</p>}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-6 text-fuchsia-300 text-lg font-semibold"
        >
          Let&apos;s celebrate!
        </motion.p>
      </motion.div>
    </div>
  );
}
