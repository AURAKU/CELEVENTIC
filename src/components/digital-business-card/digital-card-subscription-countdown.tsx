"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  countdownTickMs,
  subscriptionCountdown,
  type SubscriptionCountdown,
} from "@/lib/digital-business-card/subscription-countdown";

function useSubscriptionSnap(
  endsAt: Date | string | number | null | undefined,
  status?: string | null
): SubscriptionCountdown | null {
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

  return snap;
}

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
  const snap = useSubscriptionSnap(endsAt, status);
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

export function DigitalCardLiveTermRibbon({
  themeName,
  planLabel,
  endsAt,
  status,
  viewCount,
  nfcEnabled,
  qrLive = true,
  accent,
  border,
  fg,
  muted,
  faint,
}: {
  themeName: string;
  planLabel: string;
  endsAt: Date | string | number | null | undefined;
  status?: string | null;
  viewCount: number;
  nfcEnabled?: boolean;
  qrLive?: boolean;
  accent: string;
  border: string;
  fg: string;
  muted: string;
  faint: string;
}) {
  const snap = useSubscriptionSnap(endsAt, status);
  const live = (status ?? "").toUpperCase() === "ACTIVE" && snap?.kind === "renewal";
  const fill = snap ? Math.max(0.08, snap.remainingRatio) : 0.08;
  const throughWord =
    snap?.kind === "ended" ? "Ended" : snap?.kind === "expiry" ? "Open through" : "Paid through";
  const channels = [
    `${viewCount.toLocaleString("en-GB")} views`,
    qrLive ? "QR live" : null,
    nfcEnabled ? "NFC ready" : null,
    live ? "Guest page live" : null,
  ].filter(Boolean);

  return (
    <div
      className="celecard-term-ribbon relative mb-8 overflow-hidden rounded-2xl px-4 py-3.5"
      style={{
        background: faint,
        border: `1px solid ${border}`,
        color: fg,
      }}
    >
      <div className="relative z-[1] flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <span className="inline-flex items-center gap-2">
          <span
            className={cn("celecard-live-pip h-2 w-2 rounded-full", live ? "bg-[#22c55e]" : "bg-amber-400")}
            aria-hidden
          />
          <span className="text-[10px] font-bold uppercase tracking-[0.16em]">
            {live ? "Live" : snap?.kind === "ended" ? "Ended" : "Studio"}
          </span>
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: muted }}>
          {planLabel} plan
        </span>
      </div>
      <p className="relative z-[1] mt-1.5 text-sm font-semibold tracking-tight">{themeName}</p>
      <div
        className="celecard-term-flow relative z-[1] mt-3"
        style={{ background: `${border}` }}
        aria-hidden
      >
        <span
          className="celecard-term-flow-fill block h-full rounded-full"
          style={{ width: `${Math.round(fill * 100)}%`, background: accent }}
        />
        <span className="celecard-term-flow-glint" />
      </div>
      {snap ? (
        <div className="relative z-[1] mt-2.5 flex flex-col gap-0.5 text-[12px] leading-relaxed" style={{ color: muted }}>
          <p>
            {throughWord} {snap.paidThrough}
          </p>
          <p aria-live="polite">{snap.label}</p>
          {channels.length ? <p>{channels.join(" · ")}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
