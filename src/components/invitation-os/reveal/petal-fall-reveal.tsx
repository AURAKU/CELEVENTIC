"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { RevealConfetti } from "@/components/invitation-os/reveal/reveal-confetti";

interface PetalFallRevealProps {
  guestName?: string;
  eventTitle: string;
  onComplete: () => void;
}

const PETALS = [
  { left: "12%", delay: 0, size: 18 },
  { left: "28%", delay: 0.15, size: 14 },
  { left: "45%", delay: 0.05, size: 20 },
  { left: "62%", delay: 0.22, size: 16 },
  { left: "78%", delay: 0.1, size: 15 },
  { left: "38%", delay: 0.3, size: 12 },
  { left: "55%", delay: 0.18, size: 17 },
];

export function PetalFallReveal({ guestName, eventTitle, onComplete }: PetalFallRevealProps) {
  const [opened, setOpened] = useState(false);

  function open() {
    if (opened) return;
    setOpened(true);
    setTimeout(onComplete, 1200);
  }

  return (
    <div className="fixed inset-0 z-[100] safe-area-pt safe-area-pb flex items-center justify-center bg-gradient-to-b from-rose-50 via-pink-50 to-rose-100 overflow-hidden">
      {opened && <RevealConfetti active />}

      {PETALS.map((p, i) => (
        <motion.span
          key={i}
          className="absolute top-[-10%] rounded-[60%_40%_60%_40%] bg-gradient-to-br from-rose-300 to-pink-500 opacity-70 pointer-events-none"
          style={{ left: p.left, width: p.size, height: p.size * 1.3 }}
          animate={
            opened
              ? { y: "110vh", rotate: 360 + i * 40, opacity: 0.2 }
              : { y: [0, 12, 0], rotate: [0, 8, -6, 0] }
          }
          transition={
            opened
              ? { duration: 1.1, delay: p.delay, ease: "easeIn" }
              : { duration: 3 + i * 0.2, repeat: Infinity, ease: "easeInOut" }
          }
        />
      ))}

      <div className="relative z-10 text-center px-8 max-w-md">
        <p className="text-xs uppercase tracking-[0.4em] text-rose-400/80 mb-6">Watercolor garden</p>
        <h1 className="font-display text-xl sm:text-2xl text-rose-950 font-bold mb-2">{eventTitle}</h1>
        {guestName && <p className="text-rose-700/60 text-sm mb-10">For {guestName}</p>}

        <button
          type="button"
          onClick={open}
          disabled={opened}
          className="mx-auto touch-manipulation rounded-full border-2 border-rose-300/70 bg-white/80 px-8 py-3 text-rose-900 shadow-md hover:bg-white"
          aria-label="Let the petals fall"
        >
          {opened ? "Opening…" : "Tap — petals fall"}
        </button>
      </div>
    </div>
  );
}
