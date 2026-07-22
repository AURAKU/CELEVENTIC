/**
 * Ride-hailing deep links for the smart map block. Ghana reality: landmarks
 * beat street addresses, so Uber gets the formatted address; Bolt requires
 * coordinates, so it only appears when the maps link carries a lat/lng.
 */

export function buildUberDeepLink(options: { address: string }): string {
  const url = new URL("https://m.uber.com/ul/");
  url.searchParams.set("action", "setPickup");
  url.searchParams.set("pickup", "my_location");
  url.searchParams.set("dropoff[formatted_address]", options.address);
  return url.toString();
}

export function buildBoltDeepLink(options: { lat: number; lng: number }): string {
  const url = new URL("https://bolt.onelink.me/8HD5");
  url.searchParams.set("deep_link_value", "taxify://action/ride");
  url.searchParams.set("destination_lat", String(options.lat));
  url.searchParams.set("destination_lng", String(options.lng));
  return url.toString();
}

/** Extract lat/lng from common Google Maps URL shapes (@lat,lng or q=lat,lng). */
export function parseLatLngFromMapsLink(mapsLink?: string | null): { lat: number; lng: number } | null {
  if (!mapsLink) return null;
  const at = mapsLink.match(/@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/);
  const q = mapsLink.match(/[?&]q=(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/);
  const match = at ?? q;
  if (!match) return null;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}
