import { prisma } from "@/lib/prisma";
import { LIVE_PRODUCTION_ORDER_STATUSES } from "@/lib/invitation/studio-access";

/**
 * When a personalized invite was minted before Event Companion existed,
 * inherit enablement / studio config from the event’s live production invite
 * (or any sibling that already has the portal on).
 */
export async function resolveCanonicalCompanionConfig(
  eventId: string,
  invitationId: string
) {
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

  const preferredId =
    liveOrder?.invitationId && liveOrder.invitationId !== invitationId
      ? liveOrder.invitationId
      : null;

  if (preferredId) {
    return prisma.invitation.findUnique({
      where: { id: preferredId },
      select: { id: true, featureConfig: true, postAdmissionEnabled: true },
    });
  }

  return prisma.invitation.findFirst({
    where: {
      eventId,
      id: { not: invitationId },
      postAdmissionEnabled: true,
    },
    orderBy: { updatedAt: "desc" },
    select: { id: true, featureConfig: true, postAdmissionEnabled: true },
  });
}

/** True when this invite or an inheritable sibling has Event Companion on. */
export async function resolvePostAdmissionEnabled(input: {
  eventId: string;
  invitationId: string;
  invitationEnabled: boolean;
}): Promise<boolean> {
  if (input.invitationEnabled) return true;
  const canonical = await resolveCanonicalCompanionConfig(
    input.eventId,
    input.invitationId
  );
  return Boolean(canonical?.postAdmissionEnabled);
}
