"use client";

import { cn } from "@/lib/utils";

interface ManualGateCodeRevealProps {
  code: string;
  /** Compact for inside invitation templates */
  variant?: "invite" | "pass" | "dark";
  className?: string;
}

/** Guest-facing 4-digit gate code — shown under invitation / admission QR. */
export function ManualGateCodeReveal({
  code,
  variant = "invite",
  className,
}: ManualGateCodeRevealProps) {
  const digits = code.trim();
  if (!/^\d{4}$/.test(digits)) return null;

  if (variant === "dark") {
    return (
      <div
        className={cn(
          "rounded-xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-sm text-center",
          className
        )}
      >
        <p className="text-[10px] uppercase tracking-[0.25em] text-white/60 mb-1">Gate code</p>
        <p className="font-mono text-3xl font-bold tracking-[0.35em] text-white tabular-nums">{digits}</p>
        <p className="text-xs text-white/55 mt-1">Tell staff this code if scanning isn’t possible</p>
      </div>
    );
  }

  if (variant === "pass") {
    return (
      <div
        className={cn(
          "mt-4 rounded-xl border border-[#D4A63A]/40 bg-[#FFFBF0] px-4 py-3 text-center",
          className
        )}
      >
        <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-1">Manual gate code</p>
        <p className="font-mono text-3xl font-bold tracking-[0.35em] text-[#0F172A] tabular-nums">{digits}</p>
        <p className="text-xs text-slate-500 mt-1">If scanning fails, tell the gate this 4-digit code</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "mx-auto mt-4 max-w-[220px] rounded-xl border border-black/10 bg-white/90 px-3 py-2.5 text-center shadow-sm",
        className
      )}
    >
      <p className="text-[9px] uppercase tracking-[0.22em] text-slate-500 mb-0.5">Your gate code</p>
      <p className="font-mono text-2xl font-bold tracking-[0.32em] text-slate-900 tabular-nums">{digits}</p>
      <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">Show at entry if QR can’t be scanned</p>
    </div>
  );
}
