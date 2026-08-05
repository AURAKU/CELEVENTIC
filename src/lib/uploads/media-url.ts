/**
 * Shared public media URL resolver — client-safe (no AWS SDK / Node fs).
 *
 * Canonical browser path for local disk media is `/uploads/...` so Nginx (or Next
 * `public/`) can serve Range requests directly. Legacy `/api/uploads/...` URLs are
 * rewritten to `/uploads/...` to avoid proxying large files through Next.js (which
 * previously buffered whole files and could trip Web Streams / TransformStream bugs).
 */

const LOCAL_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
]);

/**
 * Hosts that only exist inside the network that authored the media.
 *
 * Studio uploads and CSV/JSON imports have been observed persisting whichever
 * origin the author's browser happened to be on — a laptop on `192.168.1.x`, a
 * staging box on `10.x`, a `*.local` mDNS name. Those absolute URLs are
 * indistinguishable from a real CDN to the old check, so they were written
 * straight into guest payloads and rendered as broken images on every device
 * outside that network. Reduce them to their path so the guest's own origin
 * serves the file.
 */
const PRIVATE_IPV4 =
  /^(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|169\.254\.\d{1,3}\.\d{1,3}|127\.\d{1,3}\.\d{1,3}\.\d{1,3})$/;

function hostIsNonPublic(host: string): boolean {
  const hostname = host.toLowerCase();
  if (LOCAL_HOSTS.has(hostname)) return true;
  if (PRIVATE_IPV4.test(hostname)) return true;
  // mDNS / Bonjour names and internal-only suffixes never resolve for a guest.
  if (hostname.endsWith(".local") || hostname.endsWith(".internal")) return true;
  // Bare hostname with no dot (e.g. "macbook-pro") is a LAN name, not a domain.
  if (!hostname.includes(".") && !hostname.includes(":")) return true;
  return false;
}

function hostnameLooksLikeMediaCdn(host: string): boolean {
  if (host.endsWith(".amazonaws.com")) return true;
  if (host.endsWith(".cloudfront.net")) return true;
  if (host.includes("celeventic")) return true;
  const publicCdn = process.env.NEXT_PUBLIC_MEDIA_CDN_URL?.trim();
  if (publicCdn) {
    try {
      if (host === new URL(publicCdn).hostname) return true;
    } catch {
      /* ignore */
    }
  }
  return false;
}

function stripFilesystemPrefixes(input: string): string {
  let value = input.replace(/\\/g, "/").trim();
  // Never expose absolute server paths to the browser.
  value = value.replace(/^\/var\/www\/CELEVENTIC\/public\/uploads\//i, "/uploads/");
  value = value.replace(/^\/var\/www\/[^/]+\/public\/uploads\//i, "/uploads/");
  value = value.replace(/^[A-Za-z]:\/.*?\/public\/uploads\//i, "/uploads/");
  value = value.replace(/^.*?\/public\/uploads\//i, "/uploads/");
  value = value.replace(/^public\/uploads\//i, "/uploads/");
  value = value.replace(/^\/+public\/uploads\//i, "/uploads/");
  return value;
}

function collapseDuplicateSlashes(pathOnly: string): string {
  // Keep protocol double-slash intact — this helper is for path segments only.
  return pathOnly.replace(/\/{2,}/g, "/");
}

function encodePathSegments(pathname: string): string {
  return pathname
    .split("/")
    .map((segment, index) => {
      if (index === 0 && segment === "") return "";
      if (!segment) return "";
      try {
        return encodeURIComponent(decodeURIComponent(segment));
      } catch {
        return encodeURIComponent(segment);
      }
    })
    .join("/");
}

/**
 * Resolve any stored media reference into a browser-safe public URL.
 * Alias: `resolveMediaUrl` (kept for existing call sites).
 */
export function resolvePublicMediaUrl(url: string | null | undefined): string {
  if (!url) return "";
  let trimmed = stripFilesystemPrefixes(url.trim());
  if (!trimmed) return "";

  if (
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("data:")
  ) {
    return trimmed;
  }

  // Absolute http(s) — strip legacy localhost / duplicate public prefixes, keep real CDNs.
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      if (hostIsNonPublic(parsed.hostname)) {
        return resolvePublicMediaUrl(`${parsed.pathname}${parsed.search}${parsed.hash}`);
      }
      // Same-origin celeventic absolute upload paths → relative for cache + nginx.
      if (
        hostnameLooksLikeMediaCdn(parsed.hostname) &&
        (parsed.pathname.startsWith("/uploads/") || parsed.pathname.startsWith("/api/uploads/"))
      ) {
        return resolvePublicMediaUrl(`${parsed.pathname}${parsed.search}${parsed.hash}`);
      }
      return trimmed;
    } catch {
      return trimmed;
    }
  }

  // Missing leading slash: "uploads/foo.jpg"
  if (trimmed.startsWith("uploads/") || trimmed.startsWith("api/uploads/")) {
    trimmed = `/${trimmed}`;
  }

  // Legacy API proxy path → static /uploads for Nginx / public folder delivery.
  if (trimmed.startsWith("/api/uploads/")) {
    const rest = trimmed.slice("/api/uploads/".length);
    const qIndex = rest.search(/[?#]/);
    const pathPart = qIndex >= 0 ? rest.slice(0, qIndex) : rest;
    const suffix = qIndex >= 0 ? rest.slice(qIndex) : "";
    return `/uploads/${collapseDuplicateSlashes(pathPart).replace(/^\/+/, "")}${suffix}`;
  }

  if (trimmed.startsWith("/uploads/")) {
    const withoutPrefix = trimmed.slice("/uploads/".length);
    const qIndex = withoutPrefix.search(/[?#]/);
    const pathPart = qIndex >= 0 ? withoutPrefix.slice(0, qIndex) : withoutPrefix;
    const suffix = qIndex >= 0 ? withoutPrefix.slice(qIndex) : "";
    const encoded = encodePathSegments(collapseDuplicateSlashes(pathPart));
    return `/uploads/${encoded.replace(/^\/+/, "")}${suffix}`;
  }

  // Relative path without uploads prefix — leave as-is (template assets, etc.).
  if (trimmed.startsWith("/")) {
    return collapseDuplicateSlashes(trimmed);
  }

  return trimmed;
}

/** @deprecated Prefer `resolvePublicMediaUrl` — kept as a stable alias. */
export function resolveMediaUrl(url: string | null | undefined): string {
  return resolvePublicMediaUrl(url);
}

export function isUploadedMediaUrl(url: string): boolean {
  const resolved = resolvePublicMediaUrl(url);
  if (resolved.startsWith("/uploads/") || resolved.startsWith("/api/uploads/")) return true;
  if (!resolved.startsWith("https://") && !resolved.startsWith("http://")) return false;
  try {
    return hostnameLooksLikeMediaCdn(new URL(resolved).hostname);
  } catch {
    return false;
  }
}

/**
 * Whether `next/image` should skip the optimizer for this src.
 *
 * Absolute http(s) / data / blob URLs always skip optimization. Demo Unsplash
 * assets and user-uploaded CDNs are already web-sized; missing or stale
 * `images.remotePatterns` must never crash invitation, gallery, or portal pages.
 * Relative `/public` assets still go through the optimizer.
 */
export function shouldUnoptimizeNextImage(url: string | null | undefined): boolean {
  if (!url) return true;
  const src = url.trim();
  if (!src) return true;
  if (src.startsWith("blob:") || src.startsWith("data:")) return true;
  if (isUploadedMediaUrl(src)) return true;
  if (/^https?:\/\//i.test(src)) return true;
  return false;
}

/** Infer a safe `<source type>` for a public media URL (never claim MOV is video/mp4). */
export function inferVideoSourceMime(url: string | null | undefined): string {
  const resolved = resolvePublicMediaUrl(url).toLowerCase();
  if (resolved.includes(".webm")) return "video/webm";
  if (resolved.includes(".mov") || resolved.includes(".qt")) return "video/quicktime";
  if (resolved.includes(".m3u8")) return "application/vnd.apple.mpegurl";
  return "video/mp4";
}

/** Append or replace a cache-busting `v=` query without breaking existing params. */
export function withMediaVersion(url: string, version: string | number | null | undefined): string {
  const resolved = resolvePublicMediaUrl(url);
  if (!resolved || version == null || version === "") return resolved;
  try {
    const isAbsolute = /^https?:\/\//i.test(resolved);
    const parsed = new URL(resolved, isAbsolute ? undefined : "https://celeventic.local");
    parsed.searchParams.set("v", String(version));
    if (isAbsolute) return parsed.toString();
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    const join = resolved.includes("?") ? "&" : "?";
    return `${resolved}${join}v=${encodeURIComponent(String(version))}`;
  }
}
