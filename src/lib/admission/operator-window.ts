import type { UserRole } from "@prisma/client";

/**
 * Platform admins and the event organiser may admit before `validFrom`.
 * That is how they test Event Companion and polish post-admission pages
 * while the celebration is still weeks away. Door staff stay gated.
 */
export function operatorMayBypassAdmissionWindow(opts: {
  role?: UserRole | null;
  userId?: string | null;
  organizerId?: string | null;
}): boolean {
  if (opts.role === "SUPER_ADMIN" || opts.role === "ADMIN") return true;
  if (opts.userId && opts.organizerId && opts.userId === opts.organizerId) return true;
  return false;
}
