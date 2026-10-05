"use client";

import { useEffect, useState } from "react";

export interface CountdownParts {
  d: number;
  h: number;
  m: number;
  s: number;
  begun: boolean;
  remainingMs: number;
}

function partsFromDiff(diff: number): CountdownParts {
  if (diff <= 0) {
    return { d: 0, h: 0, m: 0, s: 0, begun: true, remainingMs: 0 };
  }
  return {
    d: Math.floor(diff / 86400000),
    h: Math.floor((diff % 86400000) / 3600000),
    m: Math.floor((diff % 3600000) / 60000),
    s: Math.floor((diff % 60000) / 1000),
    begun: false,
    remainingMs: diff,
  };
}

/** Headless 1s-tick countdown to an ISO timestamp. */
export function useCountdown(targetIso: string): CountdownParts {
  const [parts, setParts] = useState<CountdownParts>(() =>
    partsFromDiff(new Date(targetIso).getTime() - Date.now())
  );

  useEffect(() => {
    function tick() {
      setParts(partsFromDiff(new Date(targetIso).getTime() - Date.now()));
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetIso]);

  return parts;
}
