"use client";

import { useEffect, useState } from "react";
import type { Experience3OpeningStyle } from "@/lib/invitation/studio3/design-families";
import styles from "./opening-gate.module.css";

function cssUrl(url: string): string {
  return url.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

type OpeningGateProps = {
  style: Experience3OpeningStyle;
  title: string;
  subtitle?: string | null;
  monogram?: string | null;
  portraitUrl?: string | null;
  tone: "light" | "dark" | "solemn";
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
  portraitUrl,
  tone,
  forceInstant = false,
  onComplete,
}: OpeningGateProps) {
  const reducedMotion = usePrefersReducedMotion();
  /** Prefer non-instant first paint so SSR/CSR match; apply reduced-motion after mount. */
  const [open, setOpen] = useState(() => !(forceInstant || style === "minimal-instant"));

  useEffect(() => {
    if (forceInstant || style === "minimal-instant" || reducedMotion) {
      setOpen(false);
    }
  }, [forceInstant, style, reducedMotion]);

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

  const eyebrow =
    style === "portrait"
      ? "In loving memory"
      : style === "cinematic"
        ? "You are invited"
        : style === "envelope"
          ? "An invitation awaits"
          : "An invitation";

  return (
    <div
      className={styles.gate}
      style={{ backgroundColor: palette.bg, color: palette.fg }}
      role="dialog"
      aria-modal="true"
      aria-label="Invitation opening"
    >
      <div className={styles.panel}>
        {style === "portrait" && portraitUrl ? (
          <div
            className={styles.portrait}
            style={{
              border: `1px solid ${palette.border}`,
              backgroundImage: `url("${cssUrl(portraitUrl)}")`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
            role="img"
            aria-label="Portrait"
          />
        ) : monogram ? (
          <div
            className={styles.monogram}
            style={{ border: `1px solid ${palette.border}` }}
            aria-hidden
          >
            {monogram}
          </div>
        ) : null}
        <div className="space-y-3">
          <p className="text-[11px] uppercase tracking-[0.35em]" style={{ color: palette.muted }}>
            {eyebrow}
          </p>
          <p className="text-3xl font-light leading-tight sm:text-4xl" role="heading" aria-level={1}>
            {title}
          </p>
          {subtitle ? (
            <p className="text-sm" style={{ color: palette.muted }}>
              {subtitle}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          className={styles.primary}
          style={{
            border: `1px solid ${palette.border}`,
            color: palette.fg,
            borderRadius: 999,
            paddingInline: "2rem",
            fontSize: "0.7rem",
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            background: "transparent",
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
          className={styles.skip}
          style={{
            color: palette.muted,
            fontSize: "0.68rem",
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            background: "transparent",
            border: 0,
            textDecoration: "underline",
            textUnderlineOffset: 4,
          }}
          onClick={() => setOpen(false)}
        >
          Skip
        </button>
      </div>
    </div>
  );
}
