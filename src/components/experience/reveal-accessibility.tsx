"use client";

import { useEffect, useRef } from "react";

/**
 * Accessibility companions for the opening-ceremony system.
 *
 * Rule: interactive reveal effects must always have an accessible
 * alternative, and prefers-reduced-motion always wins — a guest who asked
 * for no motion gets a dignified static gate, never a canned animation.
 */

interface ReducedMotionGateProps {
  eventTitle: string;
  guestName?: string;
  onComplete: () => void;
}

/** Static, keyboard-first replacement for any opening ceremony. */
export function ReducedMotionGate({ eventTitle, guestName, onComplete }: ReducedMotionGateProps) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    buttonRef.current?.focus();
  }, []);

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 bg-[#0F172A] px-6 text-center safe-area-pt safe-area-pb"
      role="dialog"
      aria-label="Invitation"
    >
      {guestName && <p className="text-sm uppercase tracking-[0.3em] text-white/60">Dear {guestName}</p>}
      <h1 className="font-display text-2xl sm:text-3xl font-bold text-white max-w-xl">{eventTitle}</h1>
      <button
        ref={buttonRef}
        type="button"
        onClick={onComplete}
        className="rounded-full bg-[#D4A63A] px-8 py-3 text-sm font-semibold text-[#0F172A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
      >
        Open invitation
      </button>
    </div>
  );
}

interface RevealKeyboardFallbackProps {
  onComplete: () => void;
  label?: string;
}

/**
 * Focusable escape hatch overlaid on gesture-driven reveals (scratch, swipe,
 * glass) so keyboard and switch-access users can open the invitation without
 * performing the pointer gesture. Fades in after a short delay so it never
 * competes with the ceremony for sighted pointer users.
 */
export function RevealKeyboardFallback({ onComplete, label = "Open invitation" }: RevealKeyboardFallbackProps) {
  return (
    <div className="fixed inset-x-0 z-[130] flex justify-center pointer-events-none" style={{ bottom: "max(1.25rem, env(safe-area-inset-bottom, 0px))" }}>
      <button
        type="button"
        onClick={onComplete}
        className="pointer-events-auto rounded-full border border-white/40 bg-black/45 px-5 py-2 text-xs font-medium tracking-wide text-white/90 backdrop-blur inv-reveal-fallback-btn focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white hover:opacity-100"
      >
        {label}
      </button>
    </div>
  );
}
