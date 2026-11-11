import { randomBytes } from "node:crypto";
import { sha256Hex } from "@/lib/crypto/sha256-hex";

export const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;
export const PASSWORD_RESET_MIN_LENGTH = 8;
export const PASSWORD_RESET_PUBLIC_MESSAGE =
  "If an account exists for that email, a reset link is on the way.";

const IDENTIFIER_PREFIX = "pwdreset:";

export function normalizeResetEmail(value?: string | null): string {
  return (value ?? "").trim().toLowerCase();
}

export function passwordResetIdentifier(email: string): string {
  return `${IDENTIFIER_PREFIX}${normalizeResetEmail(email)}`;
}

export function isPasswordResetIdentifier(identifier: string): boolean {
  return identifier.startsWith(IDENTIFIER_PREFIX);
}

export function emailFromPasswordResetIdentifier(identifier: string): string {
  return identifier.slice(IDENTIFIER_PREFIX.length);
}

export function hashPasswordResetToken(token: string): string {
  return sha256Hex(token.trim());
}

export function newPasswordResetToken(): { token: string; tokenHash: string; expiresAt: Date } {
  const token = randomBytes(32).toString("base64url");
  return {
    token,
    tokenHash: hashPasswordResetToken(token),
    expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
  };
}

export function passwordResetTokenIsUsable(
  row: { expires: Date } | null | undefined,
  now = new Date()
): boolean {
  if (!row) return false;
  return row.expires.getTime() > now.getTime();
}

export function passwordMeetsResetPolicy(password: string): boolean {
  return password.trim().length >= PASSWORD_RESET_MIN_LENGTH;
}

export function buildPasswordResetUrl(origin: string, token: string): string {
  const base = origin.replace(/\/$/, "");
  return `${base}/auth/reset-password?token=${encodeURIComponent(token)}`;
}
