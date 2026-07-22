"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { RevealKeyboardFallback } from "@/components/experience/reveal-accessibility";

interface PressHoldRevealProps {
  guestName?: string;
  eventTitle: string;
  onComplete: () => void;
  /** Hold duration before completion (ms). */
  holdMs?: number;
}

/**
 * Press-and-hold reveal — pointer + keyboard accessible.
 * Used for Experience Engine mechanic `press-hold`.
 */
export function PressHoldReveal({
  guestName,
  eventTitle,
  onComplete,
  holdMs = 900,
}: PressHoldRevealProps) {
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const completedRef = useRef(false);

  const clear = useCallback(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    startRef.current = null;
  }, []);

  const finish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    setDone(true);
    setProgress(1);
    clear();
    window.setTimeout(onComplete, 420);
  }, [clear, onComplete]);

  const tick = useCallback(
    (now: number) => {
      if (startRef.current == null) startRef.current = now;
      const elapsed = now - startRef.current;
      const next = Math.min(1, elapsed / holdMs);
      setProgress(next);
      if (next >= 1) {
        finish();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    },
    [finish, holdMs]
  );

  const beginHold = useCallback(() => {
    if (done || completedRef.current) return;
    clear();
    startRef.current = null;
    rafRef.current = requestAnimationFrame(tick);
  }, [clear, done, tick]);

  const endHold = useCallback(() => {
    if (done || completedRef.current) return;
    clear();
    setProgress(0);
  }, [clear, done]);

  useEffect(() => () => clear(), [clear]);

  return (
    <div className="fixed inset-0 z-[100] safe-area-pt safe-area-pb flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-black">
      <div className="relative z-10 px-8 text-center max-w-md">
        <p className="mb-6 text-xs uppercase tracking-[0.35em] text-white/50">Press & hold</p>
        <h1 className="font-display mb-2 text-2xl font-bold text-white sm:text-3xl">{eventTitle}</h1>
        {guestName && <p className="mb-10 text-sm text-white/60">For {guestName}</p>}

        <motion.button
          type="button"
          disabled={done}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            beginHold();
          }}
          onPointerUp={endHold}
          onPointerCancel={endHold}
          onPointerLeave={endHold}
          onKeyDown={(e) => {
            if (e.key === " " || e.key === "Enter") {
              e.preventDefault();
              beginHold();
            }
          }}
          onKeyUp={(e) => {
            if (e.key === " " || e.key === "Enter") {
              e.preventDefault();
              endHold();
            }
          }}
          className="relative mx-auto flex h-32 w-32 touch-manipulation items-center justify-center rounded-full border border-white/25 bg-white/10 text-white shadow-lg backdrop-blur-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
          aria-label="Press and hold to open invitation"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
          role="progressbar"
        >
          <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100" aria-hidden>
            <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="4" />
            <circle
              cx="50"
              cy="50"
              r="46"
              fill="none"
              stroke="rgba(255,255,255,0.9)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 46}`}
              strokeDashoffset={`${2 * Math.PI * 46 * (1 - progress)}`}
            />
          </svg>
          <span className="relative z-10 text-sm font-semibold tracking-wide">
            {done ? "Open" : "Hold"}
          </span>
        </motion.button>
      </div>
      <RevealKeyboardFallback onComplete={finish} />
    </div>
  );
}
