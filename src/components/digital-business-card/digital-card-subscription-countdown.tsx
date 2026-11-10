"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  countdownTickMs,
  subscriptionCountdown,
} from "@/lib/digital-business-card/subscription-countdown";

export function DigitalCardSubscriptionCountdown({
  endsAt,
  status,
  className,
  showPaidThrough = false,
  tone = "onDark",
}: {
  endsAt: Date | string | number | null | undefined;
  status?: string | null;
  className?: string;
  showPaidThrough?: boolean;
  tone?: "onDark" | "onLight";
}) {
  const [now, setNow] = useState(() => Date.now());
  const snap = subscriptionCountdown(endsAt, status, now);

  useEffect(() => {
    if (!endsAt) return;
    let timer = 0;
    function arm() {
      const current = subscriptionCountdown(endsAt, status, Date.now());
      const delay = current ? countdownTickMs(current.remainingMs) : 60_000;
      timer = window.setTimeout(() => {
        setNow(Date.now());
        arm();
      }, delay);
    }
    arm();
    return () => window.clearTimeout(timer);
  }, [endsAt, status]);

  if (!snap) return null;

  const pill =
    snap.kind === "ended"
      ? tone === "onDark"
        ? "bg-red-500/20 text-red-100"
        : "bg-red-100 text-red-800"
      : snap.urgent
        ? tone === "onDark"
          ? "bg-amber-400/22 text-amber-50"
          : "bg-amber-100 text-amber-950"
        : tone === "onDark"
          ? "bg-white/12"
          : "bg-black/[0.06]";

  return (
    <span className={cn("inline-flex flex-wrap items-center gap-x-2 gap-y-1", className)}>
      {showPaidThrough ? (
        <span>
          {snap.kind === "ended" ? "Ended" : snap.kind === "expiry" ? "Open through" : "Paid through"}{" "}
          {snap.paidThrough}
        </span>
      ) : null}
      <span
        className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-tight", pill)}
        aria-live="polite"
      >
        {snap.label}
      </span>
    </span>
  );
}
