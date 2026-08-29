/** Make Maps / web CTAs absolute https so they never resolve as a same-origin 404. */
export function normalizeExternalHref(url: string | null | undefined): string {
  const trimmed = url?.trim() ?? "";
  if (!trimmed) return "";
  if (/^(javascript|data|vbscript):/i.test(trimmed)) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  if (/^(www\.)?(google\.|maps\.google|goo\.gl|maps\.app\.goo)/i.test(trimmed)) {
    return `https://${trimmed.replace(/^\/+/, "")}`;
  }
  return trimmed;
}

/** Resolve Google Maps directions URL from event location fields. */
export function buildDirectionsUrl(options: {
  mapsLink?: string | null;
  venueName?: string | null;
  landmark?: string | null;
}): string | null {
  const { mapsLink, venueName, landmark } = options;
  const label = [venueName, landmark].filter(Boolean).join(", ").trim();
  const maps = normalizeExternalHref(mapsLink);
  if (maps) return maps;
  // Destination-only directions: opens Google Maps with route to the venue.
  if (label) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(label)}`;
  }
  return null;
}

export function hasLocationData(options: {
  mapsLink?: string | null;
  venueName?: string | null;
  landmark?: string | null;
}): boolean {
  return Boolean(buildDirectionsUrl(options));
}
