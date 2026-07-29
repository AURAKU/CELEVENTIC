import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

const productionOrderInclude = {
  languageVersions: true,
  template: {
    include: {
      defaultMusicTrack: {
        select: {
          id: true,
          title: true,
          artist: true,
          url: true,
          durationSec: true,
          isActive: true,
        },
      },
    },
  },
} as const;

export type ProductionInvitationOrder = Prisma.InvitationOrderGetPayload<{
  include: typeof productionOrderInclude;
}>;

type ProductionOrderReader = {
  invitationOrder: {
    findFirst(args: unknown): Promise<ProductionInvitationOrder | null>;
  };
};

/**
 * Resolve the paid/published Studio order that owns an invitation's live
 * production design.
 *
 * Personalized invitations (quick-create, imports and guest-specific links)
 * are separate Invitation rows, but they belong to the same Event as the
 * canonical invitation created when the Studio order was published. Their
 * guest pages must therefore inherit that event's production order instead of
 * falling back to the platform default template.
 */
export async function resolveProductionInvitationOrder(
  invitationId: string,
  eventId: string
): Promise<ProductionInvitationOrder | null> {
  return resolveProductionInvitationOrderWithReader(
    invitationId,
    eventId,
    prisma as unknown as ProductionOrderReader
  );
}

/** Test seam for verifying the two-stage production source lookup. */
export async function resolveProductionInvitationOrderWithReader(
  invitationId: string,
  eventId: string,
  reader: ProductionOrderReader
): Promise<ProductionInvitationOrder | null> {
  // The canonical published invitation remains the strongest match.
  const direct = await reader.invitationOrder.findFirst({
    where: {
      invitationId,
      eventId,
      archivedAt: null,
    },
    include: productionOrderInclude,
    orderBy: { updatedAt: "desc" },
  });
  if (direct) return direct;

  // Guest-specific invitations do not own an order. Inherit the most recently
  // updated live production source for their event, never a draft, unpaid
  // order, archived order, or a share URL belonging to another event.
  return reader.invitationOrder.findFirst({
    where: {
      eventId,
      status: "PUBLISHED",
      invitationId: { not: null },
      shareUrl: { not: null },
      archivedAt: null,
    },
    include: productionOrderInclude,
    orderBy: { updatedAt: "desc" },
  });
}
