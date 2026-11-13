import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { celeYouProductionOrigin, getAppUrlFromEnv } from "@/lib/app-url";
import {
  getCeleYouConnectFlags,
  isCeleYouConnectFlagOn,
} from "@/lib/celeyou-connect/flags";
import { celeYouConnectSearchText, celeYouExchangePairKey } from "@/lib/celeyou-connect/pair";
import { celeYouPublicShareSnapshot, type CeleYouShareSnapshot } from "@/lib/celeyou-connect/snapshots";
import { buildGuestReach } from "@/lib/digital-business-card/privacy";
import { isCeleCardPubliclyReachable } from "@/lib/digital-business-card/access";
import { toPublicPayload } from "@/services/digital-business-card/digital-business-card.service";
import { getCeleCardLifecyclePolicy } from "@/services/digital-business-card/lifecycle-policy.service";
import { scheduleCeleYouConnectSideEffects } from "@/services/celeyou-connect/delivery.service";

function shareOrigin(): string {
  return celeYouProductionOrigin(getAppUrlFromEnv());
}

async function snapshotForCard(card: Parameters<typeof toPublicPayload>[0]): Promise<CeleYouShareSnapshot> {
  const policy = await getCeleCardLifecyclePolicy();
  const payload = toPublicPayload(card, policy);
  const guest = buildGuestReach(card);
  payload.guestReach = guest.guestReach;
  payload.socials = guest.socials;
  payload.email = guest.email;
  payload.phone = guest.phone;
  payload.website = guest.website;
  return celeYouPublicShareSnapshot(payload, shareOrigin());
}

async function recordEvent(input: {
  connectionId: string;
  cardId: string;
  kind: string;
  actorUserId?: string | null;
  meta?: Record<string, unknown>;
}) {
  await prisma.celeYouConnectEvent
    .create({
      data: {
        connectionId: input.connectionId,
        cardId: input.cardId,
        kind: input.kind,
        actorUserId: input.actorUserId || null,
        meta: (input.meta ?? {}) as Prisma.InputJsonValue,
      },
    })
    .catch(() => undefined);
}

export async function finalizeGuestConnectBack(input: {
  connectionId: string;
  cardId: string;
  ownerUserId: string;
  ownerDisplayName: string;
  ownerEmail?: string | null;
  visitorName: string;
  visitorEmail?: string | null;
  followupConsent: boolean;
  source?: string;
}) {
  const flags = await getCeleYouConnectFlags();
  if (input.followupConsent) {
    await prisma.smartCardConnection.update({
      where: { id: input.connectionId },
      data: { followupConsentAt: new Date() },
    });
  }
  await recordEvent({
    connectionId: input.connectionId,
    cardId: input.cardId,
    kind: "CONNECTION_CREATED",
    meta: { source: input.source || "connect_back" },
  });
  await scheduleCeleYouConnectSideEffects({
    flags,
    kind: "connect_back",
    connectionId: input.connectionId,
    cardId: input.cardId,
    ownerUserId: input.ownerUserId,
    ownerDisplayName: input.ownerDisplayName,
    ownerEmail: input.ownerEmail,
    visitorName: input.visitorName,
    visitorEmail: input.visitorEmail,
    followupConsent: input.followupConsent,
  });
}

export async function previewCeleYouExchange(input: {
  visitorUserId: string;
  hostSlug: string;
  visitorCardId?: string | null;
}) {
  const flags = await getCeleYouConnectFlags();
  if (!isCeleYouConnectFlagOn(flags, "connect_two_way_exchange")) {
    return { error: "Exchange Cards is not available.", status: 404 as const };
  }
  const policy = await getCeleCardLifecyclePolicy();
  const host = await prisma.digitalBusinessCard.findFirst({
    where: { slug: input.hostSlug, deletedAt: null },
  });
  if (!host || !isCeleCardPubliclyReachable(host, policy)) {
    return { error: "Card unavailable", status: 404 as const };
  }
  if (host.userId === input.visitorUserId) {
    return { error: "You cannot connect with your own CeleYou.", status: 400 as const };
  }
  const owner = await prisma.user.findUnique({
    where: { id: host.userId },
    select: { id: true, status: true },
  });
  if (!owner || owner.status === "SUSPENDED") {
    return { error: "Card unavailable", status: 404 as const };
  }
  const visitor = await prisma.user.findUnique({
    where: { id: input.visitorUserId },
    select: { id: true, status: true, name: true },
  });
  if (!visitor || visitor.status === "SUSPENDED") {
    return { error: "Your account cannot exchange cards right now.", status: 403 as const };
  }
  const visitorCard = await pickVisitorCard(input.visitorUserId, input.visitorCardId, policy);
  if (!visitorCard) {
    return { error: "Publish a CeleYou first, then exchange cards.", status: 400 as const };
  }
  const pairKey = celeYouExchangePairKey(host.id, input.visitorUserId);
  const existing = await prisma.smartCardConnection.findUnique({ where: { pairKey } });
  const you = await snapshotForCard(visitorCard);
  const them = await snapshotForCard(host);
  const eligible = await listExchangeableVisitorCards(input.visitorUserId, policy);
  return {
    status: 200 as const,
    canExchange: true,
    alreadyConnected: Boolean(existing),
    host: {
      displayName: them.displayName,
      title: them.title,
      company: them.company,
      profileUrl: them.profileUrl,
    },
    you,
    them,
    visitorCardId: visitorCard.id,
    cards: eligible,
    pairKey,
  };
}

async function pickVisitorCard(
  userId: string,
  requestedId: string | null | undefined,
  policy: Awaited<ReturnType<typeof getCeleCardLifecyclePolicy>>
) {
  const cards = await prisma.digitalBusinessCard.findMany({
    where: { userId, deletedAt: null, adminSuspendedAt: null },
    orderBy: { updatedAt: "desc" },
  });
  const live = cards.filter((card) => isCeleCardPubliclyReachable(card, policy));
  if (requestedId) {
    return live.find((card) => card.id === requestedId) ?? null;
  }
  return live[0] ?? null;
}

async function listExchangeableVisitorCards(
  userId: string,
  policy: Awaited<ReturnType<typeof getCeleCardLifecyclePolicy>>
) {
  const cards = await prisma.digitalBusinessCard.findMany({
    where: { userId, deletedAt: null, adminSuspendedAt: null },
    orderBy: { updatedAt: "desc" },
  });
  return cards
    .filter((card) => isCeleCardPubliclyReachable(card, policy))
    .map((card) => ({
      id: card.id,
      displayName: card.displayName,
      title: card.title,
      company: card.company,
    }));
}

export async function confirmCeleYouExchange(input: {
  visitorUserId: string;
  hostSlug: string;
  visitorCardId?: string | null;
  confirm: boolean;
}) {
  if (!input.confirm) {
    return { error: "Confirm the exchange to share your CeleYou details.", status: 400 as const };
  }
  const preview = await previewCeleYouExchange(input);
  if ("error" in preview) return preview;
  if (preview.alreadyConnected) {
    const existing = await prisma.smartCardConnection.findUnique({
      where: { pairKey: preview.pairKey },
    });
    return {
      status: 200 as const,
      duplicate: true as const,
      connectionId: existing?.id ?? null,
      hostName: preview.host.displayName,
    };
  }

  const policy = await getCeleCardLifecyclePolicy();
  const host = await prisma.digitalBusinessCard.findFirst({
    where: { slug: input.hostSlug, deletedAt: null },
  });
  const visitorCard = await pickVisitorCard(input.visitorUserId, preview.visitorCardId, policy);
  if (!host || !visitorCard) {
    return { error: "Card unavailable", status: 404 as const };
  }

  const pairKey = preview.pairKey;
  const reciprocalKey = celeYouExchangePairKey(visitorCard.id, host.userId);
  const now = new Date();
  const searchHost = celeYouConnectSearchText({
    visitorName: preview.you.displayName,
    visitorEmail: preview.you.email,
    visitorPhone: preview.you.phone,
    visitorCompany: preview.you.company,
    visitorTitle: preview.you.title,
  });
  const searchVisitor = celeYouConnectSearchText({
    visitorName: preview.them.displayName,
    visitorEmail: preview.them.email,
    visitorPhone: preview.them.phone,
    visitorCompany: preview.them.company,
    visitorTitle: preview.them.title,
  });

  let result: { id: string };
  try {
  result = await prisma.$transaction(async (tx) => {
    const hostRow = await tx.smartCardConnection.upsert({
      where: { pairKey },
      create: {
        cardId: host.id,
        visitorName: preview.you.displayName,
        visitorEmail: preview.you.email,
        visitorPhone: preview.you.phone,
        visitorCompany: preview.you.company,
        visitorTitle: preview.you.title,
        source: "exchange",
        formMode: "Exchange",
        status: "NEW",
        consentAt: now,
        followupConsentAt: now,
        visitorUserId: input.visitorUserId,
        visitorCardId: visitorCard.id,
        pairKey,
        ownerShareSnapshot: preview.them as Prisma.InputJsonValue,
        visitorShareSnapshot: preview.you as Prisma.InputJsonValue,
        searchText: searchHost,
      },
      update: {},
    });
    await tx.smartCardConnection.upsert({
      where: { pairKey: reciprocalKey },
      create: {
        cardId: visitorCard.id,
        visitorName: preview.them.displayName,
        visitorEmail: preview.them.email,
        visitorPhone: preview.them.phone,
        visitorCompany: preview.them.company,
        visitorTitle: preview.them.title,
        source: "exchange",
        formMode: "Exchange",
        status: "NEW",
        consentAt: now,
        followupConsentAt: now,
        visitorUserId: host.userId,
        visitorCardId: host.id,
        pairKey: reciprocalKey,
        ownerShareSnapshot: preview.you as Prisma.InputJsonValue,
        visitorShareSnapshot: preview.them as Prisma.InputJsonValue,
        searchText: searchVisitor,
      },
      update: {},
    });
    return hostRow;
  });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existing = await prisma.smartCardConnection.findUnique({ where: { pairKey } });
      return {
        status: 200 as const,
        duplicate: true as const,
        connectionId: existing?.id ?? null,
        hostName: preview.host.displayName,
      };
    }
    throw error;
  }

  await recordEvent({
    connectionId: result.id,
    cardId: host.id,
    kind: "CARD_EXCHANGED",
    actorUserId: input.visitorUserId,
  });
  const visitorRow = await prisma.smartCardConnection.findUnique({
    where: { pairKey: reciprocalKey },
    select: { id: true },
  });
  if (visitorRow) {
    await recordEvent({
      connectionId: visitorRow.id,
      cardId: visitorCard.id,
      kind: "CARD_EXCHANGED",
      actorUserId: input.visitorUserId,
    });
  }

  const flags = await getCeleYouConnectFlags();
  const owner = await prisma.user.findUnique({
    where: { id: host.userId },
    select: { email: true, name: true },
  });
  await scheduleCeleYouConnectSideEffects({
    flags,
    kind: "exchange",
    connectionId: result.id,
    cardId: host.id,
    ownerUserId: host.userId,
    ownerDisplayName: host.displayName,
    ownerEmail: owner?.email,
    visitorName: preview.you.displayName,
    visitorEmail: preview.you.email,
    followupConsent: true,
    visitorUserId: input.visitorUserId,
  });

  return {
    status: 200 as const,
    duplicate: false as const,
    connectionId: result.id,
    hostName: preview.host.displayName,
  };
}
