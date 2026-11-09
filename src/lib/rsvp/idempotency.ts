export interface LatestRsvpSnapshot {
  response: string;
  message: string | null;
}

/** Identical response + message is a duplicate submit, not a new planning signal. */
export function shouldReuseLatestRsvp(
  latest: LatestRsvpSnapshot | null | undefined,
  next: { response: string; message?: string | null }
): boolean {
  if (!latest) return false;
  if (latest.response !== next.response) return false;
  return (latest.message ?? "") === (next.message ?? "");
}
