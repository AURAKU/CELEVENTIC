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

export function isLocalHost(hostOrUrl: string): boolean {
  try {
    const hostname = hostOrUrl.includes("://")
      ? new URL(hostOrUrl).hostname
      : hostOrUrl.split(":")[0].toLowerCase();
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.endsWith(".local")
    );
  } catch {
    return true;
  }
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

  if (nodeEnv === "production") {
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

/** Client resolver — prefers current browser origin on live domains. */
export function getClientAppUrl(): string {
  if (typeof window !== "undefined") {
    const origin = window.location.origin;
    if (!isLocalHost(origin)) return normalizeUrl(origin);
  }
  return getAppUrlFromEnv();
}

/** Rewrite stored share links that incorrectly contain localhost. */
export function sanitizePublicUrl(url: string, baseUrl?: string): string {
  const base = baseUrl ?? getAppUrlFromEnv();
  try {
    const parsed = new URL(url);
    if (isLocalHost(parsed.origin)) {
      return `${base}${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
    return url;
  } catch {
    if (/localhost|127\.0\.0\.1/.test(url)) {
      return url.replace(/https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?/gi, base);
    }
    return url;
  }
}
