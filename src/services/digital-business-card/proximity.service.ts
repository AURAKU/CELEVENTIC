import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { notificationService } from "@/services/notifications/notification.service";
import {
  TAP_DECLINE_COOLDOWN_LIMIT,
  TAP_DECLINE_COOLDOWN_MS,
  TAP_SESSION_PURGE_AFTER_MS,
  TAP_SHARE_TOKEN_TTL_MS,
  TAP_STUDIO_PATH,
} from "@/lib/celeyou-proximity/product";
import {
  canTransitionProximity,
  isProximityStatus,
  type ProximityStatus,
} from "@/lib/celeyou-proximity/state-machine";
import {
  hashProximityPairingToken,
  hashProximitySecret,
  hashProximityShareToken,
  inspectProximityShareToken,
  newProximityDiscoveryId,
  newProximityJoinCode,
  newProximityPairingToken,
  newProximityShareToken,
  newProximityVerifyCode,
} from "@/lib/celeyou-proximity/tokens";
import { isTapPairingToken, normalizeTapSecret } from "@/lib/celeyou-proximity/join-code";
import type { ProximityTransport } from "@/lib/celeyou-proximity/protocol";
import { digitalCardPublicUrl } from "@/lib/digital-business-card/types";
import { digitalCardVcardPath } from "@/lib/digital-business-card/vcard";
import {
  celeYouShareGuestMessage,
  guestMayUsePublicAction,
  isCeleCardPubliclyReachable,
  resolveCeleYouPublicShare,
} from "@/lib/digital-business-card/access";
import { buildGuestReach } from "@/lib/digital-business-card/privacy";
import { getCeleCardLifecyclePolicy } from "@/services/digital-business-card/lifecycle-policy.service";
import { toPublicPayload } from "@/services/digital-business-card/digital-business-card.service";
import { getCeleYouConnectFlags, tapSessionTtlMs } from "@/lib/celeyou-connect/flags";
import { tapGuestFirstName } from "@/lib/celeyou-connect/pair";

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
  pairingToken: string | null;
  verifyCode: string | null;
  discoveryId: string;
  transport: string;
  expiresAt: string;
  peer: ProximityPeerPreview | null;
  self: ProximityPeerPreview;
  share: ProximitySharePayload | null;
  phoneToPhoneClaim: string;
  guestReceipt: { name: string; at: string } | null;
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

type PendingShare = { token: string; fromCardId: string; expiresAt: string };

function capabilityRecord(value: Prisma.JsonValue | null | undefined): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return { ...(value as Record<string, unknown>) };
}

function guestReceiptsFromCapability(value: Prisma.JsonValue | null | undefined): Array<{ name: string; at: string }> {
  const rows = capabilityRecord(value).guestReceipts;
  if (!Array.isArray(rows)) return [];
  const next: Array<{ name: string; at: string }> = [];
  for (const row of rows) {
    if (!row || typeof row !== "object" || Array.isArray(row)) continue;
    const name = String((row as { name?: unknown }).name ?? "").trim().slice(0, 40);
    const at = String((row as { at?: unknown }).at ?? "").trim();
    if (!name || !at) continue;
    next.push({ name, at });
  }
  return next.slice(-8);
}

function pendingSharesFromCapability(value: Prisma.JsonValue | null | undefined): Record<string, PendingShare> {
  const pending = capabilityRecord(value).pendingShares;
  if (!pending || typeof pending !== "object" || Array.isArray(pending)) return {};
  const next: Record<string, PendingShare> = {};
  for (const [userId, row] of Object.entries(pending as Record<string, unknown>)) {
    if (!row || typeof row !== "object" || Array.isArray(row)) continue;
    const record = row as Record<string, unknown>;
    const token = String(record.token ?? "").trim();
    const fromCardId = String(record.fromCardId ?? "").trim();
    const expiresAt = String(record.expiresAt ?? "").trim();
    if (!token || !fromCardId || !expiresAt) continue;
    next[userId] = { token, fromCardId, expiresAt };
  }
  return next;
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
        meta: (input.meta ?? {}) as Prisma.InputJsonValue,
        ip: input.ip || null,
      },
    })
    .catch(() => undefined);
}

export async function purgeExpiredProximityRecords(now = new Date()) {
  const staleBefore = new Date(now.getTime() - TAP_SESSION_PURGE_AFTER_MS);
  await prisma.celeYouProximitySession.updateMany({
    where: {
      expiresAt: { lte: now },
      status: { in: ["DISCOVERING", "PEER_FOUND", "REQUEST_PENDING", "APPROVED"] },
    },
    data: { status: "EXPIRED" },
  });
  await prisma.celeYouProximityShareToken.deleteMany({
    where: {
      OR: [{ expiresAt: { lte: now }, redeemedAt: null }, { redeemedAt: { lte: staleBefore } }],
    },
  });
  await prisma.celeYouProximitySecurityEvent.deleteMany({
    where: { createdAt: { lte: staleBefore } },
  });
}

async function recentDeclinesBetween(hostUserId: string, peerUserId: string) {
  return prisma.celeYouProximityHistory.count({
    where: {
      hostUserId,
      peerUserId,
      outcome: "DECLINED",
      createdAt: { gte: new Date(Date.now() - TAP_DECLINE_COOLDOWN_MS) },
    },
  });
}

async function expireIfNeeded<T extends { id: string; status: string; expiresAt: Date }>(
  session: T
): Promise<T> {
  if (!isProximityStatus(session.status)) return session;
  if (session.expiresAt.getTime() > Date.now()) return session;
  if (session.status === "COMPLETED" || session.status === "EXPIRED") return session;
  if (!canTransitionProximity(session.status, "EXPIRED") && session.status !== "APPROVED") {
    return session;
  }
  await prisma.celeYouProximitySession.update({
    where: { id: session.id },
    data: { status: "EXPIRED" },
  });
  await securityEvent({ sessionId: session.id, kind: "SESSION_EXPIRED" });
  return { ...session, status: "EXPIRED" };
}

async function loadCardForUser(userId: string, cardId: string) {
  return prisma.digitalBusinessCard.findFirst({
    where: { id: cardId, userId, deletedAt: null },
  });
}

function assertShareable(card: {
  isPublished: boolean;
  subscriptionStatus: string;
  subscriptionExpiresAt: Date | null;
  adminSuspendedAt?: Date | null;
  adminDeactivatedAt?: Date | null;
  deletedAt?: Date | null;
  lastActivatedAt?: Date | null;
  proximityDiscoverable?: boolean | null;
}) {
  const share = resolveCeleYouPublicShare({ card, channel: "tap" });
  if (!share.channelAllowed) {
    throw new Error(celeYouShareGuestMessage(share.reason));
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
    pairingToken?: string | null;
    verifyCode: string | null;
    discoveryId: string;
    status: string;
    transport: string;
    expiresAt: Date;
    capabilityJson?: Prisma.JsonValue | null;
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
  const pending = pendingSharesFromCapability(session.capabilityJson ?? null)[userId];
  const pendingLive = pending && Date.parse(pending.expiresAt) > Date.now() ? pending : null;
  const verifiedShare =
    share ||
    (status === "COMPLETED" && otherCard
      ? {
          token: "",
          profilePath: digitalCardPublicUrl(otherCard.slug),
          vcardPath: digitalCardVcardPath(otherCard.slug),
          preview: previewFromCard(otherCard),
        }
      : status === "APPROVED" && otherCard
        ? {
            token: pendingLive?.token || "",
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
    pairingToken: role === "host" ? session.pairingToken ?? null : null,
    verifyCode: session.verifyCode,
    discoveryId: session.discoveryId,
    transport: session.transport,
    expiresAt: session.expiresAt.toISOString(),
    peer,
    self,
    share: verifiedShare,
    phoneToPhoneClaim: "Scan the session QR or enter the code to connect.",
    guestReceipt: guestReceiptsFromCapability(session.capabilityJson ?? null).at(-1) ?? null,
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
  const flags = await getCeleYouConnectFlags();
  if (!flags.tap_mode_enabled) throw new Error("Tap Mode is paused.");
  const card = await loadCardForUser(input.userId, input.cardId);
  if (!card) throw new Error("CeleYou not found");
  assertShareable(card);
  await purgeExpiredProximityRecords();

  await prisma.celeYouProximitySession.updateMany({
    where: {
      hostUserId: input.userId,
      status: { in: ["DISCOVERING", "PEER_FOUND", "REQUEST_PENDING"] },
    },
    data: { status: "CANCELLED", cancelledAt: new Date() },
  });

  const joinCode = newProximityJoinCode();
  const pairing = newProximityPairingToken();
  const session = await prisma.celeYouProximitySession.create({
    data: {
      hostUserId: input.userId,
      hostCardId: card.id,
      joinCode,
      joinCodeHash: hashProximitySecret(joinCode),
      pairingToken: pairing.token,
      pairingTokenHash: pairing.tokenHash,
      discoveryId: newProximityDiscoveryId(),
      status: "DISCOVERING",
      transport: input.transport || "qr",
      expiresAt: new Date(Date.now() + tapSessionTtlMs(flags)),
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
  transport?: ProximityTransport;
  ip?: string | null;
}) {
  const code = normalizeTapSecret(input.joinCode);
  if (code.length < 6) throw new Error("Enter the six-character code from the other phone.");
  const card = await loadCardForUser(input.userId, input.cardId);
  if (!card) throw new Error("CeleYou not found");
  if (card.proximityDiscoverable === false) {
    throw new Error("Tap-to-Connect is turned off on this CeleYou.");
  }

  const found = await findTapSessionBySecret(code);
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

  const declined = await recentDeclinesBetween(session.hostUserId, input.userId);
  if (declined >= TAP_DECLINE_COOLDOWN_LIMIT) {
    await securityEvent({
      sessionId: session.id,
      userId: input.userId,
      kind: "JOIN_COOLDOWN",
      ip: input.ip,
    });
    throw new Error("This person is not accepting nearby requests right now.");
  }

  await prisma.celeYouProximitySession.updateMany({
    where: {
      hostUserId: input.userId,
      status: { in: ["DISCOVERING", "PEER_FOUND", "REQUEST_PENDING"] },
    },
    data: { status: "CANCELLED", cancelledAt: new Date() },
  });

  const verifyCode = newProximityVerifyCode();
  const updated = await prisma.celeYouProximitySession.update({
    where: { id: session.id },
    data: {
      peerUserId: input.userId,
      peerCardId: card.id,
      verifyCode,
      status: "PEER_FOUND",
      transport: input.transport === "ble" ? "ble" : "code",
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
  const expiresAt = new Date(Date.now() + TAP_SHARE_TOKEN_TTL_MS);
  await prisma.celeYouProximityShareToken.create({
    data: {
      sessionId,
      fromCardId,
      toUserId,
      tokenHash: issued.tokenHash,
      expiresAt,
    },
  });
  return { token: issued.token, fromCardId, toUserId, expiresAt: expiresAt.toISOString() };
}

async function storePendingShares(
  sessionId: string,
  current: Prisma.JsonValue | null | undefined,
  shares: Array<{ token: string; fromCardId: string; toUserId: string; expiresAt: string }>
) {
  const capability = capabilityRecord(current);
  const pending = pendingSharesFromCapability(current);
  for (const share of shares) {
    pending[share.toUserId] = {
      token: share.token,
      fromCardId: share.fromCardId,
      expiresAt: share.expiresAt,
    };
  }
  await prisma.celeYouProximitySession.update({
    where: { id: sessionId },
    data: { capabilityJson: { ...capability, pendingShares: pending } as Prisma.InputJsonValue },
  });
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
  let peerToHost: Awaited<ReturnType<typeof issueShareToken>> | null = null;
  if (peerLive && session.peerCardId) {
    peerToHost = await issueShareToken(session.id, session.peerCardId, session.hostUserId);
  }
  await storePendingShares(session.id, session.capabilityJson, [hostToPeer, ...(peerToHost ? [peerToHost] : [])]);

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
    token: hostToPeer.token,
    profilePath: digitalCardPublicUrl(session.hostCard.slug),
    vcardPath: digitalCardVcardPath(session.hostCard.slug),
    preview: previewFromCard(session.hostCard),
  };
  const view = await toView(updated, userId, share);
  return { view, peerToHostToken: peerToHost?.token ?? null };
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
  if (session) {
    const capability = capabilityRecord(session.capabilityJson);
    const pending = pendingSharesFromCapability(session.capabilityJson);
    delete pending[input.userId];
    const complete = isProximityStatus(session.status) && canTransitionProximity(session.status, "COMPLETED");
    await prisma.celeYouProximitySession.update({
      where: { id: session.id },
      data: {
        capabilityJson: { ...capability, pendingShares: pending } as Prisma.InputJsonValue,
        ...(complete ? { status: "COMPLETED" } : {}),
      },
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

const OPEN_TAP_STATUSES = new Set(["DISCOVERING", "PEER_FOUND", "REQUEST_PENDING"]);

export { tapGuestFirstName };

async function findTapSessionBySecret(raw: string) {
  const secret = normalizeTapSecret(raw);
  if (!secret) return null;
  if (isTapPairingToken(secret)) {
    return prisma.celeYouProximitySession.findUnique({
      where: { pairingTokenHash: hashProximityPairingToken(secret) },
    });
  }
  if (secret.length < 6) return null;
  return prisma.celeYouProximitySession.findUnique({
    where: { joinCodeHash: hashProximitySecret(secret) },
  });
}

export async function getTapGuestLanding(joinCode: string, options?: { recordOpen?: boolean }) {
  const code = normalizeTapSecret(joinCode);
  if (code.length < 6) {
    return { status: 404 as const, error: "That connection QR is not open." };
  }
  await purgeExpiredProximityRecords();
  const found = await findTapSessionBySecret(code);
  if (!found) {
    return { status: 404 as const, error: "That connection QR is not open." };
  }
  const session = await expireIfNeeded(found);
  if (session.status === "EXPIRED") {
    return { status: 410 as const, error: "That connection QR has expired." };
  }
  if (!OPEN_TAP_STATUSES.has(session.status)) {
    return { status: 410 as const, error: "That connection QR is no longer open." };
  }
  const flags = await getCeleYouConnectFlags();
  if (!flags.tap_mode_enabled) {
    return { status: 410 as const, error: "That connection QR is no longer open." };
  }
  const card = await prisma.digitalBusinessCard.findFirst({
    where: { id: session.hostCardId, deletedAt: null },
  });
  const policy = await getCeleCardLifecyclePolicy();
  if (!card || !isCeleCardPubliclyReachable(card, policy)) {
    return { status: 404 as const, error: "Card unavailable" };
  }
  const payload = toPublicPayload(card, policy);
  const guest = buildGuestReach(card);
  payload.guestReach = guest.guestReach;
  payload.socials = guest.socials;
  payload.email = guest.email;
  payload.phone = guest.phone;
  payload.website = guest.website;
  if (options?.recordOpen) {
    await securityEvent({
      sessionId: session.id,
      kind: "GUEST_PAGE_OPENED",
      meta: { status: session.status },
    });
  }
  return {
    status: 200 as const,
    data: {
      expiresAt: session.expiresAt.toISOString(),
      sessionStatus: session.status,
      connectBackEnabled:
        guestMayUsePublicAction(card, "connect", policy) && flags.tap_guest_exchange,
      host: payload,
    },
  };
}

export async function recordTapGuestReceipt(input: { joinCode: string; visitorName: string }) {
  const found = await findTapSessionBySecret(input.joinCode);
  if (!found || !OPEN_TAP_STATUSES.has(found.status)) return null;
  if (found.expiresAt.getTime() <= Date.now()) return null;
  const receipts = [
    ...guestReceiptsFromCapability(found.capabilityJson),
    { name: tapGuestFirstName(input.visitorName), at: new Date().toISOString() },
  ].slice(-8);
  const cap = capabilityRecord(found.capabilityJson);
  await prisma.celeYouProximitySession.update({
    where: { id: found.id },
    data: { capabilityJson: { ...cap, guestReceipts: receipts } as Prisma.InputJsonValue },
  });
  await securityEvent({
    sessionId: found.id,
    kind: "GUEST_CONNECT",
    meta: { name: tapGuestFirstName(input.visitorName) },
  });
  return found.id;
}

export async function assertTapGuestSessionForCard(joinCode: string, cardId: string) {
  const landing = await getTapGuestLanding(joinCode);
  if (landing.status !== 200) return landing;
  if (landing.data.host.id !== cardId) {
    return { status: 400 as const, error: "That connection QR is not for this CeleYou." };
  }
  return landing;
}
