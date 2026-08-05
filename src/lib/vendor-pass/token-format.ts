/**
 * Client-safe vendor/team token shape helpers (no Node crypto).
 * Minting / HMAC / hashing live in `./token` (server-only).
 */

export const VENDOR_TEAM_TOKEN_PREFIX = "cvt1";
export const VENDOR_TEAM_TOKEN_PATTERN = /^cvt1\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{22}$/;

export function looksLikeVendorTeamToken(value: string): boolean {
  return VENDOR_TEAM_TOKEN_PATTERN.test(value.trim());
}

export function buildVendorTeamPassUrl(publicToken: string, baseUrl?: string): string {
  const token = publicToken.trim();
  if (!token) {
    return baseUrl ? `${baseUrl.replace(/\/$/, "")}/vendor-pass` : "/vendor-pass";
  }
  const path = `/vendor-pass/${encodeURIComponent(token)}`;
  return baseUrl ? `${baseUrl.replace(/\/$/, "")}${path}` : path;
}

export function extractVendorTeamToken(raw: string): string | null {
  const text = raw.trim().replace(/\s+/g, "");
  if (!text) return null;
  if (looksLikeVendorTeamToken(text)) return text;
  const withoutQuery = text.split(/[?#]/, 2)[0] ?? text;
  const match = withoutQuery.match(/\/(?:vendor-pass|admission)\/([A-Za-z0-9_.%-]+)/i);
  if (match?.[1]) {
    let candidate = match[1];
    try {
      candidate = decodeURIComponent(candidate);
    } catch {
      /* keep raw */
    }
    if (looksLikeVendorTeamToken(candidate)) return candidate;
  }
  return null;
}
