import { cache } from "react";
import { NextAuthOptions, getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { isAdminRole } from "@/lib/roles";
import type { UserRole } from "@prisma/client";

export { isAdminRole };

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
  }
}

interface SessionUpdate {
  isAdminView?: boolean;
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as NextAuthOptions["adapter"],
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
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
        if (!credentials?.identifier || !credentials?.password) return null;

        const identifier = credentials.identifier.trim();
        const isEmail = identifier.includes("@");

        const user = await prisma.user.findFirst({
          where: isEmail ? { email: identifier } : { phone: identifier },
        });

        if (!user || !user.passwordHash || user.status === "SUSPENDED") return null;

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          phone: user.phone,
          name: user.name,
          image: user.avatarUrl,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.phone = user.phone;
      }
      if (trigger === "update" && session) {
        const update = session as SessionUpdate;
        if (update.isAdminView !== undefined) {
          token.isAdminView = update.isAdminView;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.phone = token.phone;
        session.user.isAdminView = token.isAdminView;
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
  if (!isAdminRole(session.user.role)) throw new Error("Forbidden");
  return session;
}
