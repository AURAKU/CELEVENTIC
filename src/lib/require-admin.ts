import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canAccessAdminPanel, hasPermission } from "@/lib/rbac";
import type { Permission } from "@/lib/rbac/types";
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

/** Admin panel plus a specific CeleYou permission. Enforced on APIs, not buttons. */
export async function requireCeleCardPermission(permission: Permission) {
  const session = await requireAdminSession();
  if (!session) return null;
  if (!hasPermission({ role: session.user.role }, permission)) return null;
  return session;
}
