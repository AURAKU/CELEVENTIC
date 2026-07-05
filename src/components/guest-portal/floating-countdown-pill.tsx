"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

interface FloatingCountdownPillProps {
  targetIso: string;
  label?: string;
  begunLabel?: string;
}

export function FloatingCountdownPill({
  targetIso,
  label = "Until the celebration",
  begunLabel = "The celebration has begun!",
}: FloatingCountdownPillProps) {
  const [left, setLeft] = useState("");
  const [begun, setBegun] = useState(false);

  useEffect(() => {
    function tick() {
      const diff = new Date(targetIso).getTime() - Date.now();
      if (diff <= 0) {
        setBegun(true);
        setLeft(begunLabel);
        return;
      }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setLeft(`${d}d ${h}h ${m}m`);
    }
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [targetIso, begunLabel]);

  if (!targetIso) return null;

  return (
    <div
      className={`fixed safe-area-inset-top safe-area-inset-right z-40 flex items-center gap-2 px-3 py-2 rounded-full shadow-md border backdrop-blur-xl max-w-[min(220px,calc(100vw-5rem))] ${
        begun
          ? "bg-[#0B8A83]/90 border-[#0B8A83] text-white"
          : "bg-white/92 border-[#D4A63A]/25 text-[#0F172A]"
      }`}
    >
      <Clock className={`h-3.5 w-3.5 shrink-0 ${begun ? "text-white" : "text-[#D4A63A]"}`} />
      <div className="text-left min-w-0">
        <p className="text-[10px] uppercase tracking-widest opacity-70 leading-none truncate">{label}</p>
        <p className="text-sm font-semibold tabular-nums leading-tight truncate">{left}</p>
      </div>
    </div>
  );
}
