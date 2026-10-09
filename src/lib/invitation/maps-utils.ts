/** Lat/lng pin so Maps never geocodes a nearby-but-wrong neighbourhood. */
export type MapsPin = {
  label: string;
  lat: number;
  lng: number;
};

const COORD_IN_HREF = /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/;
const COORD_PAIR = /(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/;

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

/** Named Google Maps place URL pinned to verified coordinates. */
export function googleMapsPlaceHref(pin: MapsPin): string {
  const slug = encodeURIComponent(pin.label).replace(/%20/g, "+");
  return `https://www.google.com/maps/place/${slug}/@${pin.lat},${pin.lng},17z`;
}

/** Turn-by-turn Google Maps URL to a verified pin. */
export function googleMapsDirectionsHref(pin: MapsPin): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    `${pin.lat},${pin.lng}`
  )}`;
}

export function extractMapsCoordinates(
  url: string | null | undefined
): { lat: number; lng: number } | null {
  const link = normalizeExternalHref(url);
  if (!link) return null;
  try {
    const parsed = new URL(link);
    const at = parsed.pathname.match(COORD_IN_HREF) || parsed.href.match(COORD_IN_HREF);
    if (at) {
      const lat = Number(at[1]);
      const lng = Number(at[2]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    }
    for (const key of ["query", "q", "destination", "ll", "center"]) {
      const raw = parsed.searchParams.get(key);
      const pair = raw?.match(COORD_PAIR);
      if (!pair) continue;
      const lat = Number(pair[1]);
      const lng = Number(pair[2]);
      if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng };
    }
  } catch {
    return null;
  }
  return null;
}

/** Prefer coordinates so embeds never follow a fuzzy text geocode. */
export function extractMapsQuery(url: string | null | undefined, fallback = ""): string {
  const coords = extractMapsCoordinates(url);
  if (coords) return `${coords.lat},${coords.lng}`;
  const link = normalizeExternalHref(url);
  if (!link) return fallback;
  try {
    const parsed = new URL(link);
    const fromParams =
      parsed.searchParams.get("query") ||
      parsed.searchParams.get("q") ||
      parsed.searchParams.get("destination");
    if (fromParams) return fromParams;
    const place = parsed.pathname.match(/\/maps\/place\/([^/@]+)/);
    if (place?.[1]) return decodeURIComponent(place[1].replace(/\+/g, " "));
  } catch {
    /* keep fallback */
  }
  return fallback;
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
        /\/maps\/dir\//i.test(parsed.pathname) ||
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

/** Web-mercator tile position. `x` and `y` are in tile units at `zoom`. */
export function webMercatorTile(
  lat: number,
  lng: number,
  zoom: number
): { x: number; y: number } {
  const n = 2 ** zoom;
  const x = ((lng + 180) / 360) * n;
  const rad = (lat * Math.PI) / 180;
  const y = ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n;
  return { x, y };
}

/** Open turn-by-turn to the pin when we have coordinates; otherwise the maps link. */
export function toGoogleMapsDirectionsHref(
  mapsUrl?: string | null,
  fallbackLabel?: string | null
): string {
  const coords = extractMapsCoordinates(mapsUrl);
  if (coords) return googleMapsDirectionsHref({ label: fallbackLabel?.trim() || "", ...coords });
  return resolveMapsLocationHref({ mapsUrl, locationName: fallbackLabel });
}
