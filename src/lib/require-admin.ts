import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdminRole } from "@/lib/roles";
import type { UserRole } from "@prisma/client";

export async function requireAdminSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !isAdminRole(session.user.role as UserRole)) {
    return null;
  }
  return session;
}
