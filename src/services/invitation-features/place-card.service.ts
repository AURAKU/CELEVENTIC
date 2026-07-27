import { prisma } from "@/lib/prisma";
import { resolveInvitationFeatures } from "@/services/invitation-features/feature-resolver";
import { computeAllowance } from "@/lib/admission/admission-logic";
import {
  resolvePlaceCardConfig,
  shouldShowPlaceCard,
  type PlaceCardViewData,
} from "@/lib/invitation-features/place-card";

/**
 * Personalised Place Card — server resolution.
 *
 * Reads the organiser's config out of the shared feature layer and binds it to
 * the live party allowance, so a published invitation reflects an allowance or
 * arrival change on the very next guest view. Nothing here is cached: the
 * public invite route is `force-dynamic`.
 */

export type { PlaceCardViewData };

/** Statuses in which a pass still governs its invitation's admitted count. */
const LIVE_PASS_STATUSES = [
  "ACTIVE",
  "PARTIALLY_ADMITTED",
  "ADMITTED",
  "PENDING_SYNC",
  "CONFLICT",
  "MANUAL_REVIEW",
] as const;

/**
 * Resolve the place card for one invitation, or null when it should not render.
 *
 * @param guestName  personalised recipient, when the link carried a guest token
 */
export async function resolvePlaceCard(
  invitationId: string,
  guestName?: string | null
): Promise<PlaceCardViewData | null> {
  const invitation = await prisma.invitation.findUnique({
    where: { id: invitationId },
    select: {
      id: true,
      name: true,
      admissionAllowance: true,
      admittedCount: true,
      guests: {
        select: { plusOnes: true, group: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!invitation) return null;

  const features = await resolveInvitationFeatures(invitationId);
  const feature = features.find((f) => f.key === "PLACE_CARD");
  const config = resolvePlaceCardConfig(feature?.config);

  // "Assigned" means the invitation is addressed to somebody: either the link
  // was personalised for a named guest, or guest rows exist on the invitation.
  const assigned = Boolean(guestName?.trim()) || invitation.guests.length > 0;
  if (!shouldShowPlaceCard(config, feature?.enabled ?? false, assigned)) return null;

  const pass = await prisma.guestPass.findFirst({
    where: { invitationId, status: { in: [...LIVE_PASS_STATUSES] } },
    orderBy: { tokenVersion: "desc" },
    select: { partySize: true, admittedCount: true },
  });

  const allowance = Math.max(
    computeAllowance(invitation.guests, invitation.admissionAllowance),
    pass?.partySize ?? 0,
    1
  );
  const admittedCount = Math.min(
    Math.max(invitation.admittedCount, pass?.admittedCount ?? 0),
    allowance
  );

  return {
    config,
    recipient: {
      invitationName: invitation.name,
      guestName: guestName?.trim() || null,
      groupName: invitation.guests.find((g) => g.group?.name)?.group?.name ?? null,
      partySize: allowance,
      assigned,
    },
    party: {
      allowance,
      admittedCount,
      remainingCount: Math.max(0, allowance - admittedCount),
    },
  };
}
