import crypto from "crypto";

/**
 * Token helpers for gift links and receipts.
 *
 * `generateToken` in src/lib/utils.ts is built on Math.random, which is fine
 * for cosmetic ids but must never guard money. Everything here is backed by
 * crypto.randomBytes / HMAC-SHA256 and compared in constant time.
 */

const BASE62 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

/** Cryptographically secure base62 token (default ≈ 190 bits of entropy). */
export function secureToken(length = 32): string {
  const bytes = crypto.randomBytes(length * 2);
  let out = "";
  for (let i = 0; out.length < length; i++) {
    // Reject values in the biased tail so every character is uniform.
    const byte = bytes[i % bytes.length];
    if (byte >= 248) continue;
    out += BASE62[byte % 62];
  }
  return out;
}

/** Public gift-link token: prefixed so support can recognise it at a glance. */
export function generateGiftPublicToken(): string {
  return `gft_${secureToken(28)}`;
}

/** Provider-facing payment reference for a gift. */
export function generateGiftReference(): string {
  return `CEVGIFT-${secureToken(18)}`;
}

/** Human-quotable receipt number, e.g. CEV-GFT-8KD2-QW7P. */
export function generateReceiptNumber(): string {
  const block = () => secureToken(4).toUpperCase();
  return `CEV-GFT-${block()}-${block()}`;
}

function receiptSecret(): string {
  const secret =
    process.env.GIFT_RECEIPT_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.ENCRYPTION_KEY;
  if (!secret) {
    throw new Error(
      "GIFT_RECEIPT_SECRET (or NEXTAUTH_SECRET) must be set to issue gift receipts"
    );
  }
  return secret;
}

function base64Url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function sign(payload: string): string {
  return base64Url(crypto.createHmac("sha256", receiptSecret()).update(payload).digest());
}

/**
 * Signed receipt token: `<receiptId>.<hmac>`.
 *
 * Deterministic on purpose — the guest who paid can be handed their receipt
 * link again from the status endpoint without us storing a bearer token in the
 * database. It is unguessable without the server secret, grants access to that
 * one receipt and nothing else, and can be killed by setting `revokedAt` on the
 * receipt row.
 */
export function issueReceiptToken(receiptId: string): { token: string; fingerprint: string } {
  const token = `${receiptId}.${sign(receiptId)}`;
  return { token, fingerprint: fingerprintToken(token) };
}

export function verifyReceiptToken(token: string): { receiptId: string } | null {
  if (typeof token !== "string" || token.length > 512) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [receiptId, signature] = parts;
  if (!receiptId || !signature) return null;

  let expected: string;
  try {
    expected = sign(receiptId);
  } catch {
    return null;
  }

  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return { receiptId };
}

export function fingerprintToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * One-way IP hash for abuse throttling and fraud review. We never store a raw
 * guest IP against a gift.
 */
export function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  const salt = process.env.GIFT_RECEIPT_SECRET || process.env.NEXTAUTH_SECRET || "celeventic";
  return crypto.createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

/** Deterministic idempotency key so a replayed webhook cannot double-credit. */
export function ledgerIdempotencyKey(parts: (string | number)[]): string {
  return parts.map((p) => String(p)).join(":");
}
