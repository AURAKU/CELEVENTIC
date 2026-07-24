/**
 * Parses a single-range `Range: bytes=start-end` header (the only form browsers/video players
 * send for seeking). Returns null for absent/multi-range/unsatisfiable headers, in which case
 * the caller falls back to a normal full-body 200 response.
 */
export function parseRange(rangeHeader: string | null, size: number): { start: number; end: number } | null {
  if (!rangeHeader || !rangeHeader.startsWith("bytes=") || rangeHeader.includes(",")) return null;
  const [startStr, endStr] = rangeHeader.replace("bytes=", "").split("-");
  let start = startStr ? parseInt(startStr, 10) : NaN;
  let end = endStr ? parseInt(endStr, 10) : NaN;

  if (Number.isNaN(start) && !Number.isNaN(end)) {
    // Suffix range, e.g. "bytes=-500" — last 500 bytes.
    start = Math.max(0, size - end);
    end = size - 1;
  } else if (!Number.isNaN(start) && Number.isNaN(end)) {
    end = size - 1;
  }

  if (Number.isNaN(start) || Number.isNaN(end) || start < 0 || end < start || start >= size) return null;
  return { start, end: Math.min(end, size - 1) };
}
