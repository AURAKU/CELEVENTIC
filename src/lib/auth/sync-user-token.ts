import { prisma } from "@/lib/prisma";
import type { UserRole } from "@prisma/client";
import type { JWT } from "next-auth/jwt";

export interface SyncedUserToken {
  role: UserRole;
  name: string | null;
  email: string | null;
  phone: string | null;
  picture: string | null;
  valid: boolean;
  sessionInvalidatedAt: Date | null;
  accountType: string | null;
  onboardingCompletedAt: Date | null;
}

export async function syncUserTokenFromDb(userId: string): Promise<SyncedUserToken | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      status: true,
      name: true,
      email: true,
      phone: true,
      avatarUrl: true,
      sessionInvalidatedAt: true,
      accountType: true,
      onboardingCompletedAt: true,
    },
  });

  if (!user || user.status === "SUSPENDED") return null;

  return {
    role: user.role,
    name: user.name,
    email: user.email,
    phone: user.phone,
    picture: user.avatarUrl,
    valid: true,
    sessionInvalidatedAt: user.sessionInvalidatedAt,
    accountType: user.accountType,
    onboardingCompletedAt: user.onboardingCompletedAt,
  };
}

export function isTokenIssuedBeforeInvalidation(
  tokenIat: number | undefined,
  sessionInvalidatedAt: Date | null
): boolean {
  if (!tokenIat || !sessionInvalidatedAt) return false;
  return tokenIat * 1000 < sessionInvalidatedAt.getTime();
}

export function applySyncedUserToToken(token: JWT, synced: SyncedUserToken): JWT {
  return {
    ...token,
    role: synced.role,
    name: synced.name ?? token.name,
    email: synced.email ?? token.email,
    phone: synced.phone ?? token.phone,
    picture: synced.picture ?? token.picture,
    accountType: synced.accountType,
    onboardingCompletedAt: synced.onboardingCompletedAt?.toISOString() ?? null,
    invalid: false,
  };
}

export function invalidateAuthToken(token: JWT): JWT {
  return {
    ...token,
    invalid: true,
    role: "GUEST" as UserRole,
  };
}
