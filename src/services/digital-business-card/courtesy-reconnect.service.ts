import { prisma } from "@/lib/prisma";
import { notificationService } from "@/services/notifications/notification.service";
import { communicationService } from "@/services/communications/communication.service";
import { getAppUrlFromEnv } from "@/lib/app-url";
import {
  DEFAULT_CELECARD_LIFECYCLE_POLICY,
  type CeleCardLifecyclePolicy,
} from "@/lib/digital-business-card/lifecycle";
import { courtesyGivenName } from "@/lib/digital-business-card/courtesy";
import { parseCeleCardLeadStatus } from "@/lib/digital-business-card/leads";
import { recordCeleCardLifecycleEvent } from "./digital-business-card.service";

const DUPLICATE_WINDOW_MS = 6 * 3_600_000;

export function normalizeReconnectFingerprint(input: {
  visitorName?: string | null;
  visitorEmail?: string | null;
  visitorPhone?: string | null;
  ip?: string | null;
}) {
  const email = input.visitorEmail?.trim().toLowerCase() || "";
  const phone = (input.visitorPhone || "").replace(/[^\d]/g, "");
  const name = (input.visitorName || "visitor").trim().toLowerCase();
  if (email) return `email:${email}`;
  if (phone) return `phone:${phone}`;
  return `anon:${input.ip || "unknown"}:${name}`;
}

export async function createCourtesyReconnect(input: {
  cardId: string;
  ownerUserId: string;
  ownerDisplayName: string;
  ownerEmail?: string | null;
  visitorName?: string | null;
  visitorEmail?: string | null;
  visitorPhone?: string | null;
  note?: string | null;
  consent: boolean;
  ip?: string | null;
  policy?: CeleCardLifecyclePolicy;
}) {
  const policy = input.policy ?? DEFAULT_CELECARD_LIFECYCLE_POLICY;
  const hasContact = Boolean(input.visitorEmail?.trim() || input.visitorPhone?.trim());
  if (hasContact && !input.consent) {
    throw new Error("Consent is required when sharing contact details");
  }

  const visitorName = (input.visitorName?.trim() || "A visitor").slice(0, 120);
  const visitorEmail = input.visitorEmail?.trim() || null;
  const visitorPhone = input.visitorPhone?.trim() || null;
  const fingerprint = normalizeReconnectFingerprint({
    visitorName,
    visitorEmail,
    visitorPhone,
    ip: input.ip,
  });

  const since = new Date(Date.now() - DUPLICATE_WINDOW_MS);
  const duplicate = await prisma.smartCardConnection.findFirst({
    where: {
      cardId: input.cardId,
      source: "courtesy_reconnect",
      createdAt: { gte: since },
      OR: [
        visitorEmail ? { visitorEmail } : undefined,
        visitorPhone ? { visitorPhone } : undefined,
        {
          visitorName,
          visitorEmail: null,
          visitorPhone: null,
        },
      ].filter(Boolean) as object[],
    },
    select: { id: true },
  });
  if (duplicate) {
    return { id: duplicate.id, duplicate: true as const };
  }

  const connection = await prisma.smartCardConnection.create({
    data: {
      cardId: input.cardId,
      visitorName,
      visitorEmail,
      visitorPhone,
      note: input.note?.trim() || null,
      formMode: "Courtesy",
      source: "courtesy_reconnect",
      status: "NEW",
      tags: [fingerprint],
      consentAt: hasContact ? new Date() : new Date(0),
    },
  });

  await prisma.smartCardInteraction
    .create({
      data: {
        cardId: input.cardId,
        kind: "courtesy_reconnect",
        meta: { connectionId: connection.id, anonymous: !hasContact },
      },
    })
    .catch(() => undefined);

  await recordCeleCardLifecycleEvent({
    cardId: input.cardId,
    kind: "ConnectionRequested",
    meta: { connectionId: connection.id, anonymous: !hasContact },
  });

  await notifyOwnerReconnect({
    ownerUserId: input.ownerUserId,
    ownerDisplayName: input.ownerDisplayName,
    ownerEmail: input.ownerEmail,
    cardId: input.cardId,
    batchHours: policy.reconnectBatchHours,
  });

  return { id: connection.id, duplicate: false as const };
}

async function notifyOwnerReconnect(input: {
  ownerUserId: string;
  ownerDisplayName: string;
  ownerEmail?: string | null;
  cardId: string;
  batchHours: number;
}) {
  const link = `/dashboard/business-card/billing?card=${input.cardId}&reactivate=1`;
  const since = new Date(Date.now() - input.batchHours * 3_600_000);
  const already = await prisma.notification.findFirst({
    where: {
      userId: input.ownerUserId,
      type: "CELECARD_COURTESY_RECONNECT",
      link,
      createdAt: { gte: since },
    },
    select: { id: true },
  });
  if (already) return { batched: true };

  const first = courtesyGivenName(input.ownerDisplayName);
  const billing = `${getAppUrlFromEnv()}${link}`;
  const subject = "Someone wants to reconnect through your CeleYou";
  const body = [
    `Hello ${first},`,
    "",
    "Someone recently visited your CeleYou and requested access to your full digital profile.",
    "",
    "Your CeleYou identity, saved designs, and sharing link are safely preserved.",
    "You can reactivate your card whenever you’re ready.",
    "",
    `Reactivate My CeleYou: ${billing}`,
    "",
    "Your connections are still finding you.",
    "",
    "The CeleYou Team",
  ].join("\n");

  await notificationService.notify(input.ownerUserId, {
    title: subject,
    message: body,
    type: "CELECARD_COURTESY_RECONNECT",
    link,
  });

  if (input.ownerEmail) {
    await communicationService.trySendDirect({
      channel: "EMAIL",
      to: input.ownerEmail,
      subject,
      body,
    });
  }
  return { batched: false };
}

export async function listCardConnections(
  userId: string,
  cardId: string,
  page = 1,
  status?: string | null,
  query?: string | null
) {
  const card = await prisma.digitalBusinessCard.findFirst({
    where: { id: cardId, userId },
    select: { id: true },
  });
  if (!card) return null;
  const take = 20;
  const skip = Math.max(0, (page - 1) * take);
  const statusFilter = parseCeleCardLeadStatus(status);
  const needle = (query || "").trim().toLowerCase().slice(0, 80);
  const where = {
    cardId,
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(needle ? { searchText: { contains: needle } } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.smartCardConnection.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.smartCardConnection.count({ where }),
  ]);
  return { items, total, page, pageSize: take, status: statusFilter };
}

export async function updateCardConnectionStatus(
  userId: string,
  cardId: string,
  connectionId: string,
  status: string
) {
  const card = await prisma.digitalBusinessCard.findFirst({
    where: { id: cardId, userId },
    select: { id: true },
  });
  if (!card) return null;
  const nextStatus = parseCeleCardLeadStatus(status);
  if (!nextStatus) return { error: "Unknown request status" as const };
  const existing = await prisma.smartCardConnection.findFirst({
    where: { id: connectionId, cardId },
  });
  if (!existing) return { error: "Request not found" as const };
  const updated = await prisma.smartCardConnection.update({
    where: { id: existing.id },
    data: { status: nextStatus },
  });
  if (existing.status !== nextStatus) {
    await prisma.celeYouConnectEvent
      .create({
        data: {
          connectionId: updated.id,
          cardId,
          kind: "STATUS_CHANGED",
          actorUserId: userId,
          meta: { from: existing.status, to: nextStatus },
        },
      })
      .catch(() => undefined);
  }
  return { connection: updated };
}
