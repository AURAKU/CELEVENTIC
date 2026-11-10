import { prisma } from "@/lib/prisma";
import { notificationService } from "@/services/notifications/notification.service";
import {
  TAP_SESSION_TTL_MS,
  TAP_SHARE_TOKEN_TTL_MS,
  TAP_STUDIO_PATH,
} from "@/lib/celeyou-proximity/product";
import {
  canTransitionProximity,
  isProximityStatus,
  type ProximityStatus,
} from "@/lib/celeyou-proximity/state-machine";
import {
  hashProximitySecret,
  hashProximityShareToken,
  inspectProximityShareToken,
  newProximityDiscoveryId,
  newProximityJoinCode,
  newProximityShareToken,
  newProximityVerifyCode,
  normalizeJoinCode,
} from "@/lib/celeyou-proximity/tokens";
import type { ProximityTransport } from "@/lib/celeyou-proximity/protocol";
import { digitalCardPublicUrl } from "@/lib/digital-business-card/types";
import { digitalCardVcardPath } from "@/lib/digital-business-card/vcard";

export type ProximityPeerPreview = {
  displayName: string;
  title: string | null;
  company: string | null;
  avatarUrl: string | null;
};

export type ProximitySharePayload = {
  token: string;
  profilePath: string;
  vcardPath: string;
  preview: ProximityPeerPreview;
};

export type ProximitySessionView = {
  id: string;
  role: "host" | "peer";
  status: ProximityStatus;
  hostCardId: string;
  joinCode: string | null;
  verifyCode: string | null;
  discoveryId: string;
  transport: string;
  expiresAt: string;
  peer: ProximityPeerPreview | null;
  self: ProximityPeerPreview;
  share: ProximitySharePayload | null;
  phoneToPhoneClaim: string;
};

function previewFromCard(card: {
  displayName: string;
  title: string | null;
  company: string | null;
  avatarUrl: string | null;
}): ProximityPeerPreview {
  return {
    displayName: card.displayName,
    title: card.title,
    company: card.company,
    avatarUrl: card.avatarUrl,
  };
}

async function securityEvent(input: {
  sessionId?: string | null;
  userId?: string | null;
  kind: string;
  meta?: Record<string, unknown>;
  ip?: string | null;
}) {
  await prisma.celeYouProximitySecurityEvent
    .create({
      data: {
        sessionId: input.sessionId || null,
        userId: input.userId || null,
        kind: input.kind,
        meta: input.meta ?? {},
        ip: input.ip || null,
      },
    })
    .catch(() => undefined);
}

async function expireIfNeeded(session: { id: string; status: string; expiresAt: Date }) {
  if (!isProximityStatus(session.status)) return session;
  if (session.expiresAt.getTime() > Date.now()) return session;
  if (session.status === "COMPLETED" || session.status === "EXPIRED") return session;
  if (!canTransitionProximity(session.status, "EXPIRED") && session.status !== "APPROVED") {
    return session;
  }
  return prisma.celeYouProximitySession.update({
    where: { id: session.id },
    data: { status: "EXPIRED" },
  });
}

async function loadCardForUser(userId: string, cardId: string) {
  return prisma.digitalBusinessCard.findFirst({
    where: { id: cardId, userId, deletedAt: null },
  });
}

function assertShareable(card: {
  adminSuspendedAt?: Date | null;
  deletedAt?: Date | null;
  proximityDiscoverable?: boolean | null;
}) {
  if (card.proximityDiscoverable === false) {
    throw new Error("Tap-to-Connect is turned off on this CeleYou.");
  }
  if (card.deletedAt) {
    throw new Error("This CeleYou is no longer available.");
  }
  if (card.adminSuspendedAt) {
    throw new Error("This CeleYou cannot be shared right now.");
  }
}

async function toView(
  session: {
    id: string;
    hostUserId: string;
    hostCardId: string;
    peerUserId: string | null;
    peerCardId: string | null;
    joinCode: string;
    verifyCode: string | null;
    discoveryId: string;
    status: string;
    transport: string;
    expiresAt: Date;
    hostCard: {
      displayName: string;
      title: string | null;
      company: string | null;
      avatarUrl: string | null;
      slug: string;
    };
    peerCard: {
      displayName: string;
      title: string | null;
      company: string | null;
      avatarUrl: string | null;
      slug: string;
    } | null;
  },
  userId: string,
  share: ProximitySharePayload | null = null
): Promise<ProximitySessionView> {
  const status = isProximityStatus(session.status) ? session.status : "FAILED";
  const role: "host" | "peer" = session.hostUserId === userId ? "host" : "peer";
  const self = role === "host" ? previewFromCard(session.hostCard) : previewFromCard(session.peerCard ?? session.hostCard);
  const peer =
    role === "host"
      ? session.peerCard
        ? previewFromCard(session.peerCard)
        : null
      : previewFromCard(session.hostCard);
  const otherCard = role === "host" ? session.peerCard : session.hostCard;
  const verifiedShare =
    share ||
    ((status === "APPROVED" || status === "COMPLETED") && otherCard
      ? {
          token: "",
          profilePath: digitalCardPublicUrl(otherCard.slug),
          vcardPath: digitalCardVcardPath(otherCard.slug),
          preview: previewFromCard(otherCard),
        }
      : null);
  return {
    id: session.id,
    role,
    status,
    hostCardId: session.hostCardId,
    joinCode: role === "host" || status !== "DISCOVERING" ? session.joinCode : null,
    verifyCode: session.verifyCode,
    discoveryId: session.discoveryId,
    transport: session.transport,
    expiresAt: session.expiresAt.toISOString(),
    peer,
    self,
    share: verifiedShare,
    phoneToPhoneClaim:
      "Phone to phone NFC is not used. Bring both phones into Tap Mode, then scan the session QR or enter the code.",
  };
}

async function sessionWithCards(id: string) {
  return prisma.celeYouProximitySession.findUnique({
    where: { id },
    include: {
      hostCard: {
        select: {
          id: true,
          userId: true,
          slug: true,
          displayName: true,
          title: true,
          company: true,
          avatarUrl: true,
          email: true,
          phone: true,
        },
      },
      peerCard: {
        select: {
          id: true,
          userId: true,
          slug: true,
          displayName: true,
          title: true,
          company: true,
          avatarUrl: true,
          email: true,
          phone: true,
        },
      },
    },
  });
}

export async function createProximitySession(input: {
  userId: string;
  cardId: string;
  transport?: ProximityTransport;
  ip?: string | null;
}) {
  const card = await loadCardForUser(input.userId, input.cardId);
  if (!card) throw new Error("CeleYou not found");
  assertShareable(card);

  await prisma.celeYouProximitySession.updateMany({
    where: {
      hostUserId: input.userId,
      status: { in: ["DISCOVERING", "PEER_FOUND", "REQUEST_PENDING"] },
    },
    data: { status: "CANCELLED", cancelledAt: new Date() },
  });

  const joinCode = newProximityJoinCode();
  const session = await prisma.celeYouProximitySession.create({
    data: {
      hostUserId: input.userId,
      hostCardId: card.id,
      joinCode,
      joinCodeHash: hashProximitySecret(joinCode),
      discoveryId: newProximityDiscoveryId(),
      status: "DISCOVERING",
      transport: input.transport || "qr",
      expiresAt: new Date(Date.now() + TAP_SESSION_TTL_MS),
      capabilityJson: { bleAdvertise: false, nativeBlePeer: false },
    },
    include: {
      hostCard: {
        select: { displayName: true, title: true, company: true, avatarUrl: true, slug: true },
      },
      peerCard: {
        select: { displayName: true, title: true, company: true, avatarUrl: true, slug: true },
      },
    },
  });
  await securityEvent({
    sessionId: session.id,
    userId: input.userId,
    kind: "SESSION_CREATED",
    ip: input.ip,
  });
  return toView(session, input.userId);
}

export async function joinProximitySession(input: {
  userId: string;
  cardId: string;
  joinCode: string;
  ip?: string | null;
}) {
  const code = normalizeJoinCode(input.joinCode);
  if (code.length < 6) throw new Error("Enter the six-character code from the other phone.");
  const card = await loadCardForUser(input.userId, input.cardId);
  if (!card) throw new Error("CeleYou not found");
  if (card.proximityDiscoverable === false) {
    throw new Error("Tap-to-Connect is turned off on this CeleYou.");
  }

  const found = await prisma.celeYouProximitySession.findUnique({
    where: { joinCodeHash: hashProximitySecret(code) },
  });
  if (!found) {
    await securityEvent({ userId: input.userId, kind: "JOIN_UNKNOWN", ip: input.ip, meta: { codeLength: code.length } });
    throw new Error("No open Tap session uses that code.");
  }
  const session = await expireIfNeeded(found);
  if (session.status !== "DISCOVERING") {
    throw new Error("That Tap session is no longer waiting.");
  }
  if (session.hostUserId === input.userId) {
    throw new Error("Open Tap Mode on the other phone. This phone is already hosting.");
  }
  if (session.hostCardId === input.cardId) {
    throw new Error("Pick a different CeleYou on this phone.");
  }

  const verifyCode = newProximityVerifyCode();
  const updated = await prisma.celeYouProximitySession.update({
    where: { id: session.id },
    data: {
      peerUserId: input.userId,
      peerCardId: card.id,
      verifyCode,
      status: "PEER_FOUND",
      transport: "code",
    },
    include: {
      hostCard: {
        select: { displayName: true, title: true, company: true, avatarUrl: true, slug: true },
      },
      peerCard: {
        select: { displayName: true, title: true, company: true, avatarUrl: true, slug: true },
      },
    },
  });
  await securityEvent({
    sessionId: updated.id,
    userId: input.userId,
    kind: "PEER_JOINED",
    ip: input.ip,
  });
  return toView(updated, input.userId);
}

export async function getProximitySessionForUser(userId: string, sessionId: string) {
  const row = await sessionWithCards(sessionId);
  if (!row) return null;
  if (row.hostUserId !== userId && row.peerUserId !== userId) return null;
  const session = await expireIfNeeded(row);
  const fresh = session.id === row.id && session.status === row.status ? row : await sessionWithCards(sessionId);
  if (!fresh) return null;
  return toView(fresh, userId);
}

async function requireParticipant(userId: string, sessionId: string) {
  const row = await sessionWithCards(sessionId);
  if (!row) throw new Error("Tap session not found");
  if (row.hostUserId !== userId && row.peerUserId !== userId) throw new Error("Tap session not found");
  const expired = await expireIfNeeded(row);
  const fresh =
    expired.status === row.status ? row : await sessionWithCards(sessionId);
  if (!fresh) throw new Error("Tap session not found");
  if (!isProximityStatus(fresh.status)) throw new Error("Tap session failed");
  return { ...fresh, status: fresh.status as ProximityStatus };
}

export async function requestProximityConnect(userId: string, sessionId: string, ip?: string | null) {
  const session = await requireParticipant(userId, sessionId);
  if (session.hostUserId !== userId) throw new Error("Only the person who opened Tap Mode first can send Connect.");
  if (!canTransitionProximity(session.status, "REQUEST_PENDING")) {
    throw new Error("This Tap session cannot send Connect now.");
  }
  const updated = await prisma.celeYouProximitySession.update({
    where: { id: session.id },
    data: { status: "REQUEST_PENDING" },
    include: {
      hostCard: {
        select: { displayName: true, title: true, company: true, avatarUrl: true, slug: true },
      },
      peerCard: {
        select: { displayName: true, title: true, company: true, avatarUrl: true, slug: true },
      },
    },
  });
  if (session.peerUserId) {
    await notificationService.notify(session.peerUserId, {
      title: `${session.hostCard.displayName} wants to share their CeleYou`,
      message: "Open Tap Mode to accept. Nothing is shared until you approve.",
      type: "CELECARD_PROXIMITY_REQUEST",
      link: TAP_STUDIO_PATH,
    });
  }
  await securityEvent({ sessionId: session.id, userId, kind: "CONNECT_REQUESTED", ip });
  return toView(updated, userId);
}

async function issueShareToken(sessionId: string, fromCardId: string, toUserId: string) {
  const issued = newProximityShareToken();
  await prisma.celeYouProximityShareToken.create({
    data: {
      sessionId,
      fromCardId,
      toUserId,
      tokenHash: issued.tokenHash,
      expiresAt: new Date(Date.now() + TAP_SHARE_TOKEN_TTL_MS),
    },
  });
  return issued.token;
}

export async function approveProximityConnect(userId: string, sessionId: string, ip?: string | null) {
  const session = await requireParticipant(userId, sessionId);
  if (session.peerUserId !== userId) throw new Error("Only the nearby person can accept.");
  if (!canTransitionProximity(session.status, "APPROVED")) {
    throw new Error("This Tap session cannot be accepted now.");
  }
  if (!session.peerCardId || !session.peerUserId) throw new Error("No nearby CeleYou to accept.");

  const hostCardRow = await prisma.digitalBusinessCard.findUnique({ where: { id: session.hostCardId } });
  if (!hostCardRow) throw new Error("The other CeleYou is no longer available.");
  assertShareable(hostCardRow);

  const peerCard = await prisma.digitalBusinessCard.findUnique({ where: { id: session.peerCardId } });
  const peerLive = Boolean(peerCard && !peerCard.deletedAt && !peerCard.adminSuspendedAt);

  const hostToPeer = await issueShareToken(session.id, session.hostCardId, session.peerUserId);
  let peerToHost: string | null = null;
  if (peerLive) {
    peerToHost = await issueShareToken(session.id, session.peerCardId, session.hostUserId);
  }

  const updated = await prisma.celeYouProximitySession.update({
    where: { id: session.id },
    data: { status: "APPROVED" },
    include: {
      hostCard: {
        select: { displayName: true, title: true, company: true, avatarUrl: true, slug: true },
      },
      peerCard: {
        select: { displayName: true, title: true, company: true, avatarUrl: true, slug: true },
      },
    },
  });

  await prisma.celeYouProximityHistory.create({
    data: {
      sessionId: session.id,
      hostUserId: session.hostUserId,
      peerUserId: session.peerUserId,
      hostCardId: session.hostCardId,
      peerCardId: session.peerCardId,
      outcome: "APPROVED",
    },
  });

  await notificationService.notify(session.hostUserId, {
    title: `${session.peerCard?.displayName || "Someone nearby"} accepted your CeleYou`,
    message: "Open Tap Mode to see their profile. The share is verified.",
    type: "CELECARD_PROXIMITY_CONNECTED",
    link: TAP_STUDIO_PATH,
  });
  await securityEvent({ sessionId: session.id, userId, kind: "CONNECT_APPROVED", ip });

  const share: ProximitySharePayload = {
    token: hostToPeer,
    profilePath: digitalCardPublicUrl(session.hostCard.slug),
    vcardPath: digitalCardVcardPath(session.hostCard.slug),
    preview: previewFromCard(session.hostCard),
  };
  const view = await toView(updated, userId, share);
  return { view, peerToHostToken: peerToHost };
}

export async function declineProximityConnect(userId: string, sessionId: string, ip?: string | null) {
  const session = await requireParticipant(userId, sessionId);
  if (session.peerUserId !== userId && session.hostUserId !== userId) {
    throw new Error("Tap session not found");
  }
  if (!canTransitionProximity(session.status, "DECLINED")) {
    throw new Error("This Tap session cannot be declined now.");
  }
  const updated = await prisma.celeYouProximitySession.update({
    where: { id: session.id },
    data: { status: "DECLINED" },
    include: {
      hostCard: {
        select: { displayName: true, title: true, company: true, avatarUrl: true, slug: true },
      },
      peerCard: {
        select: { displayName: true, title: true, company: true, avatarUrl: true, slug: true },
      },
    },
  });
  await prisma.celeYouProximityHistory.create({
    data: {
      sessionId: session.id,
      hostUserId: session.hostUserId,
      peerUserId: session.peerUserId,
      hostCardId: session.hostCardId,
      peerCardId: session.peerCardId,
      outcome: "DECLINED",
    },
  });
  await securityEvent({ sessionId: session.id, userId, kind: "CONNECT_DECLINED", ip });
  return toView(updated, userId);
}

export async function cancelProximitySession(userId: string, sessionId: string, ip?: string | null) {
  const session = await requireParticipant(userId, sessionId);
  if (!canTransitionProximity(session.status, "CANCELLED")) {
    throw new Error("This Tap session has already finished.");
  }
  const updated = await prisma.celeYouProximitySession.update({
    where: { id: session.id },
    data: { status: "CANCELLED", cancelledAt: new Date() },
    include: {
      hostCard: {
        select: { displayName: true, title: true, company: true, avatarUrl: true, slug: true },
      },
      peerCard: {
        select: { displayName: true, title: true, company: true, avatarUrl: true, slug: true },
      },
    },
  });
  await securityEvent({ sessionId: session.id, userId, kind: "SESSION_CANCELLED", ip });
  return toView(updated, userId);
}

export async function redeemProximityShareToken(input: {
  userId: string;
  token: string;
  ip?: string | null;
}) {
  const tokenHash = hashProximityShareToken(input.token);
  const row = await prisma.celeYouProximityShareToken.findUnique({ where: { tokenHash } });
  const verdict = inspectProximityShareToken(row, input.userId);
  if (verdict === "unknown") {
    await securityEvent({ userId: input.userId, kind: "TOKEN_UNKNOWN", ip: input.ip });
    throw new Error("That share is not valid.");
  }
  if (verdict === "replay") {
    await securityEvent({ sessionId: row?.sessionId, userId: input.userId, kind: "TOKEN_REPLAY", ip: input.ip });
    throw new Error("That share was already used.");
  }
  if (verdict === "expired") {
    await securityEvent({ sessionId: row?.sessionId, userId: input.userId, kind: "TOKEN_EXPIRED", ip: input.ip });
    throw new Error("That share expired. Start Tap Mode again.");
  }
  if (!row) throw new Error("That share is not valid.");

  const card = await prisma.digitalBusinessCard.findUnique({ where: { id: row.fromCardId } });
  if (!card) throw new Error("That CeleYou is no longer available.");
  assertShareable(card);

  await prisma.celeYouProximityShareToken.update({
    where: { id: row.id },
    data: { redeemedAt: new Date() },
  });

  const session = await prisma.celeYouProximitySession.findUnique({ where: { id: row.sessionId } });
  if (session && isProximityStatus(session.status) && canTransitionProximity(session.status, "COMPLETED")) {
    await prisma.celeYouProximitySession.update({
      where: { id: session.id },
      data: { status: "COMPLETED" },
    });
  }

  await securityEvent({ sessionId: row.sessionId, userId: input.userId, kind: "TOKEN_REDEEMED", ip: input.ip });

  return {
    profilePath: digitalCardPublicUrl(card.slug),
    vcardPath: digitalCardVcardPath(card.slug),
    preview: previewFromCard(card),
  };
}

export async function listProximityHistory(userId: string, take = 20) {
  return prisma.celeYouProximityHistory.findMany({
    where: { OR: [{ hostUserId: userId }, { peerUserId: userId }] },
    orderBy: { createdAt: "desc" },
    take: Math.min(50, Math.max(1, take)),
    include: {
      session: {
        select: {
          status: true,
          hostCard: { select: { displayName: true, avatarUrl: true, slug: true } },
          peerCard: { select: { displayName: true, avatarUrl: true, slug: true } },
        },
      },
    },
  });
}
