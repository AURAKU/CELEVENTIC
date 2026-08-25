import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/** Hash a raw guest identifier before persistence (privacy-safe). Server-only. */
export function hashMemoryGuestKey(raw: string): string {
  return createHash("sha256").update(raw.trim()).digest("hex");
}

export function generateMemoryGuestRawKey(): string {
  return randomBytes(24).toString("base64url");
}

export function generateMemoryAuthorToken(): string {
  return randomBytes(24).toString("base64url");
}

export function hashMemoryAuthorToken(token: string): string {
  return createHash("sha256").update(token.trim()).digest("hex");
}

export function memoryAuthorTokenMatches(
  storedHash: string | null | undefined,
  token: string
): boolean {
  if (!storedHash || !token.trim()) return false;
  const incoming = Buffer.from(hashMemoryAuthorToken(token), "utf8");
  const expected = Buffer.from(storedHash, "utf8");
  if (incoming.length !== expected.length) return false;
  return timingSafeEqual(incoming, expected);
}
