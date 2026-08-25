/** Parse multi-day / venue hints from programme title & description without schema changes */

const DAY_WORDS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export function inferProgrammeDayLabel(
  title: string,
  description?: string | null,
  index = 0
): string | null {
  const hay = `${title}\n${description ?? ""}`.toLowerCase();
  for (const day of DAY_WORDS) {
    if (new RegExp(`\\b${day}\\b`).test(hay)) {
      return day.charAt(0).toUpperCase() + day.slice(1);
    }
  }
  // Common Ghanaian multi-day order when unlabeled
  const fallback = ["Friday", "Saturday", "Saturday", "Sunday"];
  return fallback[Math.min(index, fallback.length - 1)] ?? null;
}

export function inferVenueFromDescription(description?: string | null): string | null {
  if (!description?.trim()) return null;
  const m = description.match(/(?:at|venue|location)\s*[:\-]?\s*(.+)$/i);
  if (m?.[1]) return m[1].trim().slice(0, 120);
  return null;
}

export function detectLowBandwidth(): boolean {
  if (typeof navigator === "undefined") return false;
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } })
    .connection;
  if (conn?.saveData) return true;
  const et = conn?.effectiveType;
  return et === "slow-2g" || et === "2g";
}

export const HASH_TO_TAB: Record<string, string> = {
  tributes: "tributes",
  candles: "candles",
  guestbook: "guestbook",
  condolences: "guestbook",
  memories: "gallery",
  gallery: "gallery",
  livestream: "livestream",
  livestreams: "livestream",
  contributions: "contribute",
  contribute: "contribute",
  support: "contribute",
  program: "program",
  programme: "program",
  schedule: "program",
  timeline: "timeline",
  seating: "program",
};
