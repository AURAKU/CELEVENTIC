import type { UserRole } from "@prisma/client";
import { Permission, toRbacRole, type RbacContext } from "./types";

const ROLE_PERMISSIONS: Record<string, readonly Permission[]> = {
  SUPER_ADMIN: [
    Permission.ACCESS_ADMIN_PANEL,
    Permission.ACCESS_DASHBOARD,
    Permission.MANAGE_PLATFORM_USERS,
    Permission.MANAGE_ADMINS,
    Permission.ASSIGN_SUPER_ADMIN,
    Permission.MANAGE_ORGANIZATION,
    Permission.VIEW_SYSTEM_HEALTH,
    Permission.FORCE_USER_LOGOUT,
    Permission.RESET_USER_PASSWORD,
    Permission.VIEW_AUDIT_LOGS,
    Permission.SWITCH_ADMIN_VIEW,
    Permission.CELECARD_VIEW,
    Permission.CELECARD_CREATE,
    Permission.CELECARD_EDIT,
    Permission.CELECARD_ACTIVATE,
    Permission.CELECARD_DEACTIVATE,
    Permission.CELECARD_SUSPEND,
    Permission.CELECARD_SUBSCRIPTION_MANAGE,
    Permission.CELECARD_GRANT_COMPLIMENTARY,
    Permission.CELECARD_PRICING_MANAGE,
    Permission.CELECARD_TEMPLATE_MANAGE,
    Permission.CELECARD_SUPPORT,
    Permission.CELECARD_AUDIT_VIEW,
  ],
  ADMIN: [
    Permission.ACCESS_ADMIN_PANEL,
    Permission.ACCESS_DASHBOARD,
    Permission.MANAGE_PLATFORM_USERS,
    Permission.MANAGE_ADMINS,
    Permission.MANAGE_ORGANIZATION,
    Permission.VIEW_SYSTEM_HEALTH,
    Permission.FORCE_USER_LOGOUT,
    Permission.RESET_USER_PASSWORD,
    Permission.VIEW_AUDIT_LOGS,
    Permission.SWITCH_ADMIN_VIEW,
    Permission.CELECARD_VIEW,
    Permission.CELECARD_CREATE,
    Permission.CELECARD_EDIT,
    Permission.CELECARD_ACTIVATE,
    Permission.CELECARD_DEACTIVATE,
    Permission.CELECARD_SUSPEND,
    Permission.CELECARD_SUBSCRIPTION_MANAGE,
    Permission.CELECARD_GRANT_COMPLIMENTARY,
    Permission.CELECARD_TEMPLATE_MANAGE,
    Permission.CELECARD_SUPPORT,
    Permission.CELECARD_AUDIT_VIEW,
  ],
  ORGANIZATION: [
    Permission.ACCESS_DASHBOARD,
    Permission.MANAGE_ORGANIZATION,
  ],
  VENDOR: [Permission.ACCESS_DASHBOARD, Permission.ACCESS_VENDOR_PORTAL],
  USER: [Permission.ACCESS_DASHBOARD],
};

export function permissionsFor(ctx: RbacContext): readonly Permission[] {
  const rbacRole = toRbacRole(ctx.role, ctx.organizationId);
  return ROLE_PERMISSIONS[rbacRole] ?? ROLE_PERMISSIONS.USER;
}

export function hasPermission(ctx: RbacContext, permission: Permission): boolean {
  return permissionsFor(ctx).includes(permission);
}

export function canAccessAdminPanel(role?: UserRole | null): boolean {
  if (!role) return false;
  return hasPermission({ role }, Permission.ACCESS_ADMIN_PANEL);
}

export function canAccessVendorPortal(role: UserRole): boolean {
  return hasPermission({ role }, Permission.ACCESS_VENDOR_PORTAL);
}

export function isPlatformAdmin(role: UserRole): boolean {
  return role === "SUPER_ADMIN" || role === "ADMIN";
}
