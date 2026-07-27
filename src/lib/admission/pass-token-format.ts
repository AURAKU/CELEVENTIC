/**
 * Pass-token *format* helpers with no Node crypto dependency, so the scanner
 * and the offline gate can reject malformed input inside the browser bundle.
 * Signature verification and hashing live in `pass-token.ts` (server-only).
 */

export const PASS_TOKEN_PREFIX = "cvp1";

const SEGMENT = "[A-Za-z0-9_-]{22}";
export const PASS_TOKEN_PATTERN = new RegExp(`^${PASS_TOKEN_PREFIX}\\.${SEGMENT}\\.${SEGMENT}$`);

/** Cheap shape check — safe to run on untrusted scanner input. */
export function looksLikePassToken(value: string): boolean {
  return PASS_TOKEN_PATTERN.test(value.trim());
}

/**
 * Extract a pass token from raw scanner input (bare token or full pass URL).
 * Returns null when the input is not a syntactically valid pass token.
 */
export function extractPassToken(raw: string): string | null {
  const text = raw.trim().replace(/\s+/g, "");
  if (!text) return null;
  if (looksLikePassToken(text)) return text;

  const match = text.match(/\/admission\/([A-Za-z0-9_.%-]+)/i);
  if (match?.[1]) {
    let candidate = match[1];
    try {
      candidate = decodeURIComponent(candidate);
    } catch {
      /* keep the raw fragment — the pattern check below still guards us */
    }
    if (looksLikePassToken(candidate)) return candidate;
  }
  return null;
}

/**
 * Non-secret fragment kept alongside the hash for support lookups ("the pass
 * ending in …") and for indexing offline packages. Deliberately short enough
 * that it cannot be brute-forced back into a working token.
 */
export function passTokenPrefix(token: string): string {
  return token.trim().slice(0, PASS_TOKEN_PREFIX.length + 1 + 8);
}

/** The URL a printed/scanned pass resolves to. */
export function buildPassUrl(appUrl: string, token: string): string {
  return `${appUrl.replace(/\/+$/, "")}/admission/${encodeURIComponent(token)}`;
}
