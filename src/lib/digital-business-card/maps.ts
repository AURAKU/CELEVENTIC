export type CeleCardPlace = {
  href: string;
  embedUrl: string | null;
  label: string;
  provider: string;
  lat: number | null;
  lng: number | null;
  geoHref: string | null;
};

const COORD = "(-?\\d+(?:\\.\\d+)?)";
const AT_COORDS = new RegExp(`@${COORD},${COORD}`);
const GEO_COORDS = new RegExp(`^geo:${COORD},${COORD}`, "i");
const PAIR_COORDS = new RegExp(`^${COORD}\\s*,\\s*${COORD}$`);

type MapKind =
  | "google"
  | "apple"
  | "amap"
  | "baidu"
  | "bing"
  | "waze"
  | "osm"
  | "yandex"
  | "here"
  | "tencent"
  | "naver"
  | "mapbox"
  | "citymapper"
  | "mapsme"
  | "petal"
  | "twogis"
  | "komoot"
  | "what3words";

const PROVIDER_NAME: Record<MapKind, string> = {
  google: "Google Maps",
  apple: "Apple Maps",
  amap: "Amap",
  baidu: "Baidu Maps",
  bing: "Bing Maps",
  waze: "Waze",
  osm: "OpenStreetMap",
  yandex: "Yandex Maps",
  here: "HERE WeGo",
  tencent: "Tencent Maps",
  naver: "Naver Map",
  mapbox: "Mapbox",
  citymapper: "Citymapper",
  mapsme: "MAPS.ME",
  petal: "Petal Maps",
  twogis: "2GIS",
  komoot: "Komoot",
  what3words: "what3words",
};

function stripHost(host: string): string {
  return host.replace(/^www\./i, "").toLowerCase();
}

function hostEnds(host: string, suffix: string): boolean {
  return host === suffix || host.endsWith(`.${suffix}`);
}

function mapKindFromUrl(url: URL): MapKind | null {
  const host = stripHost(url.hostname);
  const path = `${url.pathname}${url.search}`.toLowerCase();

  if (host === "ditu.google.cn" || host === "maps.google.cn") return "google";
  if (host === "maps.app.goo.gl" || host === "g.page" || host === "g.co") return "google";
  if (host === "goo.gl" && path.startsWith("/maps")) return "google";
  if (host.startsWith("maps.google.")) return "google";
  if (/(^|\.)google(\.[a-z]{2,8}){1,2}$/.test(host) && (host.startsWith("maps.") || path.includes("/maps"))) {
    return "google";
  }

  if (host === "maps.apple.com") return "apple";

  if (
    hostEnds(host, "amap.com") ||
    hostEnds(host, "gaode.com") ||
    host === "ditu.amap.com" ||
    host === "uri.amap.com" ||
    host === "surl.amap.com"
  ) {
    return "amap";
  }

  if (hostEnds(host, "map.baidu.com") || host === "j.map.baidu.com" || host === "maps.baidu.com") return "baidu";
  if (hostEnds(host, "baidu.com") && path.includes("/maps")) return "baidu";

  if (hostEnds(host, "bing.com") && (path.includes("/maps") || url.searchParams.has("cp"))) return "bing";

  if (hostEnds(host, "waze.com")) return "waze";

  if (hostEnds(host, "openstreetmap.org") || host === "osm.org") return "osm";

  if (/(^|\.)yandex\.(com|ru|by|kz|ua)$/.test(host) && path.includes("/maps")) return "yandex";

  if (hostEnds(host, "here.com") || host.startsWith("wego.here.") || host.startsWith("share.here.")) return "here";

  if (host === "map.qq.com" || host === "map.weixin.qq.com") return "tencent";

  if (host === "map.naver.com" || host === "naver.me") return "naver";

  if (hostEnds(host, "mapbox.com")) return "mapbox";

  if (hostEnds(host, "citymapper.com")) return "citymapper";

  if (host === "maps.me" || host === "ge0.me") return "mapsme";

  if (hostEnds(host, "petalmaps.com")) return "petal";

  if (hostEnds(host, "2gis.com") || hostEnds(host, "2gis.ru")) return "twogis";

  if (hostEnds(host, "komoot.com")) return "komoot";

  if (hostEnds(host, "what3words.com") || host === "w3w.co") return "what3words";

  if (hostEnds(host, "mapquest.com")) return "bing";
  if (hostEnds(host, "tomtom.com") && path.includes("maps")) return "here";
  if (host === "ditu.google.cn" || host.startsWith("maps.google.")) return "google";

  return null;
}

function parseNumber(raw: string | null | undefined): number | null {
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function asCoords(lat: number | null, lng: number | null): { lat: number; lng: number } | null {
  if (lat == null || lng == null) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

function coordsFromText(text: string): { lat: number; lng: number } | null {
  const at = text.match(AT_COORDS);
  if (at) {
    const coords = asCoords(parseNumber(at[1]), parseNumber(at[2]));
    if (coords) return coords;
  }
  const geo = text.match(GEO_COORDS);
  if (geo) {
    const coords = asCoords(parseNumber(geo[1]), parseNumber(geo[2]));
    if (coords) return coords;
  }
  return null;
}

function coordsFromUrl(url: URL): { lat: number; lng: number } | null {
  const fromHref = coordsFromText(`${url.pathname}${url.search}${url.hash}`);
  if (fromHref) return fromHref;

  const hashMap = url.hash.match(new RegExp(`map=\\d+\\/${COORD}\\/${COORD}`));
  if (hashMap) {
    const coords = asCoords(parseNumber(hashMap[1]), parseNumber(hashMap[2]));
    if (coords) return coords;
  }

  const keys = ["q", "query", "ll", "center", "sll", "daddr", "saddr", "destination", "origin"];
  for (const key of keys) {
    const raw = url.searchParams.get(key);
    if (!raw) continue;
    const pair = decodeURIComponent(raw).trim().match(PAIR_COORDS);
    if (!pair) continue;
    const coords = asCoords(parseNumber(pair[1]), parseNumber(pair[2]));
    if (coords) return coords;
  }

  const fromParams = asCoords(
    parseNumber(url.searchParams.get("lat") || url.searchParams.get("latitude")),
    parseNumber(
      url.searchParams.get("lng") ||
        url.searchParams.get("lon") ||
        url.searchParams.get("long") ||
        url.searchParams.get("longitude")
    )
  );
  if (fromParams) return fromParams;

  const cp = url.searchParams.get("cp") || url.searchParams.get("sll");
  if (cp) {
    const parts = cp.split(/[,~]/).map((part) => part.trim());
    if (parts.length >= 2) {
      const coords = asCoords(parseNumber(parts[0]), parseNumber(parts[1]));
      if (coords) return coords;
    }
  }

  const location = url.searchParams.get("location") || url.searchParams.get("position");
  if (location) {
    const pair = location.trim().match(PAIR_COORDS);
    if (pair) {
      const a = parseNumber(pair[1]);
      const b = parseNumber(pair[2]);
      if (url.searchParams.has("position")) {
        const swapped = asCoords(b, a);
        if (swapped) return swapped;
      }
      return asCoords(a, b) ?? asCoords(b, a);
    }
  }

  return null;
}

function decodePathLabel(raw: string): string {
  try {
    return decodeURIComponent(raw.replace(/\+/g, " ")).replace(/_/g, " ").trim();
  } catch {
    return raw.replace(/\+/g, " ").replace(/_/g, " ").trim();
  }
}

function labelFromUrl(url: URL, kind: MapKind, coords: { lat: number; lng: number } | null): string {
  const placePart = url.pathname.split("/").find((part, index, parts) => parts[index - 1] === "place");
  if (placePart && !AT_COORDS.test(placePart) && !/^\d+$/.test(placePart)) {
    const name = decodePathLabel(placePart);
    if (name && name.length >= 2) return name;
  }

  for (const key of ["q", "query", "destination", "daddr", "address", "name", "place", "search"]) {
    const raw = url.searchParams.get(key);
    if (!raw) continue;
    const text = decodePathLabel(raw);
    if (!text || PAIR_COORDS.test(text) || AT_COORDS.test(text)) continue;
    if (text.length >= 2) return text;
  }

  if (kind === "what3words") {
    const words = url.pathname.replace(/^\/+/, "").replace(/^to\//, "");
    if (words.includes(".")) return words;
  }

  if (coords) {
    return `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`;
  }

  return PROVIDER_NAME[kind];
}

function googleEmbed(query: string): string {
  return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=16&output=embed`;
}

function osmEmbed(lat: number, lng: number): string {
  const pad = 0.012;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - pad}%2C${lat - pad}%2C${lng + pad}%2C${lat + pad}&layer=mapnik&marker=${lat}%2C${lng}`;
}

function embedFor(
  kind: MapKind,
  coords: { lat: number; lng: number } | null,
  query: string
): string | null {
  if (coords) return osmEmbed(coords.lat, coords.lng);
  if (kind === "google" || kind === "apple" || kind === "waze" || kind === "osm" || kind === "bing" || kind === "amap" || kind === "here") {
    return googleEmbed(query);
  }
  return googleEmbed(query);
}

function googleSearchHref(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function geoHref(lat: number, lng: number, label: string): string {
  const q = encodeURIComponent(label);
  return `geo:${lat},${lng}?q=${lat},${lng}(${q})`;
}

function looksLikeAddress(value: string): boolean {
  const v = value.trim();
  if (v.length < 5 || v.length > 280) return false;
  if (v.startsWith("@")) return false;
  if (/^mailto:/i.test(v) || /^tel:/i.test(v)) return false;
  if (/^https?:/i.test(v) || /^www\./i.test(v) || /^\/\//.test(v)) return false;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(v)) return false;
  if (!/[A-Za-z\u00C0-\u024F\u0400-\u04FF\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF]/.test(v)) return false;
  if (/^@?[a-z0-9._]{2,32}$/i.test(v)) return false;
  return true;
}

function asUrl(value: string): URL | null {
  const t = value.trim();
  if (!t) return null;
  const geo = t.match(GEO_COORDS);
  if (geo) {
    const coords = asCoords(parseNumber(geo[1]), parseNumber(geo[2]));
    if (!coords) return null;
    return new URL(googleSearchHref(`${coords.lat},${coords.lng}`));
  }
  try {
    if (/^https?:\/\//i.test(t)) return new URL(t);
    if (/^\/\//.test(t)) return new URL(`https:${t}`);
    if (/^(maps\.app\.goo\.gl|surl\.amap\.com|uri\.amap\.com|j\.map\.baidu\.com|maps\.apple\.com|waze\.com|ul\.waze\.com)\b/i.test(t)) {
      return new URL(`https://${t}`);
    }
    if (/^(www\.)?(google|amap|gaode|bing|waze|openstreetmap|yandex|mapbox)/i.test(t) && /maps/i.test(t)) {
      return new URL(`https://${t.replace(/^\/\//, "")}`);
    }
  } catch {
    return null;
  }
  return null;
}

export function parseCeleCardPlace(value: string): CeleCardPlace | null {
  const raw = value.trim();
  if (!raw) return null;

  const geoMatch = raw.match(GEO_COORDS);
  if (geoMatch) {
    const coords = asCoords(parseNumber(geoMatch[1]), parseNumber(geoMatch[2]));
    if (coords) {
      const label = `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`;
      return {
        href: googleSearchHref(`${coords.lat},${coords.lng}`),
        embedUrl: googleEmbed(`${coords.lat},${coords.lng}`),
        label,
        provider: "Maps",
        lat: coords.lat,
        lng: coords.lng,
        geoHref: geoHref(coords.lat, coords.lng, label),
      };
    }
  }

  const url = asUrl(raw);
  if (url) {
    const kind = mapKindFromUrl(url);
    if (!kind) return null;
    const coords = coordsFromUrl(url);
    const href = url.toString();
    const label = labelFromUrl(url, kind, coords);
    const query = coords ? `${coords.lat},${coords.lng}` : label === PROVIDER_NAME[kind] ? href : label;
    return {
      href,
      embedUrl: embedFor(kind, coords, query),
      label,
      provider: PROVIDER_NAME[kind],
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
      geoHref: coords ? geoHref(coords.lat, coords.lng, label) : null,
    };
  }

  if (!looksLikeAddress(raw)) return null;
  return {
    href: googleSearchHref(raw),
    embedUrl: googleEmbed(raw),
    label: raw,
    provider: "Maps",
    lat: null,
    lng: null,
    geoHref: null,
  };
}

export function celeCardPlaceHref(value: string): string {
  return parseCeleCardPlace(value)?.href ?? "";
}

export function isCeleCardPlaceValue(value: string): boolean {
  return Boolean(parseCeleCardPlace(value)?.href);
}
