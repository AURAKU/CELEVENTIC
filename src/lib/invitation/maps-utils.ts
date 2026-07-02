/** Resolve Google Maps directions URL from event location fields. */
export function buildDirectionsUrl(options: {
  mapsLink?: string | null;
  venueName?: string | null;
  landmark?: string | null;
}): string | null {
  const { mapsLink, venueName, landmark } = options;
  const label = [venueName, landmark].filter(Boolean).join(" · ").trim();
  if (mapsLink?.trim()) return mapsLink.trim();
  if (label) return `https://maps.google.com/maps?q=${encodeURIComponent(label)}`;
  return null;
}

export function hasLocationData(options: {
  mapsLink?: string | null;
  venueName?: string | null;
  landmark?: string | null;
}): boolean {
  return Boolean(buildDirectionsUrl(options));
}
