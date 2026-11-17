"use client";

import { useEffect, useState } from "react";
import type { Experience3OpeningStyle } from "@/lib/invitation/studio3/design-families";

type OpeningGateProps = {
  style: Experience3OpeningStyle;
  title: string;
  subtitle?: string | null;
  monogram?: string | null;
  tone: "light" | "dark" | "solemn";
  /** When true, skip animation chrome entirely. */
  forceInstant?: boolean;
  onComplete?: () => void;
};

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return reduced;
}

export function Experience3OpeningGate({
  style,
  title,
  subtitle,
  monogram,
  tone,
  forceInstant = false,
  onComplete,
}: OpeningGateProps) {
  const reducedMotion = usePrefersReducedMotion();
  const instant = forceInstant || reducedMotion || style === "minimal-instant";
  const [open, setOpen] = useState(!instant);

  useEffect(() => {
    if (!open) onComplete?.();
  }, [open, onComplete]);

  if (!open) return null;

  const palette =
    tone === "dark"
      ? { bg: "#070708", fg: "#f5f5f4", muted: "#a8a29e", border: "rgba(245,245,244,0.2)" }
      : tone === "solemn"
        ? { bg: "#efeae3", fg: "#292524", muted: "#78716c", border: "rgba(87,83,78,0.25)" }
        : { bg: "#f7f2ea", fg: "#1c1917", muted: "#78716c", border: "rgba(138,106,61,0.3)" };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center px-6"
      style={{ backgroundColor: palette.bg, color: palette.fg }}
      role="dialog"
      aria-modal="true"
      aria-label="Invitation opening"
    >
      <div className="flex max-w-md flex-col items-center gap-6 text-center">
        {monogram ? (
          <div
            className="flex h-20 w-20 items-center justify-center rounded-full text-xl tracking-[0.2em]"
            style={{ border: `1px solid ${palette.border}` }}
            aria-hidden
          >
            {monogram}
          </div>
        ) : null}
        <div className="space-y-3">
          <p
            className="text-[11px] uppercase tracking-[0.35em]"
            style={{ color: palette.muted }}
          >
            {style === "portrait"
              ? "In loving memory"
              : style === "cinematic"
                ? "You are invited"
                : "An invitation"}
          </p>
          <h1 className="text-3xl font-light leading-tight sm:text-4xl">{title}</h1>
          {subtitle ? (
            <p className="text-sm" style={{ color: palette.muted }}>
              {subtitle}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          className="min-h-11 rounded-full px-8 text-xs uppercase tracking-[0.28em] outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          style={{
            border: `1px solid ${palette.border}`,
            color: palette.fg,
          }}
          onClick={() => setOpen(false)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " " || event.key === "Escape") {
              event.preventDefault();
              setOpen(false);
            }
          }}
        >
          Open invitation
        </button>
        <button
          type="button"
          className="text-[11px] uppercase tracking-[0.22em] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2"
          style={{ color: palette.muted }}
          onClick={() => setOpen(false)}
        >
          Skip
        </button>
      </div>
    </div>
  );
}
