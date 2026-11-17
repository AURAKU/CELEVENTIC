"use client";

import { useEffect, useMemo, useState } from "react";

type EventCountdownProps = {
  startAtIso: string | null | undefined;
  label?: string;
  tone?: "light" | "dark" | "solemn";
};

function partsUntil(targetMs: number, nowMs: number) {
  const delta = Math.max(0, targetMs - nowMs);
  const totalSec = Math.floor(delta / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  return { days, hours, minutes, seconds, done: delta <= 0 };
}

export function Experience3EventCountdown({
  startAtIso,
  label = "Begins in",
  tone = "light",
}: EventCountdownProps) {
  const targetMs = useMemo(() => {
    if (!startAtIso) return null;
    const ms = Date.parse(startAtIso);
    return Number.isFinite(ms) ? ms : null;
  }, [startAtIso]);

  const [now, setNow] = useState(() => Date.now());
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!targetMs || reducedMotion) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [targetMs, reducedMotion]);

  if (!targetMs) return null;

  const { days, hours, minutes, seconds, done } = partsUntil(targetMs, now);
  if (done) return null;

  const muted = tone === "dark" ? "#a8a29e" : "#78716c";
  const fg = tone === "dark" ? "#f5f5f4" : "#1c1917";

  return (
    <section aria-label={label} style={{ textAlign: "center" }}>
      <p
        style={{
          fontSize: "0.65rem",
          letterSpacing: "0.3em",
          textTransform: "uppercase",
          color: muted,
          marginBottom: "0.75rem",
        }}
      >
        {label}
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: "0.5rem",
          color: fg,
        }}
      >
        {[
          ["Days", days],
          ["Hours", hours],
          ["Min", minutes],
          ["Sec", reducedMotion ? 0 : seconds],
        ].map(([name, value]) => (
          <div key={String(name)}>
            <div style={{ fontSize: "1.35rem", fontVariantNumeric: "tabular-nums" }}>
              {String(value).padStart(2, "0")}
            </div>
            <div style={{ fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", color: muted }}>
              {name}
            </div>
          </div>
        ))}
      </div>
      {reducedMotion ? (
        <p style={{ marginTop: "0.5rem", fontSize: "0.7rem", color: muted }}>
          Live seconds paused for reduced motion.
        </p>
      ) : null}
    </section>
  );
}
