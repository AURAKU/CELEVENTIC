const BCRYPT_PREFIX = "$2";
const BCRYPT_ROUNDS = 12;

export const PASSWORD_ALGORITHM = "bcrypt" as const;

export async function hashPassword(plaintext: string): Promise<string> {
  const bcrypt = await import("bcryptjs");
  return bcrypt.hash(plaintext, BCRYPT_ROUNDS);
}

export async function verifyPassword(plaintext: string, storedHash: string | null | undefined): Promise<boolean> {
  if (!storedHash) return false;

  if (storedHash.startsWith(BCRYPT_PREFIX)) {
    const bcrypt = await import("bcryptjs");
    return bcrypt.compare(plaintext, storedHash);
  }

  // Future: add argon2 or legacy algorithm branches here and re-hash on success.
  return false;
}

export function isBcryptHash(hash: string): boolean {
  return hash.startsWith(BCRYPT_PREFIX);
}
