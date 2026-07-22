"use client";

import { useEffect, useState } from "react";

export interface CountdownParts {
  d: number;
  h: number;
  m: number;
  s: number;
  begun: boolean;
}

/** Headless 1s-tick countdown to an ISO timestamp. */
export function useCountdown(targetIso: string): CountdownParts {
  const [parts, setParts] = useState<CountdownParts>({ d: 0, h: 0, m: 0, s: 0, begun: false });

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

  return parts;
}
