import { ADMIN_ROLES } from "@/lib/constants";
import type { UserRole } from "@prisma/client";

export function isAdminRole(role: UserRole) {
  return ADMIN_ROLES.includes(role as (typeof ADMIN_ROLES)[number]);
}
