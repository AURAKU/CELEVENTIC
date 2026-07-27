import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { resolveEventAccess } from "@/lib/workspace/event-access";
import { EventPermissionKey } from "@/lib/workspace/permission-keys";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Authorisation for the search and quick-create endpoints.
 *
 * Two different bars, deliberately:
 *
 *  - **Searching** is allowed to anyone who can manage guests *or* scan at the
 *    gate. Door staff searching a name because a screenshot will not scan is
 *    the single most common real use of this feature, and locking them out
 *    would push them back to shouting across the hall.
 *  - **Creating, editing and revoking** require MANAGE_GUESTS. Minting an
 *    invitation issues a credential that opens a door.
 */

export interface AuthorizedContext {
  userId: string;
  eventId: string;
}

type AuthResult =
  | { error: NextResponse; ctx?: undefined }
  | { error?: undefined; ctx: AuthorizedContext };

const UNAUTHORIZED = () =>
  NextResponse.json({ error: "Unauthorized" }, { status: 401 });

const FORBIDDEN = (message: string) => NextResponse.json({ error: message }, { status: 403 });

/** Require *any* of the listed permissions on the event. */
export async function authorizeEventAny(
  eventId: string,
  permissions: EventPermissionKey[],
  forbiddenMessage: string
): Promise<AuthResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: UNAUTHORIZED() };

  const access = await resolveEventAccess(eventId, session.user.id, session.user.role);
  if (!access) {
    // Same response as a missing permission: whether an event exists is not
    // something an unauthorised caller gets to learn.
    return { error: FORBIDDEN(forbiddenMessage) };
  }
  if (!permissions.some((permission) => access.permissions.has(permission))) {
    return { error: FORBIDDEN(forbiddenMessage) };
  }

  return { ctx: { userId: session.user.id, eventId } };
}

/** Read access: manage the guest list, or work the door. */
export function authorizeSearch(eventId: string): Promise<AuthResult> {
  return authorizeEventAny(
    eventId,
    [EventPermissionKey.MANAGE_GUESTS, EventPermissionKey.SCAN_QR],
    "You do not have permission to view this event's guest list"
  );
}

/** Write access: create, edit, archive, revoke. */
export function authorizeGuestWrite(eventId: string): Promise<AuthResult> {
  return authorizeEventAny(
    eventId,
    [EventPermissionKey.MANAGE_GUESTS],
    "You do not have permission to manage this event's guest list"
  );
}

/**
 * Resolve the event that owns an invitation, then authorise against it.
 *
 * The invitation id alone is never trusted — a caller with access to event A
 * must not be able to edit event B's invitation by guessing its id.
 */
export async function authorizeInvitationWrite(
  invitationId: string
): Promise<AuthResult & { invitationEventId?: string }> {
  const { prisma } = await import("@/lib/prisma");
  const invitation = await prisma.invitation.findUnique({
    where: { id: invitationId },
    select: { eventId: true },
  });
  if (!invitation) {
    return { error: NextResponse.json({ error: "Invitation not found" }, { status: 404 }) };
  }
  const auth = await authorizeGuestWrite(invitation.eventId);
  return { ...auth, invitationEventId: invitation.eventId };
}

function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

/**
 * Throttle by user *and* IP.
 *
 * Typeahead is generous because it fires per keystroke; creation is tight
 * because each call mints a credential and burns an admission code.
 */
export async function guardRate(
  req: Request,
  userId: string,
  scope: string,
  limit: number,
  windowSeconds = 60
): Promise<NextResponse | null> {
  const result = await rateLimit(
    `guest-search:${scope}:${userId}:${clientIp(req)}`,
    limit,
    windowSeconds
  );
  if (!result.success) {
    return NextResponse.json(
      { error: "Too many requests — wait a moment and try again." },
      { status: 429 }
    );
  }
  return null;
}

export function errorResponse(error: unknown, fallbackStatus = 400) {
  const message = error instanceof Error ? error.message : "Something went wrong";
  return NextResponse.json({ error: message }, { status: fallbackStatus });
}
