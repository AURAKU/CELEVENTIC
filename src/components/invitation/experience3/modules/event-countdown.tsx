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

  /** null until mounted — avoids Date.now() hydration mismatch. */
  const [now, setNow] = useState<number | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setNow(Date.now());
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!targetMs || reducedMotion || now === null) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [targetMs, reducedMotion, now]);

  if (!targetMs) return null;

  const muted = tone === "dark" ? "#a8a29e" : "#78716c";
  const fg = tone === "dark" ? "#f5f5f4" : "#1c1917";
  const chip =
    tone === "dark" ? "rgba(245,245,244,0.06)" : "rgba(28,25,23,0.035)";
  const line =
    tone === "dark" ? "rgba(245,245,244,0.16)" : "rgba(28,25,23,0.1)";
  const parts = now === null ? null : partsUntil(targetMs, now);
  if (parts?.done) return null;

  const cells: Array<[string, string]> = parts
    ? [
        ["Days", String(parts.days).padStart(2, "0")],
        ["Hours", String(parts.hours).padStart(2, "0")],
        ["Min", String(parts.minutes).padStart(2, "0")],
        ["Sec", String(reducedMotion ? 0 : parts.seconds).padStart(2, "0")],
      ]
    : [
        ["Days", "––"],
        ["Hours", "––"],
        ["Min", "––"],
        ["Sec", "––"],
      ];

  return (
    <section aria-label={label} style={{ textAlign: "center" }}>
      <p
        style={{
          fontFamily: "var(--ix3-eyebrow, ui-sans-serif, system-ui, sans-serif)",
          fontSize: "0.65rem",
          letterSpacing: "0.3em",
          textTransform: "uppercase",
          color: muted,
          marginBottom: "0.85rem",
        }}
      >
        {label}
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: "0.55rem",
          color: fg,
        }}
        aria-live="polite"
      >
        {cells.map(([name, value]) => (
          <div
            key={name}
            style={{
              border: `1px solid ${line}`,
              background: chip,
              borderRadius: "0.85rem",
              padding: "0.7rem 0.35rem",
            }}
          >
            <div
              style={{
                fontFamily: "var(--ix3-heading, Georgia, serif)",
                fontSize: "1.35rem",
                fontVariantNumeric: "tabular-nums",
                lineHeight: 1.1,
              }}
            >
              {value}
            </div>
            <div
              style={{
                marginTop: "0.35rem",
                fontFamily: "var(--ix3-eyebrow, ui-sans-serif, system-ui, sans-serif)",
                fontSize: "0.58rem",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: muted,
              }}
            >
              {name}
            </div>
          </div>
        ))}
      </div>
      {reducedMotion ? (
        <p style={{ marginTop: "0.55rem", fontSize: "0.7rem", color: muted }}>
          Live seconds paused for reduced motion.
        </p>
      ) : null}
    </section>
  );
}
