import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { PASS_TOKEN_PREFIX, looksLikePassToken } from "@/lib/admission/pass-token-format";

/**
 * Signed Guest Entry Pass tokens (server side).
 *
 * The QR encodes an opaque, unguessable token — never a database id, guest
 * name, or event id. Structure:
 *
 *   cvp1.<22-char base64url nonce>.<22-char base64url HMAC tag>
 *
 * The tag lets the gate reject forgeries and typos before touching the
 * database, while the nonce carries the entropy (128 bits). Only
 * `sha256(token)` is persisted, so a database dump cannot be replayed as a
 * working pass.
 */

export {
  PASS_TOKEN_PREFIX,
  PASS_TOKEN_PATTERN,
  looksLikePassToken,
  extractPassToken,
  passTokenPrefix,
  buildPassUrl,
} from "@/lib/admission/pass-token-format";

const NONCE_BYTES = 16;
const TAG_BYTES = 16;

function b64url(buf: Buffer): string {
  return buf.toString("base64url");
}

/**
 * Signing key. `ADMISSION_PASS_SECRET` is preferred so admission tokens can be
 * rotated independently of sessions; `NEXTAUTH_SECRET` is the fallback so
 * existing deployments keep working without a new env var.
 */
function signingKey(): string {
  const secret = process.env.ADMISSION_PASS_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error(
      "ADMISSION_PASS_SECRET (or NEXTAUTH_SECRET) must be set to issue admission passes"
    );
  }
  return secret;
}

function tag(nonce: string, key = signingKey()): string {
  return b64url(
    createHmac("sha256", key)
      .update(`${PASS_TOKEN_PREFIX}.${nonce}`)
      .digest()
      .subarray(0, TAG_BYTES)
  );
}

/**
 * Re-derive the signed token for a stored nonce.
 *
 * The nonce is public; the tag is not. This is what lets a published
 * invitation re-render its QR on every request without the platform ever
 * persisting a usable token.
 */
export function passTokenFromNonce(nonce: string): string {
  return `${PASS_TOKEN_PREFIX}.${nonce}.${tag(nonce)}`;
}

/** Mint a fresh nonce + its signed token. */
export function mintPassToken(): { nonce: string; token: string } {
  const nonce = b64url(randomBytes(NONCE_BYTES));
  return { nonce, token: passTokenFromNonce(nonce) };
}

/**
 * Verify the HMAC tag in constant time. Returns false for any malformed input
 * rather than throwing, so a hostile QR can never crash the gate.
 */
export function verifyPassTokenSignature(value: string): boolean {
  const token = value.trim();
  if (!looksLikePassToken(token)) return false;
  const [, nonce, provided] = token.split(".");
  let expected: string;
  try {
    expected = tag(nonce);
  } catch {
    return false;
  }
  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** SHA-256 digest stored in `GuestPass.tokenHash`. */
export function hashPassToken(token: string): string {
  return createHash("sha256").update(token.trim()).digest("hex");
}

/** Constant-time comparison for admission codes typed at the gate. */
export function safeCodeEquals(a: string, b: string): boolean {
  const left = Buffer.from(a.trim(), "utf8");
  const right = Buffer.from(b.trim(), "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
