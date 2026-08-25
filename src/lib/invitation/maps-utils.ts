/** Resolve Google Maps directions URL from event location fields. */
export function buildDirectionsUrl(options: {
  mapsLink?: string | null;
  venueName?: string | null;
  landmark?: string | null;
}): string | null {
  const { mapsLink, venueName, landmark } = options;
  const label = [venueName, landmark].filter(Boolean).join(", ").trim();
  if (mapsLink?.trim()) return mapsLink.trim();
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
