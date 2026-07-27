import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { resolveEventAccess } from "@/lib/workspace/event-access";
import type { EventAccessContext } from "@/lib/workspace/event-access";

/**
 * Access control for every organiser-facing gift surface.
 *
 * Gift money is finance data, so it rides on the existing MANAGE_FINANCES event
 * permission rather than inventing a parallel role system: whoever the
 * organiser already trusts with the event wallet is who can see gifts.
 */

export type GiftGuardFailure = { ok: false; status: number; error: string };
export type GiftGuardSuccess = {
  ok: true;
  userId: string;
  eventId: string;
  access: EventAccessContext;
  canRefund: boolean;
};
export type GiftGuardResult = GiftGuardSuccess | GiftGuardFailure;

export async function requireGiftFinanceAccess(eventId: string | null): Promise<GiftGuardResult> {
  if (!eventId) {
    return { ok: false, status: 400, error: "eventId is required" };
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { ok: false, status: 401, error: "Sign in to view event gifts" };
  }

  const access = await resolveEventAccess(eventId, session.user.id, session.user.role);
  if (!access) {
    return { ok: false, status: 404, error: "Event not found" };
  }
  if (!access.permissions.has("MANAGE_FINANCES")) {
    return { ok: false, status: 403, error: "You do not have access to this event's gifts" };
  }

  return {
    ok: true,
    userId: session.user.id,
    eventId,
    access,
    // Refunds move real money back out, so they stay with the owner.
    canRefund: access.isOwner || access.collaboratorRole === "OWNER",
  };
}

export async function requireSignedInUser(): Promise<
  { ok: true; userId: string } | GiftGuardFailure
> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { ok: false, status: 401, error: "Sign in to view your gifts" };
  }
  return { ok: true, userId: session.user.id };
}
