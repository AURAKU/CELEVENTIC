import type { UserRole } from "@prisma/client";

/** Logical RBAC roles. Maps onto Prisma `UserRole` + org context. */
export type RbacRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "ORGANIZATION"
  | "VENDOR"
  | "USER";

export const RBAC_ROLES: readonly RbacRole[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "ORGANIZATION",
  "VENDOR",
  "USER",
] as const;

/** Fine-grained permissions, never compare role strings in route handlers. */
export const Permission = {
  ACCESS_ADMIN_PANEL: "ACCESS_ADMIN_PANEL",
  ACCESS_DASHBOARD: "ACCESS_DASHBOARD",
  ACCESS_VENDOR_PORTAL: "ACCESS_VENDOR_PORTAL",
  MANAGE_PLATFORM_USERS: "MANAGE_PLATFORM_USERS",
  MANAGE_ADMINS: "MANAGE_ADMINS",
  ASSIGN_SUPER_ADMIN: "ASSIGN_SUPER_ADMIN",
  MANAGE_ORGANIZATION: "MANAGE_ORGANIZATION",
  VIEW_SYSTEM_HEALTH: "VIEW_SYSTEM_HEALTH",
  FORCE_USER_LOGOUT: "FORCE_USER_LOGOUT",
  RESET_USER_PASSWORD: "RESET_USER_PASSWORD",
  VIEW_AUDIT_LOGS: "VIEW_AUDIT_LOGS",
  SWITCH_ADMIN_VIEW: "SWITCH_ADMIN_VIEW",
  CELECARD_VIEW: "CELECARD_VIEW",
  CELECARD_CREATE: "CELECARD_CREATE",
  CELECARD_EDIT: "CELECARD_EDIT",
  CELECARD_ACTIVATE: "CELECARD_ACTIVATE",
  CELECARD_DEACTIVATE: "CELECARD_DEACTIVATE",
  CELECARD_SUSPEND: "CELECARD_SUSPEND",
  CELECARD_SUBSCRIPTION_MANAGE: "CELECARD_SUBSCRIPTION_MANAGE",
  CELECARD_GRANT_COMPLIMENTARY: "CELECARD_GRANT_COMPLIMENTARY",
  CELECARD_PRICING_MANAGE: "CELECARD_PRICING_MANAGE",
  CELECARD_TEMPLATE_MANAGE: "CELECARD_TEMPLATE_MANAGE",
  CELECARD_SUPPORT: "CELECARD_SUPPORT",
  CELECARD_AUDIT_VIEW: "CELECARD_AUDIT_VIEW",
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];

export interface RbacContext {
  role: UserRole;
  organizationId?: string | null;
}

/** Map Prisma role (+ optional org) to logical RBAC role. */
export function toRbacRole(role: UserRole, organizationId?: string | null): RbacRole {
  if (role === "SUPER_ADMIN") return "SUPER_ADMIN";
  if (role === "ADMIN") return "ADMIN";
  if (role === "VENDOR") return "VENDOR";
  if (organizationId && (role === "ORGANIZER" || role === "AGENCY" || role === "STAFF")) {
    return "ORGANIZATION";
  }
  if (
    role === "ORGANIZER" ||
    role === "GUEST" ||
    role === "STAFF" ||
    role === "VENUE_OWNER" ||
    role === "AGENCY"
  ) {
    return "USER";
  }
  return "USER";
}
