import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireEventPermission } from "@/lib/workspace/event-access";
import { EventPermissionKey } from "@/lib/workspace/permission-keys";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Shared authorisation for every bulk-import endpoint.
 *
 * Importing guests creates invitations, mints entry passes and can send
 * thousands of messages, so it is gated on MANAGE_GUESTS rather than mere
 * event access — a vendor or scanner with a workspace seat must not be able to
 * bulk-invite. Delivery additionally requires MESSAGE_GUESTS.
 */

export interface AuthorizedContext {
  userId: string;
  eventId: string;
}

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export function errorResponse(error: unknown, fallbackStatus = 400) {
  const message = error instanceof Error ? error.message : "Something went wrong";
  return NextResponse.json({ error: message }, { status: fallbackStatus });
}

type AuthResult =
  | { error: NextResponse; ctx?: undefined }
  | { error?: undefined; ctx: AuthorizedContext };

export async function authorizeEvent(
  eventId: string,
  permission: keyof typeof EventPermissionKey = "MANAGE_GUESTS"
): Promise<AuthResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  try {
    await requireEventPermission(
      eventId,
      session.user.id,
      session.user.role,
      EventPermissionKey[permission]
    );
  } catch {
    return {
      error: NextResponse.json(
        { error: "You do not have permission to manage this event's guest list" },
        { status: 403 }
      ),
    };
  }
  return { ctx: { userId: session.user.id, eventId } };
}

/** Resolve a batch and authorise against the event that owns it. */
export async function authorizeBatch(
  batchId: string,
  permission: keyof typeof EventPermissionKey = "MANAGE_GUESTS"
): Promise<AuthResult & { batchEventId?: string }> {
  const batch = await prisma.guestImportBatch.findUnique({
    where: { id: batchId },
    select: { id: true, eventId: true },
  });
  if (!batch) {
    return { error: NextResponse.json({ error: "Import not found" }, { status: 404 }) };
  }
  const auth = await authorizeEvent(batch.eventId, permission);
  return { ...auth, batchEventId: batch.eventId };
}

export async function authorizeGeneralBatch(
  batchId: string,
  permission: keyof typeof EventPermissionKey = "MANAGE_GUESTS"
): Promise<AuthResult> {
  const batch = await prisma.generalPassBatch.findUnique({
    where: { id: batchId },
    select: { eventId: true },
  });
  if (!batch) {
    return { error: NextResponse.json({ error: "General pass batch not found" }, { status: 404 }) };
  }
  return authorizeEvent(batch.eventId, permission);
}

/** Throttle the expensive endpoints (parse, confirm, delivery, rollback). */
export async function guardRate(
  req: Request,
  userId: string,
  scope: string,
  limit = 30,
  windowSeconds = 60
): Promise<NextResponse | null> {
  const result = await rateLimit(`guest-import:${scope}:${userId}:${clientIp(req)}`, limit, windowSeconds);
  if (!result.success) {
    return NextResponse.json(
      { error: "Too many requests — wait a moment and try again." },
      { status: 429 }
    );
  }
  return null;
}
