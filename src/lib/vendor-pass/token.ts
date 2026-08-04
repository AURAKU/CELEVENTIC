/**
 * Capacity-tracked vendor/team pass tokens (separate from guest cvp1 and
 * shared-vendor cvs1). Format: cvt1.<nonce>.<hmac>
 *
 * Server-only: uses Node crypto. Client code must import from `./token-format`.
 */

import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import {
  VENDOR_TEAM_TOKEN_PREFIX,
  looksLikeVendorTeamToken,
} from "./token-format";

export {
  VENDOR_TEAM_TOKEN_PREFIX,
  VENDOR_TEAM_TOKEN_PATTERN,
  looksLikeVendorTeamToken,
  buildVendorTeamPassUrl,
  extractVendorTeamToken,
} from "./token-format";

const NONCE_BYTES = 16;
const TAG_BYTES = 16;

function b64url(buf: Buffer): string {
  return buf.toString("base64url");
}

function signingKey(): string {
  const secret =
    process.env.VENDOR_TEAM_PASS_SECRET ??
    process.env.VENDOR_ACCESS_SECRET ??
    process.env.ADMISSION_PASS_SECRET ??
    process.env.NEXTAUTH_SECRET ??
    (process.env.NODE_ENV !== "production" ? "celeventic-dev-vendor-team-pass" : undefined);
  if (!secret) {
    throw new Error("VENDOR_TEAM_PASS_SECRET (or ADMISSION_PASS_SECRET / NEXTAUTH_SECRET) must be set");
  }
  return secret;
}

function tag(nonce: string, key = signingKey()): string {
  return b64url(
    createHmac("sha256", key)
      .update(`${VENDOR_TEAM_TOKEN_PREFIX}.${nonce}`)
      .digest()
      .subarray(0, TAG_BYTES)
  );
}

export function vendorTeamTokenFromNonce(nonce: string): string {
  return `${VENDOR_TEAM_TOKEN_PREFIX}.${nonce}.${tag(nonce)}`;
}

export function mintVendorTeamToken(): { nonce: string; token: string } {
  const nonce = b64url(randomBytes(NONCE_BYTES));
  return { nonce, token: vendorTeamTokenFromNonce(nonce) };
}

export function verifyVendorTeamTokenSignature(value: string): boolean {
  const token = value.trim();
  if (!looksLikeVendorTeamToken(token)) return false;
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

export function hashVendorTeamToken(token: string): string {
  return createHash("sha256").update(token.trim()).digest("hex");
}

export function mintVendorTeamPublicToken(): string {
  return `vtp_${b64url(randomBytes(18))}`;
}
