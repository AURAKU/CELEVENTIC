import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Shared vendor access tokens (server side).
 *
 * Format: cvs1.<nonce>.<hmac>
 * Only sha256(token) is stored. Reusable by design — never marks ALREADY_USED.
 */

export const VENDOR_TOKEN_PREFIX = "cvs1";
export const VENDOR_TOKEN_PATTERN = /^cvs1\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{22}$/;

const NONCE_BYTES = 16;
const TAG_BYTES = 16;

function b64url(buf: Buffer): string {
  return buf.toString("base64url");
}

function signingKey(): string {
  const secret =
    process.env.VENDOR_ACCESS_SECRET ??
    process.env.ADMISSION_PASS_SECRET ??
    process.env.NEXTAUTH_SECRET ??
    (process.env.NODE_ENV === "test" || process.env.NODE_ENV === "development"
      ? "celeventic-dev-vendor-access"
      : undefined);
  if (!secret) {
    throw new Error("VENDOR_ACCESS_SECRET (or ADMISSION_PASS_SECRET / NEXTAUTH_SECRET) must be set");
  }
  return secret;
}

function tag(nonce: string, key = signingKey()): string {
  return b64url(
    createHmac("sha256", key)
      .update(`${VENDOR_TOKEN_PREFIX}.${nonce}`)
      .digest()
      .subarray(0, TAG_BYTES)
  );
}

export function looksLikeVendorToken(value: string): boolean {
  return VENDOR_TOKEN_PATTERN.test(value.trim());
}

export function vendorTokenFromNonce(nonce: string): string {
  return `${VENDOR_TOKEN_PREFIX}.${nonce}.${tag(nonce)}`;
}

export function mintVendorToken(): { nonce: string; token: string } {
  const nonce = b64url(randomBytes(NONCE_BYTES));
  return { nonce, token: vendorTokenFromNonce(nonce) };
}

export function verifyVendorTokenSignature(value: string): boolean {
  const token = value.trim();
  if (!looksLikeVendorToken(token)) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const expected = tag(parts[1]);
  try {
    const a = Buffer.from(parts[2]);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function hashVendorToken(token: string): string {
  return createHash("sha256").update(token.trim()).digest("hex");
}

export function generatePublicLinkToken(): string {
  return `eql_${b64url(randomBytes(18))}`;
}

/** 6–8 digit event-scoped vendor codes (never guessable 4-digit by default). */
export function generateVendorManualCode(length = 6): string {
  const len = Math.min(8, Math.max(6, length));
  const space = 10 ** len;
  const value = randomBytes(4).readUInt32BE(0) % space;
  return String(value).padStart(len, "0");
}

export function buildVendorPassUrl(token: string, baseUrl?: string): string {
  const path = `/vendor-access/${encodeURIComponent(token)}`;
  return baseUrl ? `${baseUrl.replace(/\/$/, "")}${path}` : path;
}
