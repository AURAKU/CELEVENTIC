import { randomBytes } from "node:crypto";
import { sha256Hex } from "@/lib/crypto/sha256-hex";

const JOIN_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function hashProximitySecret(value: string): string {
  return sha256Hex(value.trim().toUpperCase());
}

export function newProximityJoinCode(bytes: Uint8Array = randomBytes(6)): string {
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += JOIN_ALPHABET[bytes[i]! % JOIN_ALPHABET.length];
  }
  return code;
}

export function normalizeJoinCode(value: string): string {
  return value.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 8);
}

export function newProximityVerifyCode(bytes: Uint8Array = randomBytes(2)): string {
  const n = (bytes[0]! << 8) + bytes[1]!;
  return String(1000 + (n % 9000));
}

export function newProximityDiscoveryId(): string {
  return randomBytes(16).toString("hex");
}

export function newProximityShareToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: sha256Hex(token) };
}

export function hashProximityShareToken(token: string): string {
  return sha256Hex(token.trim());
}

export type ProximityShareTokenRow = {
  toUserId: string;
  redeemedAt: Date | null;
  expiresAt: Date;
};

export type ProximityShareTokenVerdict = "ok" | "unknown" | "replay" | "expired";

export function inspectProximityShareToken(
  row: ProximityShareTokenRow | null | undefined,
  userId: string,
  now = new Date()
): ProximityShareTokenVerdict {
  if (!row || row.toUserId !== userId) return "unknown";
  if (row.redeemedAt) return "replay";
  if (row.expiresAt.getTime() <= now.getTime()) return "expired";
  return "ok";
}
