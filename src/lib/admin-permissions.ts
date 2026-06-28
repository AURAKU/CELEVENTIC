import { ADMIN_ROLES } from "@/lib/constants";
import type { UserRole } from "@prisma/client";

const PLATFORM_ADMIN_ROLES = ADMIN_ROLES as readonly UserRole[];

/** Platform admin panel access (SUPER_ADMIN, ADMIN). */
export function canAccessAdminPanel(role: UserRole): boolean {
  return PLATFORM_ADMIN_ROLES.includes(role);
}

/** Only platform admins may switch between admin panel and organizer user view. */
export function canSwitchAdminView(role: UserRole): boolean {
  return canAccessAdminPanel(role);
}

/** Only platform admins may assign or change user roles. */
export function canAssignUserRoles(actorRole: UserRole): boolean {
  return canAccessAdminPanel(actorRole);
}

/** Only SUPER_ADMIN may grant ADMIN or SUPER_ADMIN roles. */
export function canAssignAdminRole(actorRole: UserRole): boolean {
  return actorRole === "SUPER_ADMIN";
}

const NON_ADMIN_ASSIGNABLE_ROLES: UserRole[] = [
  "ORGANIZER",
  "VENDOR",
  "VENUE_OWNER",
  "AGENCY",
  "STAFF",
  "GUEST",
];

const ALL_ASSIGNABLE_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "ADMIN",
  ...NON_ADMIN_ASSIGNABLE_ROLES,
];

export function assignableRolesFor(actorRole: UserRole): UserRole[] {
  if (!canAssignUserRoles(actorRole)) return [];
  if (canAssignAdminRole(actorRole)) return ALL_ASSIGNABLE_ROLES;
  return NON_ADMIN_ASSIGNABLE_ROLES;
}

export function assertRoleAssignmentAllowed(actorRole: UserRole, targetRole: UserRole): void {
  if (!canAssignUserRoles(actorRole)) {
    throw new Error("Only platform administrators can assign roles");
  }
  if ((targetRole === "ADMIN" || targetRole === "SUPER_ADMIN") && !canAssignAdminRole(actorRole)) {
    throw new Error("Only Super Admins can assign Admin or Super Admin roles");
  }
}

/** Only Super Admins may modify or remove other platform admin accounts. */
export function isPlatformAdminRole(role: UserRole): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

export function canModifyUser(actorRole: UserRole, targetRole: UserRole): boolean {
  if (!canAssignUserRoles(actorRole)) return false;
  if (isPlatformAdminRole(targetRole) && !canAssignAdminRole(actorRole)) return false;
  return true;
}

export function assertUserModificationAllowed(actorRole: UserRole, targetRole: UserRole): void {
  if (!canModifyUser(actorRole, targetRole)) {
    throw new Error("Only Super Admins can modify platform administrator accounts");
  }
}
