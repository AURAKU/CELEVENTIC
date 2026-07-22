"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Gift } from "lucide-react";
import { RevealConfetti } from "@/components/invitation-os/reveal/reveal-confetti";

interface GiftBoxRevealProps {
  guestName?: string;
  eventTitle: string;
  onComplete: () => void;
}

export function GiftBoxReveal({ guestName, eventTitle, onComplete }: GiftBoxRevealProps) {
  const [opened, setOpened] = useState(false);

  function open() {
    setOpened(true);
    setTimeout(onComplete, 1200);
  }

  return (
    <div className="fixed inset-0 z-[100] safe-area-pt safe-area-pb flex items-center justify-center bg-gradient-to-b from-amber-950 via-red-950 to-black overflow-hidden">
      {opened && <RevealConfetti active />}

      <div className="relative z-10 text-center px-8 max-w-md">
        <p className="text-xs uppercase tracking-[0.4em] text-amber-300/70 mb-6">A gift awaits</p>
        <h1 className="font-display text-xl sm:text-2xl text-amber-50 font-bold mb-2">{eventTitle}</h1>
        {guestName && <p className="text-amber-200/60 text-sm mb-10">For {guestName}</p>}

        <button
          type="button"
          onClick={open}
          disabled={opened}
          className="relative mx-auto touch-manipulation"
          aria-label="Open gift box"
        >
          <motion.div
            animate={opened ? { y: -80, opacity: 0, rotate: -15 } : { y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-32 h-16 mx-auto bg-gradient-to-b from-red-600 to-red-800 rounded-t-lg border-2 border-amber-400/50"
          />
          <motion.div
            className="w-36 h-24 mx-auto bg-gradient-to-b from-red-700 to-red-900 rounded-lg border-2 border-amber-400/40 flex items-center justify-center"
            animate={opened ? { scale: 1.1 } : {}}
          >
            {!opened && <Gift className="h-10 w-10 text-amber-300" />}
            {opened && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="text-amber-200 font-bold text-lg"
              >
                Open!
              </motion.span>
            )}
          </motion.div>
          {!opened && (
            <p className="mt-4 text-amber-300/80 text-sm">Tap to open</p>
          )}
        </button>
      </div>
    </div>
  );
}
