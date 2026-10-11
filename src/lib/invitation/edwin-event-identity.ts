/** Titles that mean the same Edwin & Lordina wedding on the events list. */
const EDWIN_EVENT_NAMES = new Set(["edwin & lordina", "edwin and lordina"]);

export function isEdwinLordinaEventName(value: string | null | undefined): boolean {
  const name = value?.trim().toLowerCase();
  return Boolean(name && EDWIN_EVENT_NAMES.has(name));
}

/** A second platform event for this couple, not the canonical slug. */
export function isDuplicateEdwinEvent(event: {
  id: string;
  slug: string;
  title: string | null;
  hostName: string | null;
}, canonicalEventId: string): boolean {
  if (event.id === canonicalEventId) return false;
  if (event.slug === "edwin-and-lordina") return false;
  return isEdwinLordinaEventName(event.title) || isEdwinLordinaEventName(event.hostName);
}
