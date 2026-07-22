"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { RevealKeyboardFallback } from "@/components/experience/reveal-accessibility";

interface MagazinePageTurnRevealProps {
  guestName?: string;
  eventTitle: string;
  hostName?: string;
  onComplete: () => void;
}

/**
 * Editorial ceremony — magazine cover, swipe / page-turn / keyboard to open.
 */
export function MagazinePageTurnReveal({
  guestName,
  eventTitle,
  hostName,
  onComplete,
}: MagazinePageTurnRevealProps) {
  const [turned, setTurned] = useState(false);
  const [dragX, setDragX] = useState(0);

  function turn() {
    if (turned) return;
    setTurned(true);
    setTimeout(onComplete, 900);
  }

  function handleDragEnd(_: unknown, info: { offset: { x: number } }) {
    if (info.offset.x < -90 || info.offset.x > 90) {
      turn();
    } else {
      setDragX(0);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] safe-area-pt safe-area-pb flex items-center justify-center bg-gradient-to-br from-slate-950 via-indigo-950 to-black overflow-hidden">
      <div className="absolute inset-0 opacity-[0.07] pointer-events-none bg-[repeating-linear-gradient(90deg,transparent,transparent_48px,#fff_48px,#fff_49px)]" />

      <div className="relative z-10 text-center px-6 max-w-lg w-full">
        <p className="text-[10px] uppercase tracking-[0.45em] text-slate-400 mb-6">
          Issue · Love Story
        </p>

        <div className="mx-auto mb-8" style={{ perspective: 1400 }}>
          <motion.button
            type="button"
            drag={!turned ? "x" : false}
            dragConstraints={{ left: -160, right: 40 }}
            dragElastic={0.12}
            onDrag={(_, info) => setDragX(info.offset.x)}
            onDragEnd={handleDragEnd}
            onClick={!turned ? turn : undefined}
            disabled={turned}
            animate={{
              rotateY: turned ? -105 : Math.min(0, dragX * 0.35),
              x: turned ? -40 : 0,
            }}
            transition={{ duration: turned ? 0.75 : 0.15, ease: [0.22, 1, 0.36, 1] }}
            style={{ transformStyle: "preserve-3d", x: turned ? undefined : dragX * 0.15 }}
            className="relative mx-auto block w-[min(100%,280px)] aspect-[3/4] touch-manipulation text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-slate-300 disabled:pointer-events-none"
            aria-label="Swipe or tap to turn the magazine page"
          >
            {/* Cover */}
            <div
              className="absolute inset-0 rounded-sm border border-slate-500/40 shadow-2xl shadow-black/60 overflow-hidden"
              style={{
                backfaceVisibility: "hidden",
                background:
                  "linear-gradient(160deg, #1e1b4b 0%, #0f172a 55%, #020617 100%)",
              }}
            >
              <div className="absolute top-5 left-5 right-5">
                <p className="text-[9px] tracking-[0.35em] uppercase text-slate-400">
                  Celeventic Editorial
                </p>
                <h2 className="mt-4 font-display text-2xl text-slate-50 leading-tight">
                  {eventTitle}
                </h2>
                {guestName && (
                  <p className="mt-3 text-slate-400 text-xs italic">Featuring {guestName}</p>
                )}
              </div>
              <div className="absolute bottom-6 left-5 right-5 flex items-end justify-between">
                <span className="text-[10px] uppercase tracking-widest text-slate-500">
                  Vol. I
                </span>
                <span className="text-slate-300 text-xs">Swipe ←</span>
              </div>
              <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-slate-400/40 to-transparent" />
            </div>

            {/* Underside after turn */}
            <div
              className="absolute inset-0 rounded-sm bg-slate-100 flex flex-col items-center justify-center p-8"
              style={{
                backfaceVisibility: "hidden",
                transform: "rotateY(180deg)",
              }}
            >
              <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500 mb-3">
                Inside
              </p>
              <p className="font-display text-xl text-slate-900 text-center">{eventTitle}</p>
              {hostName && (
                <p className="text-slate-500 text-xs mt-3">Hosted by {hostName}</p>
              )}
            </div>
          </motion.button>
        </div>

        {!turned && (
          <p className="text-slate-500 text-xs tracking-wide">
            Swipe or tap the cover · Enter to turn the page
          </p>
        )}
        {turned && (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-slate-300 text-sm"
          >
            Opening the story…
          </motion.p>
        )}
      </div>

      <RevealKeyboardFallback onComplete={turn} />
    </div>
  );
}
