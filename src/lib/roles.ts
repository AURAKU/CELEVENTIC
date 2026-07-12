import { canAccessAdminPanel } from "@/lib/rbac";
import type { UserRole } from "@prisma/client";

/** @deprecated Use canAccessAdminPanel from @/lib/rbac */
export function isAdminRole(role: UserRole) {
  return canAccessAdminPanel(role);
}
