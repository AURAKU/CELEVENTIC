/** The glass drains across this wait. Longer waits stay full above until they enter it. */
export const SERAPHINE_HOURGLASS_MS = 120 * 24 * 60 * 60 * 1000;

/**
 * Share of sand still above the neck, and the share already resting below.
 * When the hour arrives the lower chamber is completely full.
 */
export function hourglassSandLevel(remainingMs: number, begun: boolean) {
  if (begun || remainingMs <= 0) return { remain: 0, spent: 1 };
  const remain = Math.min(1, Math.max(0, remainingMs / SERAPHINE_HOURGLASS_MS));
  return { remain, spent: 1 - remain };
}
