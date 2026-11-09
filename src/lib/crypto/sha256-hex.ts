import { createHash } from "node:crypto";

/** Deterministic SHA-256 hex for admission token hashing. */
export function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}
