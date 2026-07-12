import type { UserRole } from "@prisma/client";
import { hasPermission, isPlatformAdmin } from "./permissions";
import { Permission } from "./types";

export function canAccessAdminPanel(role: UserRole): boolean {
  return hasPermission({ role }, Permission.ACCESS_ADMIN_PANEL);
}

export function canSwitchAdminView(role: UserRole): boolean {
  return hasPermission({ role }, Permission.SWITCH_ADMIN_VIEW);
}

export function canAssignUserRoles(actorRole: UserRole): boolean {
  return hasPermission({ role: actorRole }, Permission.MANAGE_PLATFORM_USERS);
}

export function canAssignAdminRole(actorRole: UserRole): boolean {
  return hasPermission({ role: actorRole }, Permission.MANAGE_ADMINS);
}

const NON_ADMIN_ASSIGNABLE_ROLES: UserRole[] = [
  "ORGANIZER",
  "VENDOR",
  "VENUE_OWNER",
  "AGENCY",
  "STAFF",
  "GUEST",
];

const ALL_ASSIGNABLE_ROLES: UserRole[] = ["SUPER_ADMIN", "ADMIN", ...NON_ADMIN_ASSIGNABLE_ROLES];
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

export { isPlatformAdmin };
