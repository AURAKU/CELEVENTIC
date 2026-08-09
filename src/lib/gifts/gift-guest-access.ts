import { prisma } from "@/lib/prisma";
import { LIVE_PRODUCTION_ORDER_STATUSES } from "@/lib/invitation/studio-access";
import { resolveProductionInvitationOrder } from "@/services/invitations/production-invitation-source.service";
import { isInvitationFeatureEnabled } from "@/services/invitation-features/feature-resolver";

/**
 * Guest gift / contribution access.
 *
 * Cash gifts are shown to guests only when the organiser (or admin) turns
 * `GIFT_WALLET` on — never by default. CTAs live on Event Guide + Event
 * Companion; payment APIs must re-check this gate so a hidden UI is not enough.
 */

/** Resolve the studio / production invitation that owns companion feature flags. */
export async function resolveGiftStudioInvitationId(eventId: string): Promise<string | null> {
  const liveOrder = await prisma.invitationOrder.findFirst({
    where: {
      eventId,
      archivedAt: null,
      status: { in: [...LIVE_PRODUCTION_ORDER_STATUSES] },
      invitationId: { not: null },
    },
    orderBy: { updatedAt: "desc" },
    select: { invitationId: true },
  });

  if (liveOrder?.invitationId) return liveOrder.invitationId;

  const invitations = await prisma.invitation.findMany({
    where: { eventId },
    orderBy: { createdAt: "asc" },
    select: { id: true, postAdmissionEnabled: true, status: true },
  });
  if (!invitations.length) return null;

  for (const invitation of invitations) {
    const order = await resolveProductionInvitationOrder(invitation.id, eventId);
    if (order && order.invitationId === invitation.id) return invitation.id;
  }

  const preferred =
    invitations.find((row) => row.postAdmissionEnabled) ??
    invitations.find((row) => row.status === "PUBLISHED" || row.status === "ACTIVE") ??
    invitations[0];

  return preferred?.id ?? null;
}

/** True when guests may see gift CTAs / open the gift checkout for this event. */
export async function isGuestGiftWalletEnabled(eventId: string): Promise<boolean> {
  const invitationId = await resolveGiftStudioInvitationId(eventId);
  if (!invitationId) return false;
  return isInvitationFeatureEnabled(invitationId, "GIFT_WALLET");
}

/**
 * Server-side gate for public gift pages and payment initialize.
 * Returns a guest-safe reason when blocked.
 */
export async function assertGuestGiftPaymentsAllowed(eventId: string): Promise<
  { ok: true } | { ok: false; status: number; message: string }
> {
  const enabled = await isGuestGiftWalletEnabled(eventId);
  if (!enabled) {
    return {
      ok: false,
      status: 404,
      message: "This gift link is not available",
    };
  }
  return { ok: true };
}
