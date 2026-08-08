import type { Prisma } from "@prisma/client";

/**
 * Which invitation is "the live one" for an event.
 *
 * `InvitationStatus` is `DRAFT | ACTIVE | EXPIRED`. Several public surfaces were
 * filtering on `["PUBLISHED", "APPROVED"]` — values that do not exist in the
 * enum — so those lookups matched nothing and silently rendered empty pages.
 * This is the single definition every public read path should use.
 */
export const LIVE_INVITATION_WHERE = {
  status: "ACTIVE",
  archivedAt: null,
} as const satisfies Prisma.InvitationWhereInput;

export function liveInvitationWhere(eventId: string): Prisma.InvitationWhereInput {
  return { eventId, ...LIVE_INVITATION_WHERE };
}

/**
 * Fallback for events whose invitation has not been activated yet: prefer the
 * live one, otherwise the most recently touched invitation that has not
 * expired. Callers that render organizer-facing previews want this; callers
 * rendering to guests should stick to `liveInvitationWhere`.
 */
export function latestUsableInvitationWhere(eventId: string): Prisma.InvitationWhereInput {
  return { eventId, status: { not: "EXPIRED" }, archivedAt: null };
}
