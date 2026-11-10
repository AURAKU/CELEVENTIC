import { randomBytes } from "node:crypto";
import { sha256Hex } from "@/lib/crypto/sha256-hex";

export const CELECARD_CLAIM_TTL_MS = 14 * 24 * 60 * 60 * 1000;
export const CELECARD_UNCLAIMED_HOLDER_EMAIL = "celecard.unclaimed@internal.celeventic";

export function normalizeClaimEmail(value?: string | null): string {
  return (value ?? "").trim().toLowerCase();
}

export function hashCeleCardClaimToken(token: string): string {
  return sha256Hex(token.trim());
}

export function newCeleCardClaimToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashCeleCardClaimToken(token) };
}

export function claimInviteIsUsable(
  invite: { consumedAt?: Date | null; expiresAt: Date } | null | undefined,
  now = new Date()
): boolean {
  if (!invite) return false;
  if (invite.consumedAt) return false;
  if (invite.expiresAt.getTime() <= now.getTime()) return false;
  return true;
}

export function emailsMatchForClaim(a?: string | null, b?: string | null): boolean {
  const left = normalizeClaimEmail(a);
  const right = normalizeClaimEmail(b);
  return Boolean(left) && left === right;
}

export function isUnclaimedHolderEmail(email?: string | null): boolean {
  return normalizeClaimEmail(email) === CELECARD_UNCLAIMED_HOLDER_EMAIL;
}
