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

export type ProductionOrderResolutionMethod =
  | "direct-invitation-match"
  | "legacy-direct-invitation-match"
  | "event-live-production-order"
  | "none";

export interface ResolvedProductionOrderForLiveInvitation {
  order: ProductionInvitationOrder | null;
  method: ProductionOrderResolutionMethod;
}

type ProductionOrderReader = {
  invitationOrder: {
    findFirst(args: unknown): Promise<ProductionInvitationOrder | null>;
    findMany?(args: unknown): Promise<ProductionInvitationOrder[]>;
  };
};

/** Prefer delivered/published production sources over in-flight studio work. */
const PRODUCTION_STATUS_RANK: Record<string, number> = {
  DELIVERED: 0,
  APPROVED: 1,
  REVISION: 2,
  AWAITING_APPROVAL: 3,
  AWAITING_CUSTOMER_INFO: 4,
  DESIGNING: 5,
  ASSIGNED: 6,
  NOT_STARTED: 99,
};

const MVP_STATUS_RANK: Record<string, number> = {
  PUBLISHED: 0,
  APPROVED: 1,
  IN_PRODUCTION: 2,
  REVISION_REQUESTED: 3,
  PAID: 4,
};

export function rankLiveProductionOrders(
  orders: ProductionInvitationOrder[]
): ProductionInvitationOrder[] {
  return [...orders].sort((a, b) => {
    const prodA = PRODUCTION_STATUS_RANK[a.productionStatus] ?? 50;
    const prodB = PRODUCTION_STATUS_RANK[b.productionStatus] ?? 50;
    if (prodA !== prodB) return prodA - prodB;

    const statA = MVP_STATUS_RANK[a.status] ?? 50;
    const statB = MVP_STATUS_RANK[b.status] ?? 50;
    if (statA !== statB) return statA - statB;

    const updatedA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const updatedB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    return updatedB - updatedA;
  });
}

/**
 * Resolve the paid/published Studio order that owns an invitation's live
 * production design.
 */
export async function resolveProductionInvitationOrder(
  invitationId: string,
  eventId: string
): Promise<ProductionInvitationOrder | null> {
  const resolved = await resolveProductionOrderForLiveInvitation(invitationId, eventId);
  return resolved.order;
}

/**
 * Resolve the live production order for a guest invitation, including detached
 * secondary invitations that share the same event as the canonical publish.
 */
export async function resolveProductionOrderForLiveInvitation(
  invitationId: string,
  eventId: string
): Promise<ResolvedProductionOrderForLiveInvitation> {
  return resolveProductionOrderForLiveInvitationWithReader(
    invitationId,
    eventId,
    prisma as unknown as ProductionOrderReader
  );
}

/** Test seam for verifying production source lookup and ranking. */
export async function resolveProductionOrderForLiveInvitationWithReader(
  invitationId: string,
  eventId: string,
  reader: ProductionOrderReader
): Promise<ResolvedProductionOrderForLiveInvitation> {
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
  if (direct) {
    return { order: direct, method: "direct-invitation-match" };
  }

  const legacyDirect = await reader.invitationOrder.findFirst({
    where: {
      invitationId,
      eventId,
      archivedAt: null,
    },
    include: productionOrderInclude,
    orderBy: { updatedAt: "desc" },
  });
  if (legacyDirect) {
    return { order: legacyDirect, method: "legacy-direct-invitation-match" };
  }

  const eventOrder = await resolveEventLiveProductionOrder(eventId, reader);
  if (eventOrder) {
    return { order: eventOrder, method: "event-live-production-order" };
  }

  return { order: null, method: "none" };
}

/** @deprecated Use resolveProductionOrderForLiveInvitationWithReader. */
export async function resolveProductionInvitationOrderWithReader(
  invitationId: string,
  eventId: string,
  reader: ProductionOrderReader
): Promise<ProductionInvitationOrder | null> {
  const resolved = await resolveProductionOrderForLiveInvitationWithReader(
    invitationId,
    eventId,
    reader
  );
  return resolved.order;
}

async function resolveEventLiveProductionOrder(
  eventId: string,
  reader: ProductionOrderReader
): Promise<ProductionInvitationOrder | null> {
  const where = {
    eventId,
    archivedAt: null,
    status: { in: [...LIVE_PRODUCTION_ORDER_STATUSES] },
    invitationId: { not: null },
    productionStatus: { not: "NOT_STARTED" as const },
  };

  if (reader.invitationOrder.findMany) {
    const candidates = await reader.invitationOrder.findMany({
      where,
      include: productionOrderInclude,
      orderBy: { updatedAt: "desc" },
      take: 12,
    });
    return rankLiveProductionOrders(candidates)[0] ?? null;
  }

  // Legacy reader stub used by older tests with findFirst only.
  return reader.invitationOrder.findFirst({
    where,
    include: productionOrderInclude,
    orderBy: { updatedAt: "desc" },
  });
}
