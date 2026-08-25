/**
 * Guide analytics privacy (§57).
 * Never record guest names, admission codes, QR tokens, payment info,
 * private invite URLs, or sensitive form values. Sanitize search queries.
 */

const BLOCKED_META_KEYS = new Set([
  "name",
  "guestname",
  "guest_name",
  "fullname",
  "full_name",
  "email",
  "phone",
  "admission",
  "admissioncode",
  "admission_code",
  "code",
  "token",
  "qrtoken",
  "qr_token",
  "passcode",
  "pass_token",
  "payment",
  "paymentid",
  "payment_id",
  "card",
  "cardnumber",
  "cvv",
  "iban",
  "amount",
  "reference",
  "inviteurl",
  "invite_url",
  "privateurl",
  "password",
  "otp",
  "secret",
]);

const SENSITIVE_PATH_SEGMENTS = [
  /\/invite\/[^/]+/i,
  /\/admission\/[^/]+/i,
  /\/qr\/[^/]+/i,
  /\/seat\/[^/]+/i,
  /\/vendor-pass\/[^/]+/i,
  /\/gift\/[^/]+/i,
  /\/memory\/[^/]+/i,
  /\/memory-upload\/[^/]+/i,
  /\/join\/[^/]+/i,
  /\/verify\/[^/]+/i,
  /\/thank-you\/[^/]+/i,
  /\/event-guide\/[^/]+/i,
  /token=[^&]+/i,
  /code=[^&]+/i,
  /pass=[^&]+/i,
];

const TOKENISH = /\b[a-z0-9_-]{20,}\b/gi;
const EMAILISH = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
const PHONEISH = /\+?\d[\d\s().-]{7,}\d/g;

export function sanitizeGuideAnalyticsPath(path: unknown): string {
  let p = String(path ?? "").slice(0, 300);
  for (const re of SENSITIVE_PATH_SEGMENTS) {
    p = p.replace(re, (m) => {
      const base = m.split("/")[1] ? `/${m.split("/").filter(Boolean)[0]}/[redacted]` : "[redacted]";
      if (m.includes("=")) return m.replace(/=.*/, "=[redacted]");
      return base;
    });
  }
  // Collapse remaining long opaque tokens in path
  p = p.replace(TOKENISH, "[redacted]");
  return p.slice(0, 200);
}

export function sanitizeGuideSearchQuery(query: unknown): string {
  let q = String(query ?? "").slice(0, 200);
  q = q.replace(EMAILISH, "[email]");
  q = q.replace(PHONEISH, "[phone]");
  // Drop likely codes / tokens (long alphanumerics)
  q = q.replace(TOKENISH, "[redacted]");
  // Drop sequences that look like admission short codes with digits+letters mixed length 6+
  q = q.replace(/\b(?=[a-z]*\d)(?=\d*[a-z])[a-z0-9]{6,}\b/gi, "[code]");
  return q.trim().slice(0, 120);
}

export function sanitizeGuideAnalyticsMeta(
  meta: Record<string, unknown> | null | undefined
): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  if (!meta || typeof meta !== "object") return out;

  for (const [rawKey, rawVal] of Object.entries(meta)) {
    const key = rawKey.toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (BLOCKED_META_KEYS.has(key)) continue;
    if (rawVal === null || rawVal === undefined) continue;

    if (typeof rawVal === "boolean" || typeof rawVal === "number") {
      if (typeof rawVal === "number" && !Number.isFinite(rawVal)) continue;
      // Never keep raw payment amounts under alternate keys
      if (key.includes("amount") || key.includes("price") || key.includes("card")) continue;
      out[rawKey.slice(0, 40)] = rawVal;
      continue;
    }

    if (typeof rawVal === "string") {
      let v = rawVal.slice(0, 200);
      if (key === "path" || key.endsWith("path") || key === "url" || key.endsWith("url")) {
        v = sanitizeGuideAnalyticsPath(v);
      } else if (key === "q" || key === "query" || key === "search" || key.includes("search")) {
        v = sanitizeGuideSearchQuery(v);
      } else {
        v = v.replace(EMAILISH, "[email]").replace(PHONEISH, "[phone]").replace(TOKENISH, "[redacted]");
      }
      if (!v) continue;
      out[rawKey.slice(0, 40)] = v.slice(0, 120);
    }
  }
  return out;
}

export function buildSafeGuideAnalyticsPayload(input: {
  event: string;
  path?: unknown;
  slug?: unknown;
  q?: unknown;
  meta?: Record<string, unknown>;
}): {
  event: string;
  path: string;
  slug: string;
  q?: string;
  meta: Record<string, string | number | boolean>;
} {
  const meta = sanitizeGuideAnalyticsMeta({
    ...(input.meta ?? {}),
    ...(input.q != null ? { q: input.q } : {}),
  });
  const q =
    input.q != null
      ? sanitizeGuideSearchQuery(input.q)
      : typeof meta.q === "string"
        ? meta.q
        : undefined;
  delete meta.q;
  return {
    event: String(input.event).slice(0, 80),
    path: sanitizeGuideAnalyticsPath(input.path),
    slug: String(input.slug ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "")
      .slice(0, 120),
    ...(q ? { q } : {}),
    meta,
  };
}
