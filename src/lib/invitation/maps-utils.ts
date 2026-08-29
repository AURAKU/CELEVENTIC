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

function isAbsoluteHttpUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

export function isGoogleMapsUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    if (host === "maps.app.goo.gl" || host.endsWith(".app.goo.gl")) return true;
    if (host === "goo.gl" && parsed.pathname.startsWith("/maps")) return true;
    if (host.startsWith("maps.google.")) return true;
    return host.includes("google.") && parsed.pathname.includes("/maps");
  } catch {
    return false;
  }
}

function mapsHrefHasLocation(url: string): boolean {
  try {
    const parsed = new URL(url);
    return Boolean(
      parsed.searchParams.get("query") ||
        parsed.searchParams.get("q") ||
        parsed.searchParams.get("destination") ||
        parsed.searchParams.get("query_place_id") ||
        /\/maps\/place\//i.test(parsed.pathname) ||
        /\/maps\/@/.test(parsed.pathname) ||
        parsed.hostname.toLowerCase() === "maps.app.goo.gl"
    );
  } catch {
    return false;
  }
}

function mapsSearchOrDirectionsHref(label: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(label)}`;
}

/**
 * Always an absolute Google Maps URL that includes the venue, never a same-origin path.
 * Prefers a real maps link when it already names a place; otherwise searches the location.
 */
export function resolveMapsLocationHref(options: {
  mapsUrl?: string | null;
  mapsLink?: string | null;
  locationName?: string | null;
  venueName?: string | null;
  address?: string | null;
  landmark?: string | null;
}): string {
  const label = [
    options.locationName || options.venueName,
    options.address || options.landmark,
  ]
    .filter(Boolean)
    .join(", ")
    .trim();
  const maps = normalizeExternalHref(options.mapsUrl || options.mapsLink);
  if (maps && isAbsoluteHttpUrl(maps) && isGoogleMapsUrl(maps) && mapsHrefHasLocation(maps)) {
    return maps;
  }
  if (label) return mapsSearchOrDirectionsHref(label);
  if (maps && isAbsoluteHttpUrl(maps) && isGoogleMapsUrl(maps)) return maps;
  return "";
}

/** Resolve Google Maps directions URL from event location fields. */
export function buildDirectionsUrl(options: {
  mapsLink?: string | null;
  venueName?: string | null;
  landmark?: string | null;
}): string | null {
  return (
    resolveMapsLocationHref({
      mapsLink: options.mapsLink,
      venueName: options.venueName,
      landmark: options.landmark,
    }) || null
  );
}

export function hasLocationData(options: {
  mapsLink?: string | null;
  venueName?: string | null;
  landmark?: string | null;
}): boolean {
  return Boolean(buildDirectionsUrl(options));
}
