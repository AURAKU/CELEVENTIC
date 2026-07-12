import { cache } from "react";
import { NextAuthOptions, getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { canAccessAdminPanel } from "@/lib/rbac";
import { verifyCredentials, toSafeLoginMessage, LoginFailureReason } from "@/lib/auth/login-diagnostics";
import { authLog } from "@/lib/auth/auth-logger";
import {
  applySyncedUserToToken,
  invalidateAuthToken,
  isTokenIssuedBeforeInvalidation,
  syncUserTokenFromDb,
} from "@/lib/auth/sync-user-token";
import type { UserRole } from "@prisma/client";

export { canAccessAdminPanel as isAdminRole };

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      phone?: string | null;
      name?: string | null;
      image?: string | null;
      role: UserRole;
      isAdminView?: boolean;
      accountType?: string | null;
      onboardingCompletedAt?: string | null;
    };
  }
  interface User {
    role: UserRole;
    phone?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    phone?: string | null;
    isAdminView?: boolean;
    invalid?: boolean;
    accountType?: string | null;
    onboardingCompletedAt?: string | null;
  }
}

interface SessionUpdate {
  isAdminView?: boolean;
}

const useSecureCookies =
  process.env.NODE_ENV === "production" || process.env.NEXTAUTH_URL?.startsWith("https://");

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as NextAuthOptions["adapter"],
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  ...(process.env.AUTH_TRUST_HOST === "true" ||
  process.env.NODE_ENV === "production" ||
  process.env.VERCEL === "1"
    ? ({ trustHost: true } as Partial<NextAuthOptions>)
    : {}),
  cookies: useSecureCookies
    ? {
        sessionToken: {
          name: "__Secure-next-auth.session-token",
          options: { httpOnly: true, sameSite: "lax", path: "/", secure: true },
        },
      }
    : undefined,
  pages: {
    signIn: "/auth/login",
    error: "/auth/login",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      allowDangerousEmailAccountLinking: true,
    }),
    CredentialsProvider({
      id: "credentials",
      name: "credentials",
      credentials: {
        identifier: { label: "Email or Phone", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const result = await verifyCredentials(
          credentials?.identifier ?? "",
          credentials?.password ?? ""
        );
        if (result.ok) return result.user;

        if (
          result.reason === LoginFailureReason.ACCOUNT_SUSPENDED ||
          result.reason === LoginFailureReason.EMAIL_NOT_VERIFIED ||
          result.reason === LoginFailureReason.DATABASE_ERROR ||
          result.reason === LoginFailureReason.MISSING_CREDENTIALS
        ) {
          throw new Error(toSafeLoginMessage(result.reason));
        }
        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.phone = user.phone;
        token.invalid = false;
      }
      if (trigger === "update" && session) {
        const update = session as SessionUpdate;
        if (update.isAdminView !== undefined) token.isAdminView = update.isAdminView;
      }

      if (token.id && !token.invalid) {
        const synced = await syncUserTokenFromDb(token.id);
        if (!synced) {
          authLog("jwt_invalidated", { userId: token.id, reason: "missing_or_suspended" });
          return invalidateAuthToken(token);
        }
        if (isTokenIssuedBeforeInvalidation(token.iat as number | undefined, synced.sessionInvalidatedAt)) {
          authLog("jwt_invalidated", { userId: token.id, reason: "force_logout" });
          return invalidateAuthToken(token);
        }
        authLog("jwt_sync", { userId: token.id, role: synced.role });
        return applySyncedUserToToken(token, synced);
      }

      return token;
    },
    async session({ session, token }) {
      if (token.invalid || !token.id) {
        return { ...session, user: undefined };
      }
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.phone = token.phone;
        session.user.isAdminView = token.isAdminView;
        session.user.accountType = token.accountType ?? null;
        session.user.onboardingCompletedAt = token.onboardingCompletedAt ?? null;
        if (token.name) session.user.name = token.name as string;
        if (token.email) session.user.email = token.email as string;
        if (token.picture) session.user.image = token.picture as string;
      }
      return session;
    },
  },
};

export const getSession = cache(() => getServerSession(authOptions));

export async function requireAuth() {
  const session = await getSession();
  if (!session?.user) throw new Error("Unauthorized");
  return session;
}

export async function requireAdmin() {
  const session = await requireAuth();
  if (!canAccessAdminPanel(session.user.role)) throw new Error("Forbidden");
  return session;
}

export async function forceLogoutUser(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { sessionInvalidatedAt: new Date() },
  });
}
