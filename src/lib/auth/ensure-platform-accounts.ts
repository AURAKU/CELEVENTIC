import { PrismaClient, UserRole, UserStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

export const PLATFORM_ACCOUNTS = [
  { email: "admin@celeventic.com", password: "Admin@123", name: "Super Admin", role: UserRole.SUPER_ADMIN },
  { email: "organizer@celeventic.com", password: "Organizer@123", name: "Demo Organizer", role: UserRole.ORGANIZER },
  { email: "vendor@celeventic.com", password: "Vendor@123", name: "Demo Vendor", role: UserRole.VENDOR },
] as const;

export interface EnsurePlatformAccountsResult {
  email: string;
  role: UserRole;
  created: boolean;
  passwordReset: boolean;
}

/**
 * Ensures platform demo/admin accounts exist with correct roles on any environment (local or live).
 * Password is only set when the account is new, has no password, or FORCE_RESET_ADMIN_PASSWORD=true.
 */
export async function ensurePlatformAccounts(
  prisma: PrismaClient
): Promise<EnsurePlatformAccountsResult[]> {
  const forceReset = process.env.FORCE_RESET_ADMIN_PASSWORD === "true";
  const results: EnsurePlatformAccountsResult[] = [];

  for (const account of PLATFORM_ACCOUNTS) {
    const email = account.email.toLowerCase();
    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true, passwordHash: true },
    });

    const passwordHash = await bcrypt.hash(account.password, 12);
    const shouldSetPassword = !existing || !existing.passwordHash || forceReset;

    const user = await prisma.user.upsert({
      where: { email },
      update: {
        role: account.role,
        status: UserStatus.ACTIVE,
        isVerified: true,
        emailVerified: new Date(),
        ...(shouldSetPassword ? { passwordHash } : {}),
      },
      create: {
        email,
        name: account.name,
        passwordHash,
        role: account.role,
        status: UserStatus.ACTIVE,
        isVerified: true,
        emailVerified: new Date(),
      },
    });

    results.push({
      email: user.email ?? email,
      role: user.role,
      created: !existing,
      passwordReset: shouldSetPassword,
    });
  }

  return results;
}
