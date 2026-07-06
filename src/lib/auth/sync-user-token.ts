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
}

/** Load the latest user record so JWT/session reflect role changes without re-login. */
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
    },
  });

  if (!user || user.status === "SUSPENDED") {
    return null;
  }

  return {
    role: user.role,
    name: user.name,
    email: user.email,
    phone: user.phone,
    picture: user.avatarUrl,
    valid: true,
  };
}

export function applySyncedUserToToken(token: JWT, synced: SyncedUserToken): JWT {
  return {
    ...token,
    role: synced.role,
    name: synced.name ?? token.name,
    email: synced.email ?? token.email,
    phone: synced.phone ?? token.phone,
    picture: synced.picture ?? token.picture,
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
