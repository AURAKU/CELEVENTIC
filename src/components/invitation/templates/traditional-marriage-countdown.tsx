"use client";

import { useEffect, useState } from "react";
import { TM_PALETTE as PALETTE } from "./traditional-marriage-palette";
import { cn } from "@/lib/utils";

export interface TraditionalMarriageCountdownProps {
  targetIso: string;
  label?: string;
  begunLabel?: string;
  className?: string;
}

type Parts = { d: number; h: number; m: number; begun: boolean };

function useTmCountdown(targetIso: string): Parts {
  const [parts, setParts] = useState<Parts>({ d: 0, h: 0, m: 0, begun: false });

  useEffect(() => {
    function tick() {
      const diff = new Date(targetIso).getTime() - Date.now();
      if (diff <= 0) {
        setParts({ d: 0, h: 0, m: 0, begun: true });
        return;
      }
      setParts({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        begun: false,
      });
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetIso]);

  return parts;
}

function Unit({ value, unit, delay }: { value: number; unit: string; delay: number }) {
  return (
    <div
      className="tm-countdown-unit flex flex-col items-center min-w-[4.25rem] sm:min-w-[4.75rem] px-2.5 py-3 rounded-sm border"
      style={{
        borderColor: `${PALETTE.mustard}40`,
        backgroundColor: `${PALETTE.linen}E6`,
        animationDelay: `${delay}ms`,
      }}
    >
      <span
        className="font-[family-name:var(--font-cormorant)] text-[2rem] sm:text-[2.35rem] leading-none tabular-nums tracking-wide"
        style={{ color: PALETTE.ink }}
        aria-hidden
      >
        {String(value).padStart(2, "0")}
      </span>
      <span
        className="mt-2 font-[family-name:var(--font-cormorant)] text-[10px] tracking-[0.28em] uppercase"
        style={{ color: PALETTE.bronzeDeep }}
      >
        {unit}
      </span>
    </div>
  );
}

/**
 * Traditional Marriage countdown — linen / bronze editorial cells.
 * No navy slab; blends with Kindly Respond / The Couple / Memory Vault.
 */
export function TraditionalMarriageCountdown({
  targetIso,
  label = "Until we gather",
  begunLabel = "The celebration has begun",
  className,
}: TraditionalMarriageCountdownProps) {
  const { d, h, m, begun } = useTmCountdown(targetIso);

  if (!targetIso) return null;

  return (
    <section
      aria-labelledby="tm-countdown-heading"
      aria-live="polite"
      className={cn(
        "tm-section-rise relative overflow-hidden rounded-sm border px-5 py-7 sm:px-7 sm:py-8 text-center shadow-[0_22px_48px_-28px_rgba(92,61,46,0.38)]",
        className
      )}
      style={{
        borderColor: PALETTE.border,
        background: `
          linear-gradient(168deg, ${PALETTE.linen} 0%, ${PALETTE.peach} 48%, ${PALETTE.peachDeep} 100%),
          repeating-linear-gradient(
            0deg,
            transparent,
            transparent 11px,
            rgba(161,131,115,0.03) 11px,
            rgba(161,131,115,0.03) 12px
          )
        `,
      }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-24 opacity-70"
        style={{
          background: `radial-gradient(ellipse at 50% -10%, ${PALETTE.mustardSoft}38 0%, transparent 68%)`,
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-3 rounded-sm border opacity-40"
        style={{ borderColor: `${PALETTE.mustard}55` }}
        aria-hidden
      />

      <div className="relative space-y-2">
        <p
          className="font-[family-name:var(--font-cormorant)] text-[11px] tracking-[0.36em] uppercase"
          style={{ color: PALETTE.bronzeDeep }}
        >
          Countdown
        </p>
        <h2
          id="tm-countdown-heading"
          className="font-[family-name:var(--font-great-vibes)] text-[2.35rem] sm:text-[2.65rem] leading-none"
          style={{ color: PALETTE.bronze }}
        >
          {begun ? "It begins" : label}
        </h2>
      </div>

      <div
        className="tm-hairline relative mx-auto mt-5 mb-6 h-px w-16"
        style={{ backgroundColor: `${PALETTE.mustard}70` }}
        aria-hidden
      />

      {begun ? (
        <p
          className="relative font-[family-name:var(--font-cormorant)] text-base sm:text-lg leading-relaxed max-w-sm mx-auto"
          style={{ color: PALETTE.dress }}
        >
          {begunLabel}
        </p>
      ) : (
        <div className="relative flex justify-center gap-2.5 sm:gap-3.5">
          <Unit value={d} unit="Days" delay={80} />
          <Unit value={h} unit="Hours" delay={180} />
          <Unit value={m} unit="Minutes" delay={280} />
        </div>
      )}
    </section>
  );
}
