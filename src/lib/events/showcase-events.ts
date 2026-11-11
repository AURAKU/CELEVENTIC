/** Couple invitations that must stay on organiser Recent Events and All Events. */
export const SHOWCASE_EVENT_TITLES = ["Kojo & Fafa", "Edwin & Lordina"] as const;

export function isShowcaseEventTitle(title: string): boolean {
  const value = title.trim().toLowerCase();
  return SHOWCASE_EVENT_TITLES.some((item) => item.toLowerCase() === value);
}

export function showcaseTitleList(): string[] {
  return [...SHOWCASE_EVENT_TITLES];
}

/**
 * Put showcase couple events first, then the rest, without duplicates.
 * Used by Recent Events and page 1 of All Events.
 */
export function mergeShowcaseEvents<T extends { id: string; title: string }>(
  showcase: T[],
  rest: T[],
  limit: number
): T[] {
  const orderedShowcase = SHOWCASE_EVENT_TITLES.map((title) =>
    showcase.find((event) => event.title.trim().toLowerCase() === title.toLowerCase())
  ).filter((event): event is T => Boolean(event));
  const seen = new Set(orderedShowcase.map((event) => event.id));
  const out = [...orderedShowcase];
  for (const event of rest) {
    if (seen.has(event.id)) continue;
    seen.add(event.id);
    out.push(event);
    if (out.length >= limit) break;
  }
  return out.slice(0, limit);
}
