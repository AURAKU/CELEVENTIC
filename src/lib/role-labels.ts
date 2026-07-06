import type { UserRole } from "@prisma/client";

export const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Platform Admin",
  ORGANIZER: "User (Organizer)",
  VENDOR: "Vendor",
  VENUE_OWNER: "Venue Owner",
  AGENCY: "Agency",
  STAFF: "Staff",
  GUEST: "Guest",
};

export function formatRoleLabel(role: UserRole | string): string {
  return ROLE_LABELS[role as UserRole] ?? role;
}
