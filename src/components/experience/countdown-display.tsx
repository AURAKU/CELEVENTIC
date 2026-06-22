"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

interface CountdownDisplayProps {
  targetIso: string;
  style?: "classic" | "flip" | "luxury" | "ring" | "minimal" | "glass" | "gold-royal" | "circular";
  label?: string;
  begunLabel?: string;
}

function useCountdown(targetIso: string, begunLabel: string) {
  const [parts, setParts] = useState({ d: 0, h: 0, m: 0, s: 0, begun: false });

  useEffect(() => {
    function tick() {
      const diff = new Date(targetIso).getTime() - Date.now();
      if (diff <= 0) {
        setParts({ d: 0, h: 0, m: 0, s: 0, begun: true });
        return;
      }
      setParts({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
        begun: false,
      });
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetIso]);

  return { ...parts, begunLabel };
}

function FlipUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center min-w-[52px]">
      <div className="bg-[#0F172A] text-white rounded-lg px-3 py-2 font-mono text-xl font-bold tabular-nums shadow-lg border border-[#D4A63A]/20">
        {String(value).padStart(2, "0")}
      </div>
      <span className="text-[10px] uppercase tracking-widest text-slate-500 mt-1">{label}</span>
    </div>
  );
}

export function CountdownDisplay({
  targetIso,
  style = "classic",
  label = "Until the celebration",
  begunLabel = "The celebration has begun!",
}: CountdownDisplayProps) {
  const { d, h, m, s, begun } = useCountdown(targetIso, begunLabel);

  if (begun) {
    return (
      <div className="rounded-2xl bg-[#0B8A83] text-white p-6 text-center">
        <p className="font-display text-lg">{begunLabel}</p>
      </div>
    );
  }

  if (style === "flip") {
    return (
      <div className="rounded-2xl border border-slate-200/80 bg-white/90 backdrop-blur p-6 text-center shadow-sm">
        <p className="text-xs uppercase tracking-widest text-slate-500 mb-4">{label}</p>
        <div className="flex justify-center gap-2 sm:gap-3">
          <FlipUnit value={d} label="Days" />
          <FlipUnit value={h} label="Hours" />
          <FlipUnit value={m} label="Min" />
          <FlipUnit value={s} label="Sec" />
        </div>
      </div>
    );
  }

  if (style === "luxury") {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-[#0F172A] to-[#1a3a38] text-white p-8 text-center shadow-xl border border-[#D4A63A]/30">
        <Clock className="h-6 w-6 mx-auto text-[#D4A63A] mb-3" />
        <p className="text-[10px] uppercase tracking-[0.35em] text-[#D4A63A]/80 mb-4">{label}</p>
        <p className="font-display text-3xl sm:text-4xl font-light tracking-wide text-[#F5E6B8]">
          {d}<span className="text-lg text-white/50 mx-1">d</span>
          {h}<span className="text-lg text-white/50 mx-1">h</span>
          {m}<span className="text-lg text-white/50 mx-1">m</span>
        </p>
      </div>
    );
  }

  if (style === "ring" || style === "circular") {
    const total = d * 24 + h;
    const pct = Math.min(100, Math.max(0, 100 - (total / (30 * 24)) * 100));
    return (
      <div className="rounded-2xl border bg-white p-6 text-center shadow-sm">
        <p className="text-xs uppercase tracking-widest text-slate-500 mb-4">{label}</p>
        <div className="relative w-32 h-32 mx-auto mb-3">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke="#e2e8f0" strokeWidth="8" />
            <circle cx="50" cy="50" r="42" fill="none" stroke="#0B8A83" strokeWidth="8" strokeDasharray={`${pct * 2.64} 264`} strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center font-display text-xl font-bold text-[#0F172A]">
            {d}d {h}h
          </div>
        </div>
        <p className="text-sm text-slate-600">{m}m {s}s remaining</p>
      </div>
    );
  }

  if (style === "minimal") {
    return (
      <div className="text-center py-4">
        <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400 mb-2">{label}</p>
        <p className="font-display text-2xl text-[#0F172A] tabular-nums">{d} · {h} · {m} · {s}</p>
      </div>
    );
  }

  if (style === "glass") {
    return (
      <div className="rounded-2xl border border-white/40 bg-white/25 backdrop-blur-xl p-6 text-center shadow-lg">
        <p className="text-[10px] uppercase tracking-widest text-slate-600 mb-3">{label}</p>
        <div className="flex justify-center gap-4 text-[#0F172A] font-display text-xl font-semibold tabular-nums">
          <span>{d}<small className="text-xs text-slate-500 ml-0.5">d</small></span>
          <span>{h}<small className="text-xs text-slate-500 ml-0.5">h</small></span>
          <span>{m}<small className="text-xs text-slate-500 ml-0.5">m</small></span>
          <span>{s}<small className="text-xs text-slate-500 ml-0.5">s</small></span>
        </div>
      </div>
    );
  }

  if (style === "gold-royal") {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-[#1a1a2e] via-[#0F172A] to-[#0a3d38] p-8 text-center border-2 border-[#D4A63A]/40 shadow-xl">
        <p className="text-[10px] uppercase tracking-[0.4em] text-[#D4A63A] mb-4">{label}</p>
        <div className="flex justify-center gap-3 sm:gap-5">
          {[
            { v: d, l: "Days" },
            { v: h, l: "Hours" },
            { v: m, l: "Min" },
            { v: s, l: "Sec" },
          ].map(({ v, l }) => (
            <div key={l} className="flex flex-col items-center">
              <span className="font-display text-2xl sm:text-3xl font-bold text-[#F5E6B8] tabular-nums">{v}</span>
              <span className="text-[9px] uppercase tracking-widest text-[#D4A63A]/70 mt-1">{l}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // classic
  return (
    <div className="rounded-2xl bg-[#0F172A] text-white p-6 text-center inv-countdown-pulse">
      <Clock className="h-6 w-6 mx-auto text-[#D4A63A] mb-2" />
      <p className="text-xs uppercase tracking-widest text-white/60">{label}</p>
      <p className="font-display text-2xl font-bold mt-2">{d}d {h}h {m}m</p>
    </div>
  );
}
