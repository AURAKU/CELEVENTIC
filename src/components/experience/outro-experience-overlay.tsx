"use client";

import { motion } from "framer-motion";
import type { OutroExperienceId } from "@/lib/experience/experience-types";
import { RevealConfetti } from "@/components/invitation-os/reveal/reveal-confetti";

interface OutroExperienceOverlayProps {
  outroId: OutroExperienceId;
  message?: string;
  accentColor?: string;
}

export function OutroExperienceOverlay({ outroId, message, accentColor = "#D4A63A" }: OutroExperienceOverlayProps) {
  if (outroId === "none") return null;

  const text = message ?? "Thank you for being part of our celebration.";

  return (
    <div className="pointer-events-none absolute inset-0 z-[5] overflow-hidden">
      {(outroId === "fireworks" || outroId === "golden-sparkles") && <RevealConfetti active />}

      {outroId === "lanterns" && (
        <>
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-3 h-4 rounded-full opacity-60"
              style={{ left: `${15 + i * 14}%`, background: accentColor, bottom: "-10%" }}
              animate={{ y: [0, "-120vh"], opacity: [0.8, 0] }}
              transition={{ duration: 8 + i, repeat: Infinity, delay: i * 1.2 }}
            />
          ))}
        </>
      )}

      {outroId === "butterflies" && (
        <>
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute text-2xl"
              style={{ left: `${10 + i * 18}%`, top: `${20 + i * 10}%` }}
              animate={{ x: [0, 30, -20, 0], y: [0, -20, 10, 0] }}
              transition={{ duration: 4 + i, repeat: Infinity }}
            >
              🦋
            </motion.div>
          ))}
        </>
      )}

      {outroId === "rose-petals" && (
        <>
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-3 rounded-full bg-rose-400/70"
              style={{ left: `${(i * 9) % 100}%`, top: "-5%" }}
              animate={{ y: ["0vh", "110vh"], rotate: [0, 360], opacity: [1, 0.3] }}
              transition={{ duration: 6 + i * 0.3, repeat: Infinity, delay: i * 0.4 }}
            />
          ))}
        </>
      )}

      {outroId === "closing-curtain" && (
        <motion.div
          className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent"
          animate={{ opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
      )}

      {(outroId === "thank-you-fade" || outroId === "final-quote" || outroId === "see-you-soon") && (
        <motion.p
          className="absolute bottom-8 left-0 right-0 text-center text-sm px-6 opacity-40"
          style={{ color: accentColor }}
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 4, repeat: Infinity }}
        >
          {outroId === "see-you-soon" ? "See you soon ✦" : text}
        </motion.p>
      )}
    </div>
  );
}
