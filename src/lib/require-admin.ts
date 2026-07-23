import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canAccessAdminPanel } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@prisma/client";

/** Prefer live DB role so session JWT drift cannot block admin delete/edit. */
export async function requireAdminSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  const role = (dbUser?.role ?? session.user.role) as UserRole;
  if (!canAccessAdminPanel(role)) return null;

  return {
    ...session,
    user: { ...session.user, role },
  };
}

export async function requireSuperAdminSession() {
  const session = await requireAdminSession();
  if (!session || session.user.role !== "SUPER_ADMIN") return null;
  return session;
}
