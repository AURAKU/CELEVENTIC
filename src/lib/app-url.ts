/** Canonical Celeventic production domains */
export const CELEVENTIC_DOMAINS = [
  "celeventic.com",
  "www.celeventic.com",
  "celeventic.org",
  "www.celeventic.org",
  "celeventic.online",
  "www.celeventic.online",
] as const;

export const DEFAULT_PRODUCTION_URL = "https://www.celeventic.com";

export function isCeleventicDomain(hostOrUrl: string): boolean {
  try {
    const hostname = hostOrUrl.includes("://")
      ? new URL(hostOrUrl).hostname
      : hostOrUrl.split(":")[0].toLowerCase();
    return CELEVENTIC_DOMAINS.some((d) => hostname === d || hostname.endsWith(`.${d.replace(/^www\./, "")}`));
  } catch {
    return false;
  }
}

function isProductionDeployment(nodeEnv?: string): boolean {
  const env = nodeEnv ?? process.env.NODE_ENV ?? "development";
  return (
    env === "production" ||
    process.env.VERCEL === "1" ||
    process.env.VERCEL_ENV === "production" ||
    process.env.VERCEL_ENV === "preview"
  );
}

function hostnameOf(hostOrUrl: string): string {
  const hostname = hostOrUrl.includes("://")
    ? new URL(hostOrUrl).hostname
    : hostOrUrl.split("/")[0].split(":")[0];
  return hostname.replace(/^\[/, "").replace(/\]$/, "").toLowerCase();
}

export function isLocalHost(hostOrUrl: string): boolean {
  try {
    const hostname = hostnameOf(hostOrUrl);
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname.endsWith(".local")
    );
  } catch {
    return true;
  }
}

/** Loopback, link-local, and RFC1918 hosts must never be encoded into guest QR or NFC. */
export function isPrivateNetworkHost(hostOrUrl: string): boolean {
  try {
    if (isLocalHost(hostOrUrl)) return true;
    const hostname = hostnameOf(hostOrUrl);
    if (hostname.startsWith("fe80:") || hostname.startsWith("fc") || hostname.startsWith("fd")) return true;
    const ipv4 = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (!ipv4) return false;
    const a = Number(ipv4[1]);
    const b = Number(ipv4[2]);
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    return false;
  } catch {
    return true;
  }
}

/** Guest QR, NFC, and vCard origins. HTTPS Celeventic hosts only. */
export function isApprovedCeleYouShareOrigin(value: string): boolean {
  try {
    const parsed = value.includes("://") ? new URL(value) : new URL(`https://${value}`);
    if (parsed.protocol !== "https:") return false;
    if (parsed.username || parsed.password) return false;
    if (isPrivateNetworkHost(parsed.hostname)) return false;
    return isCeleventicDomain(parsed.hostname);
  } catch {
    return false;
  }
}

/**
 * Origin encoded into physical QR, NFC tags, and guest vCards.
 * Never localhost, private IPs, preview hosts, or http.
 * Invalid production config falls back to the canonical live domain, not localhost.
 */
export function celeYouProductionOrigin(candidate?: string | null): string {
  const value = candidate?.trim();
  if (value) {
    try {
      const parsed = value.includes("://") ? new URL(value) : new URL(`https://${value}`);
      if (!parsed.username && !parsed.password && isCeleventicDomain(parsed.hostname) && !isPrivateNetworkHost(parsed.hostname)) {
        return normalizeUrl(`https://${parsed.hostname}`);
      }
    } catch {
      return DEFAULT_PRODUCTION_URL;
    }
  }
  return DEFAULT_PRODUCTION_URL;
}

function normalizeUrl(url: string): string {
  return url.replace(/\/$/, "");
}

type ResolveOptions = {
  envUrl?: string | null;
  host?: string | null;
  protocol?: string | null;
  vercelUrl?: string | null;
  nodeEnv?: string;
};

/**
 * Resolve the public app URL. Never returns localhost on live hosts or in production.
 * Priority: request host → valid env URL → Vercel URL → production default → localhost (dev only).
 */
export function resolveAppUrl(options: ResolveOptions = {}): string {
  const nodeEnv = options.nodeEnv ?? process.env.NODE_ENV ?? "development";
  const envUrl = (options.envUrl ?? process.env.NEXT_PUBLIC_APP_URL)?.trim();

  const host = options.host?.split(",")[0]?.trim();
  if (host && !isLocalHost(host)) {
    const proto = options.protocol?.split(",")[0]?.trim() || "https";
    return normalizeUrl(`${proto}://${host}`);
  }

  if (envUrl && !isLocalHost(envUrl)) {
    return normalizeUrl(envUrl);
  }

  const vercel = options.vercelUrl ?? process.env.VERCEL_URL;
  if (vercel && !isLocalHost(vercel)) {
    return normalizeUrl(`https://${vercel}`);
  }

  if (isProductionDeployment(nodeEnv)) {
    return DEFAULT_PRODUCTION_URL;
  }

  if (envUrl) return normalizeUrl(envUrl);
  return "http://localhost:3000";
}

/** Sync resolver for services and API routes (no request headers). */
export function getAppUrlFromEnv(): string {
  return resolveAppUrl();
}

/** Server resolver using incoming request headers when available. */
export async function getServerAppUrl(): Promise<string> {
  try {
    const { headers } = await import("next/headers");
    const h = await headers();
    return resolveAppUrl({
      host: h.get("x-forwarded-host") ?? h.get("host"),
      protocol: h.get("x-forwarded-proto") ?? "https",
    });
  } catch {
    return getAppUrlFromEnv();
  }
}

/** Client resolver. Prefers current browser origin on live domains. */
export function getClientAppUrl(): string {
  if (typeof window !== "undefined") {
    const origin = window.location.origin;
    if (!isLocalHost(origin)) return normalizeUrl(origin);
  }
  const fromEnv = getAppUrlFromEnv();
  if (!isLocalHost(fromEnv)) return fromEnv;
  if (isProductionDeployment()) return DEFAULT_PRODUCTION_URL;
  return fromEnv;
}

/**
 * Origin encoded into CeleYou QR, NFC, share links, and vCards.
 * Recipients scan these in the real world, so localhost is never encoded.
 */
export function getCeleYouShareOrigin(): string {
  if (typeof window !== "undefined") {
    return celeYouProductionOrigin(window.location.origin);
  }
  return celeYouProductionOrigin(getAppUrlFromEnv());
}

/** Prefer an approved live request host. Rewrite unsafe hosts onto the canonical domain. */
export function celeYouGuestOrigin(candidate?: string | null): string {
  if (candidate?.trim()) return celeYouProductionOrigin(candidate);
  return getCeleYouShareOrigin();
}

/** Rewrite stored share links that incorrectly contain localhost. */
export function sanitizePublicUrl(url: string, baseUrl?: string): string {
  const base = baseUrl ?? getAppUrlFromEnv();
  try {
    const parsed = new URL(url);
    // Scheme-less input like "localhost:3000/invite/x" (a legacy/dev-seeded
    // value stored without `http://`) parses as a URL with protocol
    // `"localhost:"` and an opaque origin, not `http(s):`, rather than
    // throwing, so it must be rejected here and handled by the regex fallback
    // below instead of silently passing through unmodified.
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("not an http(s) URL");
    }
    if (isLocalHost(parsed.hostname)) {
      return `${base}${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
    return url;
  } catch {
    if (/localhost|127\.0\.0\.1/i.test(url)) {
      return url.replace(/(?:https?:\/\/)?(?:localhost|127\.0\.0\.1)(?::\d+)?/gi, base);
    }
    return url;
  }
}
