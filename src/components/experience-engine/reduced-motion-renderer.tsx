"use client";

import { useEffect, useRef } from "react";

interface ReducedMotionRendererProps {
  eventTitle: string;
  guestName?: string;
  onComplete: () => void;
  keyboardLabel?: string;
}

/**
 * Static, keyboard-first reveal fallback used by InteractiveReveal
 * and available for templates that opt into Experience Engine directly.
 * Mirrors ReducedMotionGate without coupling callers to experience/*.
 */
export function ReducedMotionRenderer({
  eventTitle,
  guestName,
  onComplete,
  keyboardLabel = "Open invitation",
}: ReducedMotionRendererProps) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    buttonRef.current?.focus();
  }, []);

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 bg-[#0F172A] px-6 text-center safe-area-pt safe-area-pb"
      role="dialog"
      aria-label="Invitation"
      data-reduced-motion-renderer
    >
      {guestName && (
        <p className="text-sm uppercase tracking-[0.3em] text-white/60">Dear {guestName}</p>
      )}
      <h1 className="font-display max-w-xl text-2xl font-bold text-white sm:text-3xl">{eventTitle}</h1>
      <button
        ref={buttonRef}
        type="button"
        onClick={onComplete}
        className="rounded-full bg-[#D4A63A] px-8 py-3 text-sm font-semibold text-[#0F172A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
      >
        {keyboardLabel}
      </button>
    </div>
  );
}
