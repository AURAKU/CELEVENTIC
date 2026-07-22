import type { UserRole } from "@prisma/client";
import { isPlatformAdmin } from "@/lib/rbac/permissions";

/**
 * Platform admins (ADMIN + SUPER_ADMIN) get every package, feature, and
 * studio unlock without payment. Security gates must call this server-side;
 * client UI may only mirror it for labels/CTAs.
 */
export function hasFullPackageAccess(role: UserRole | string | null | undefined): boolean {
  if (!role) return false;
  return isPlatformAdmin(role as UserRole);
}

/** Alias for commerce / checkout short-circuits. */
export function isAdminCommerceBypass(role: UserRole | string | null | undefined): boolean {
  return hasFullPackageAccess(role);
}
