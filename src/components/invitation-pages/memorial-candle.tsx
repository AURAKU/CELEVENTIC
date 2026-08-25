"use client";

import { useEffect, useState } from "react";

type MemorialCandleProps = {
  side: "left" | "right";
  /** Stagger light-up so left/right feel ceremonial. */
  delayMs?: number;
};

/**
 * Soft white memorial candle with a lit-flame entrance and gentle flicker.
 * Decorative — prefers-reduced-motion keeps a steady glow without flicker.
 */
export function MemorialCandle({ side, delayMs = 0 }: MemorialCandleProps) {
  const [lit, setLit] = useState(false);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setLit(true);
      return;
    }
    const id = window.setTimeout(() => setLit(true), delayMs);
    return () => window.clearTimeout(id);
  }, [delayMs]);

  return (
    <div
      className={`inv-memorial-candle inv-memorial-candle--${side}${lit ? " is-lit" : ""}`}
      aria-hidden
    >
      <span className="inv-memorial-candle-glow" />
      <span className="inv-memorial-candle-flame">
        <span className="inv-memorial-candle-flame-core" />
        <span className="inv-memorial-candle-flame-outer" />
      </span>
      <span className="inv-memorial-candle-wick" />
      <span className="inv-memorial-candle-body">
        <span className="inv-memorial-candle-drip inv-memorial-candle-drip--a" />
        <span className="inv-memorial-candle-drip inv-memorial-candle-drip--b" />
      </span>
      <span className="inv-memorial-candle-holder" />
    </div>
  );
}
