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

/** Platform admins may assign and change user roles. */
export function canAssignUserRoles(actorRole: UserRole): boolean {
  return canAccessAdminPanel(actorRole);
}

/** Platform admins may grant the Admin role; only Super Admin may grant Super Admin. */
export function canAssignAdminRole(actorRole: UserRole): boolean {
  return canAccessAdminPanel(actorRole);
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

const ADMIN_ASSIGNABLE_ROLES: UserRole[] = ["ADMIN", ...NON_ADMIN_ASSIGNABLE_ROLES];

export function assignableRolesFor(actorRole: UserRole): UserRole[] {
  if (!canAssignUserRoles(actorRole)) return [];
  if (actorRole === "SUPER_ADMIN") return ALL_ASSIGNABLE_ROLES;
  if (actorRole === "ADMIN") return ADMIN_ASSIGNABLE_ROLES;
  return [];
}

export function assertRoleAssignmentAllowed(actorRole: UserRole, targetRole: UserRole): void {
  if (!canAssignUserRoles(actorRole)) {
    throw new Error("Only platform administrators can assign roles");
  }
  if (targetRole === "SUPER_ADMIN" && actorRole !== "SUPER_ADMIN") {
    throw new Error("Only Super Admins can assign the Super Admin role");
  }
  const allowed = assignableRolesFor(actorRole);
  if (!allowed.includes(targetRole)) {
    throw new Error("You cannot assign this role");
  }
}

export function isPlatformAdminRole(role: UserRole): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

/** Platform admins may modify most users; only Super Admin may modify Super Admin accounts. */
export function canModifyUser(actorRole: UserRole, targetRole: UserRole): boolean {
  if (!canAssignUserRoles(actorRole)) return false;
  if (targetRole === "SUPER_ADMIN" && actorRole !== "SUPER_ADMIN") return false;
  return true;
}

export function assertUserModificationAllowed(actorRole: UserRole, targetRole: UserRole): void {
  if (!canModifyUser(actorRole, targetRole)) {
    throw new Error("Only Super Admins can modify Super Admin accounts");
  }
}
