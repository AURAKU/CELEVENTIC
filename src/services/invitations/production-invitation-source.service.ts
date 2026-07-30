import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { LIVE_PRODUCTION_ORDER_STATUSES } from "@/lib/invitation/studio-access";

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
 * falling back to the platform catalogue template — even when a catalogue
 * layout was stamped onto the secondary invitation at create time.
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
  // The canonical invitation remains the strongest match. Prefer a live
  // production status so an older archived/draft row cannot win.
  const direct = await reader.invitationOrder.findFirst({
    where: {
      invitationId,
      eventId,
      archivedAt: null,
      status: { in: [...LIVE_PRODUCTION_ORDER_STATUSES] },
    },
    include: productionOrderInclude,
    orderBy: { updatedAt: "desc" },
  });
  if (direct) return direct;

  // Fallback: any non-archived order still linked to this invitation
  // (legacy rows that predate the live-status filter).
  const legacyDirect = await reader.invitationOrder.findFirst({
    where: {
      invitationId,
      eventId,
      archivedAt: null,
    },
    include: productionOrderInclude,
    orderBy: { updatedAt: "desc" },
  });
  if (legacyDirect) return legacyDirect;

  // Guest-specific invitations do not own an order. Inherit the most recently
  // updated live production source for their event — PAID / IN_PRODUCTION /
  // APPROVED / PUBLISHED — never a draft, unpaid, or archived order.
  return reader.invitationOrder.findFirst({
    where: {
      eventId,
      status: { in: [...LIVE_PRODUCTION_ORDER_STATUSES] },
      invitationId: { not: null },
      shareUrl: { not: null },
      archivedAt: null,
    },
    include: productionOrderInclude,
    orderBy: { updatedAt: "desc" },
  });
}
