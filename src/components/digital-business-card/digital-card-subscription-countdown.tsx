"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  countdownFlowDelayMs,
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
      const delay = current
        ? current.remainingMs > 0
          ? countdownFlowDelayMs()
          : countdownTickMs(current.remainingMs)
        : 60_000;
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

function padUnit(value: number, width: number) {
  return String(Math.max(0, value)).padStart(width, "0");
}

function TermFlowDigits({ value }: { value: string }) {
  return (
    <span className="celecard-term-counter-value" aria-hidden>
      {value.split("").map((digit, index) => (
        <span key={`${index}-${digit}`} className="celecard-term-digit">
          {digit}
        </span>
      ))}
    </span>
  );
}

function DigitalCardTermFlowCounter({
  snap,
  accent,
  border,
  fg,
  muted,
}: {
  snap: SubscriptionCountdown;
  accent: string;
  border: string;
  fg: string;
  muted: string;
}) {
  const verb =
    snap.kind === "ended" ? "Ended" : snap.kind === "expiry" ? "Studio ends in" : "Renews in";
  const units = [
    { key: "days", value: padUnit(snap.parts.days, snap.parts.days >= 100 ? 3 : 2), label: snap.parts.days === 1 ? "Day" : "Days" },
    { key: "hours", value: padUnit(snap.parts.hours, 2), label: "Hrs" },
    { key: "minutes", value: padUnit(snap.parts.minutes, 2), label: "Min" },
    { key: "seconds", value: padUnit(snap.parts.seconds, 2), label: "Sec" },
  ];

  return (
    <div className="celecard-term-counter" data-urgent={snap.urgent ? "true" : "false"}>
      <p className="sr-only" aria-live="polite">
        {snap.label}
      </p>
      <p className="celecard-term-counter-verb" style={{ color: muted }}>
        {verb}
      </p>
      <div className="celecard-term-counter-track">
        {units.map((unit, index) => (
          <div key={unit.key} className="celecard-term-counter-unit">
            {index > 0 ? (
              <span className="celecard-term-counter-sep" style={{ color: accent }} aria-hidden />
            ) : null}
            <div
              className="celecard-term-counter-cell"
              style={{
                borderColor: border,
                color: fg,
                background: `color-mix(in srgb, ${accent} 10%, transparent)`,
              }}
            >
              <TermFlowDigits value={unit.value} />
              <span className="celecard-term-counter-label" style={{ color: muted }}>
                {unit.label}
              </span>
            </div>
          </div>
        ))}
      </div>
      {snap.kind === "ended" ? (
        <p className="celecard-term-counter-ago" style={{ color: muted }}>
          ago
        </p>
      ) : null}
    </div>
  );
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

function cleanTermLabel(label: string) {
  return label.replace(/\s*[·•|,]\s*(GH)?₵?\s*\d[\d,.]*.*$/i, "").trim() || "Paid";
}

function inkIsDark(color: string) {
  const hex = color.replace("#", "");
  if (hex.length < 6) return true;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 < 148;
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
  const remainingPct = Math.round(fill * 100);
  const throughWord =
    snap?.kind === "ended" ? "Ended" : snap?.kind === "expiry" ? "Open through" : "Paid through";
  const statusLabel = live ? "Active · Live" : snap?.kind === "ended" ? "Ended" : "Studio open";
  const termLabel = cleanTermLabel(planLabel);
  const onDark = !inkIsDark(fg);
  const chips = [
    `${viewCount.toLocaleString("en-GB")} profile views`,
    qrLive ? "QR live" : null,
    nfcEnabled ? "NFC ready" : null,
    live ? "Guest page live" : null,
  ].filter(Boolean) as string[];

  return (
    <div
      className="celecard-term-ribbon relative mb-8 overflow-hidden rounded-2xl px-4 py-4 sm:px-5"
      style={{
        background: faint,
        border: `1px solid ${border}`,
        color: fg,
      }}
    >
      <div className="relative z-[1] flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em]"
          style={{
            background: live
              ? onDark
                ? "rgba(34,197,94,0.18)"
                : "rgba(22,163,74,0.14)"
              : onDark
                ? "rgba(251,191,36,0.16)"
                : "rgba(217,119,6,0.12)",
            color: live ? (onDark ? "#86efac" : "#166534") : onDark ? "#fde68a" : "#92400e",
          }}
        >
          <span
            className={cn(
              "celecard-live-pip h-1.5 w-1.5 rounded-full",
              live ? (onDark ? "bg-[#4ade80]" : "bg-[#16a34a]") : onDark ? "bg-amber-300" : "bg-amber-600"
            )}
            aria-hidden
          />
          {statusLabel}
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: muted }}>
          {termLabel} term
        </span>
      </div>
      <p className="relative z-[1] mt-3 text-[1.05rem] font-semibold tracking-tight">{themeName}</p>
      <div className="relative z-[1] mt-3">
        <div
          className="celecard-term-flow"
          style={{ background: onDark ? "rgba(255,255,255,0.16)" : "rgba(28,25,23,0.1)" }}
          aria-hidden
        >
          <span
            className="celecard-term-flow-fill block h-full rounded-full"
            style={{ width: `${remainingPct}%`, background: accent }}
          />
          <span className="celecard-term-flow-glint" />
        </div>
        {snap ? (
          <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: muted }}>
            {snap.kind === "ended" ? "Term complete" : `${remainingPct}% of this term still ahead`}
          </p>
        ) : null}
      </div>
      {snap ? (
        <div className="relative z-[1] mt-3 flex flex-col gap-2.5">
          <p className="text-[13px] font-medium" style={{ color: fg }}>
            {throughWord} {snap.paidThrough}
          </p>
          <DigitalCardTermFlowCounter
            snap={snap}
            accent={accent}
            border={border}
            fg={fg}
            muted={muted}
          />
          {chips.length ? (
            <div className="celecard-term-chips">
              {chips.map((chip) => (
                <span
                  key={chip}
                  className="celecard-term-chip"
                  style={{ borderColor: border, color: muted }}
                >
                  {chip}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
