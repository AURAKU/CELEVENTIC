/**
 * Safely extract a Celeventic QR token from scanned text or URLs.
 * Never parses or returns PII — token only.
 */

import { DEFAULT_PRODUCTION_URL, getAppUrlFromEnv } from "@/lib/app-url";
import { isManualAdmissionCode } from "@/lib/qr/manual-code-pattern";

const TOKEN_PATTERN = /^[a-zA-Z0-9_-]{16,64}$/;

const URL_PATTERNS = [
  /\/verify\/([a-zA-Z0-9_-]+)/i,
  /\/admission\/([a-zA-Z0-9_-]+)/i,
  /\/qr\/([a-zA-Z0-9_-]+)/i,
  /\/memory-upload\/([a-zA-Z0-9_-]+)/i,
  /\/memory\/([a-zA-Z0-9_-]+)/i,
];

/** Strip query params and trailing slashes from raw scan text */
function normalizeScanText(raw: string): string {
  return raw.trim().replace(/\s+/g, "");
}

/**
 * Parse QR payload into a token string.
 * Accepts raw tokens, Celeventic verification/admission URLs, or 4-digit manual codes.
 * Manual codes are event-scoped and resolved in QrService with eventId.
 */
export function parseQrToken(raw: string): string | null {
  const text = normalizeScanText(raw);
  if (!text) return null;

  if (TOKEN_PATTERN.test(text)) return text;
  if (isManualAdmissionCode(text)) return text;

  try {
    const url = text.startsWith("http") ? new URL(text) : new URL(text, DEFAULT_PRODUCTION_URL);
    for (const pattern of URL_PATTERNS) {
      const match = url.pathname.match(pattern);
      if (match?.[1] && TOKEN_PATTERN.test(match[1])) return match[1];
    }
  } catch {
    for (const pattern of URL_PATTERNS) {
      const match = text.match(pattern);
      if (match?.[1] && TOKEN_PATTERN.test(match[1])) return match[1];
    }
  }

  return null;
}

export function buildVerifyUrl(token: string): string {
  const appUrl = getAppUrlFromEnv();
  return `${appUrl}/verify/${token}`;
}
