/**
 * Celeventic Event Guide — offline service worker (Level 1).
 *
 * Scope is `/event-guide/` only. It can never see the dashboard, the organizer
 * APIs, or another product surface.
 *
 * Caching rules, mirrored from `src/lib/event-guide/offline-cache.ts`:
 *
 *  - Cache name is `event-guide:v1:<publicToken>:<publishedVersion>`, so two
 *    events never share a cache and a republish never serves stale content.
 *  - Only the guide shell, its chunks, the published payload and approved
 *    public images/fonts are cached.
 *  - Seating requests are network-only. A guest list must never sit in a
 *    browser cache, so the seating endpoint is explicitly excluded.
 *  - A `410` on the payload means the guide was retired: every cache for that
 *    token is deleted immediately.
 *
 * Keep this file dependency-free — it is served as a static asset.
 */

const CACHE_PREFIX = "event-guide";
const CACHE_SCHEMA = "v1";
const PAYLOAD_PREFIX = "/api/public/event-guide/";
const GUIDE_PATH_PREFIX = "/event-guide/";

/** token -> version for the guides this client has actually opened. */
const activeGuides = new Map();

function cacheName(token, version) {
  return `${CACHE_PREFIX}:${CACHE_SCHEMA}:${token}:${version}`;
}

function parseCacheName(name) {
  const parts = name.split(":");
  if (parts.length !== 4 || parts[0] !== CACHE_PREFIX) return null;
  const version = Number(parts[3]);
  if (!Number.isFinite(version)) return null;
  return { schema: parts[1], token: parts[2], version };
}

function tokenFromPath(pathname) {
  if (pathname.startsWith(PAYLOAD_PREFIX)) {
    return decodeURIComponent(pathname.slice(PAYLOAD_PREFIX.length).split("/")[0] || "");
  }
  if (pathname.startsWith(GUIDE_PATH_PREFIX)) {
    return decodeURIComponent(pathname.slice(GUIDE_PATH_PREFIX.length).split("/")[0] || "");
  }
  return "";
}

function isSeatingRequest(url) {
  return url.pathname.startsWith(PAYLOAD_PREFIX) && url.pathname.endsWith("/seating");
}

function isViewBeacon(url) {
  return url.pathname.startsWith(PAYLOAD_PREFIX) && url.pathname.endsWith("/view");
}

function isPayloadRequest(url) {
  return (
    url.pathname.startsWith(PAYLOAD_PREFIX) && !isSeatingRequest(url) && !isViewBeacon(url)
  );
}

/** Static assets worth keeping: the route's own chunks, fonts and images. */
function isCacheableAsset(url) {
  if (url.origin !== self.location.origin) return false;
  if (url.pathname.startsWith("/api/")) return false;
  if (url.pathname.startsWith("/dashboard") || url.pathname.startsWith("/admin")) return false;
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/brand/") ||
    url.pathname.startsWith("/uploads/") ||
    /\.(?:css|js|woff2?|ttf|otf|png|jpe?g|webp|avif|svg|gif)$/i.test(url.pathname)
  );
}

async function dropCachesForToken(token) {
  const names = await caches.keys();
  await Promise.all(
    names
      .filter((name) => parseCacheName(name)?.token === token)
      .map((name) => caches.delete(name))
  );
  activeGuides.delete(token);
}

/**
 * Keep one cache per known guide and delete everything else, including caches
 * from an older schema and from guides this client no longer visits.
 */
async function pruneCaches() {
  const names = await caches.keys();
  const keep = new Set(
    [...activeGuides.entries()].map(([token, version]) => cacheName(token, version))
  );
  await Promise.all(
    names
      .filter((name) => parseCacheName(name) && !keep.has(name))
      .map((name) => caches.delete(name))
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      await pruneCaches();
      await self.clients.claim();
    })()
  );
});

self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "activate-guide" && data.publicToken) {
    const previous = activeGuides.get(data.publicToken);
    activeGuides.set(data.publicToken, Number(data.version) || 0);
    if (previous !== undefined && previous !== Number(data.version)) {
      event.waitUntil(pruneCaches());
    }
  }
  if (data.type === "purge-guide" && data.publicToken) {
    event.waitUntil(dropCachesForToken(data.publicToken));
  }
});

/**
 * Payload: network first so a republish lands immediately, cache as the
 * offline fallback. A `410` purges rather than caches.
 */
async function handlePayload(request, url) {
  const token = tokenFromPath(url.pathname);

  try {
    const response = await fetch(request);

    if (response.status === 410) {
      await dropCachesForToken(token);
      return response;
    }

    if (response.ok) {
      const version = Number(response.headers.get("X-Guide-Version"));
      if (Number.isFinite(version) && version > 0) {
        activeGuides.set(token, version);
        const cache = await caches.open(cacheName(token, version));
        await cache.put(request, response.clone());
        await pruneCaches();
      }
      return response;
    }

    // A transient server error must not destroy a working offline copy.
    const cached = await caches.match(request, { ignoreVary: true });
    return cached || response;
  } catch {
    const cached = await caches.match(request, { ignoreVary: true });
    if (cached) return cached;
    return new Response(
      JSON.stringify({ available: false, reason: "OFFLINE", offline: true }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }
}

/** Guide document: network first, fall back to the cached shell when offline. */
async function handleDocument(request, url) {
  const token = tokenFromPath(url.pathname);
  const version = activeGuides.get(token);

  try {
    const response = await fetch(request);
    if (response.ok && version !== undefined) {
      const cache = await caches.open(cacheName(token, version));
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request, { ignoreSearch: true, ignoreVary: true });
    if (cached) return cached;
    throw new Error("Event Guide is unavailable offline");
  }
}

/** Assets: cache first, since a chunk hash already encodes its version. */
async function handleAsset(request) {
  const cached = await caches.match(request, { ignoreVary: true });
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok || response.type === "opaque") {
    // Attach to whichever guide this client currently has open.
    const entry = [...activeGuides.entries()][0];
    if (entry) {
      const cache = await caches.open(cacheName(entry[0], entry[1]));
      await cache.put(request, response.clone());
    }
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Seating and analytics are never cached: one is a guest list lookup, the
  // other is a write. Both must always hit the network or fail honestly.
  if (isSeatingRequest(url) || isViewBeacon(url)) return;

  if (isPayloadRequest(url)) {
    event.respondWith(handlePayload(request, url));
    return;
  }

  if (request.mode === "navigate" && url.pathname.startsWith(GUIDE_PATH_PREFIX)) {
    event.respondWith(handleDocument(request, url));
    return;
  }

  if (isCacheableAsset(url) && activeGuides.size > 0) {
    event.respondWith(handleAsset(request));
  }
});
