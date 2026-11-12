import { prisma } from "@/lib/prisma";
import { dispatchJob } from "@/lib/queue";
import { notificationService } from "@/services/notifications/notification.service";
import { communicationService } from "@/services/communications/communication.service";
import type { CeleYouConnectFlags } from "@/lib/celeyou-connect/flags";
import { isCeleYouConnectFlagOn } from "@/lib/celeyou-connect/flags";
import { celeYouDeliveryKey } from "@/lib/celeyou-connect/pair";
import { CELEYOU_CONNECT_QUEUE } from "@/lib/celeyou-connect/queues";
import {
  DEFAULT_CELEYOU_FOLLOWUP_SUBJECT,
  celeYouFollowupDelayMinutes,
  celeYouGuestFirstName,
  defaultCeleYouFollowupBody,
  renderCeleYouFollowupTemplate,
  type CeleYouFollowupDelay,
} from "@/lib/celeyou-connect/followup-copy";
import { celeYouProductionOrigin, getAppUrlFromEnv } from "@/lib/app-url";
import { digitalCardIdentityUrl } from "@/lib/digital-business-card/types";
import { smartCardStudioPath } from "@/lib/auth/safe-next-path";

async function prefsFor(userId: string) {
  return (
    (await prisma.celeYouConnectPreference.findUnique({ where: { userId } })) ?? {
      newConnectionAlerts: true,
      exchangeAlerts: true,
      followupReminders: true,
      weeklySummary: false,
      marketingNotifications: false,
    }
  );
}

async function enqueueDelivery(input: {
  connectionId: string;
  cardId: string;
  kind: "OWNER_NOTICE" | "GUEST_FOLLOWUP" | "EXCHANGE_NOTICE";
  toEmail: string;
  subject: string;
  body: string;
  runAt: Date;
}) {
  const idempotencyKey = celeYouDeliveryKey(input.kind, input.connectionId);
  const existing = await prisma.celeYouConnectDelivery.findUnique({
    where: { idempotencyKey },
  });
  if (existing) return existing;
  const row = await prisma.celeYouConnectDelivery.create({
    data: {
      connectionId: input.connectionId,
      cardId: input.cardId,
      kind: input.kind,
      toEmail: input.toEmail,
      subject: input.subject,
      body: input.body,
      status: "SCHEDULED",
      runAt: input.runAt,
      idempotencyKey,
    },
  });
  await dispatchJob(CELEYOU_CONNECT_QUEUE, { deliveryId: row.id }, 5, input.runAt);
  await prisma.celeYouConnectEvent
    .create({
      data: {
        connectionId: input.connectionId,
        cardId: input.cardId,
        kind: input.kind === "GUEST_FOLLOWUP" ? "FOLLOWUP_SCHEDULED" : "OWNER_NOTIFIED",
        meta: { deliveryId: row.id, kind: input.kind },
      },
    })
    .catch(() => undefined);
  return row;
}

export async function scheduleCeleYouConnectSideEffects(input: {
  flags: CeleYouConnectFlags;
  kind: "connect_back" | "exchange";
  connectionId: string;
  cardId: string;
  ownerUserId: string;
  ownerDisplayName: string;
  ownerEmail?: string | null;
  visitorName: string;
  visitorEmail?: string | null;
  followupConsent: boolean;
  visitorUserId?: string | null;
}) {
  const prefs = await prefsFor(input.ownerUserId);
  const alertOn =
    input.kind === "exchange"
      ? prefs.exchangeAlerts
      : prefs.newConnectionAlerts;
  const inboxLink = `${smartCardStudioPath()}#studio-inbox`;

  if (isCeleYouConnectFlagOn(input.flags, "connect_notifications") && alertOn) {
    const title =
      input.kind === "exchange" ? "New CeleYou exchange" : "New CeleYou connection";
    const message =
      input.kind === "exchange"
        ? `${input.visitorName} exchanged CeleYou cards with you.`
        : `${input.visitorName} connected with you.`;
    await notificationService.notify(input.ownerUserId, {
      title,
      message: `${message} Open Connect in studio to view the details.`,
      type: input.kind === "exchange" ? "CELEYOU_EXCHANGE" : "CELEYOU_CONNECTION",
      link: inboxLink,
    });
    if (input.ownerEmail) {
      await enqueueDelivery({
        connectionId: input.connectionId,
        cardId: input.cardId,
        kind: input.kind === "exchange" ? "EXCHANGE_NOTICE" : "OWNER_NOTICE",
        toEmail: input.ownerEmail,
        subject: title,
        body: [
          `Hello ${celeYouGuestFirstName(input.ownerDisplayName) || "there"},`,
          "",
          message,
          "",
          "You can view the details in your CeleYou dashboard.",
          "",
          `View connection: ${celeYouProductionOrigin(getAppUrlFromEnv())}${inboxLink}`,
        ].join("\n"),
        runAt: new Date(),
      });
    }
    if (input.kind === "exchange" && input.visitorUserId) {
      const visitorPrefs = await prefsFor(input.visitorUserId);
      if (visitorPrefs.exchangeAlerts) {
        await notificationService.notify(input.visitorUserId, {
          title: "CeleYou cards exchanged",
          message: `You exchanged cards with ${input.ownerDisplayName}. Open Connections in studio to view the details.`,
          type: "CELEYOU_EXCHANGE",
          link: inboxLink,
        });
      }
    }
  }

  if (!isCeleYouConnectFlagOn(input.flags, "connect_auto_followup")) return;
  if (!input.visitorEmail) return;

  const automation = await prisma.celeYouConnectAutomation.findUnique({
    where: { cardId: input.cardId },
  });
  if (!automation?.enabled) return;
  if (automation.requireFollowupConsent && !input.followupConsent) return;

  const card = await prisma.digitalBusinessCard.findUnique({
    where: { id: input.cardId },
    select: { slug: true, displayName: true },
  });
  if (!card) return;

  const profileUrl = digitalCardIdentityUrl(
    card.slug,
    celeYouProductionOrigin(getAppUrlFromEnv())
  );
  const vars = {
    guestName: celeYouGuestFirstName(input.visitorName),
    ownerName: card.displayName,
    profileUrl,
  };
  const subject = renderCeleYouFollowupTemplate(
    automation.subject || DEFAULT_CELEYOU_FOLLOWUP_SUBJECT,
    vars
  );
  const body = renderCeleYouFollowupTemplate(
    automation.body || defaultCeleYouFollowupBody({ displayName: card.displayName, profileUrl }, vars.guestName),
    vars
  );
  const minutes = celeYouFollowupDelayMinutes(
    automation.delay as CeleYouFollowupDelay,
    automation.customDelayMinutes
  );
  await enqueueDelivery({
    connectionId: input.connectionId,
    cardId: input.cardId,
    kind: "GUEST_FOLLOWUP",
    toEmail: input.visitorEmail,
    subject,
    body,
    runAt: new Date(Date.now() + minutes * 60_000),
  });
}

export async function processCeleYouConnectDelivery(deliveryId: string) {
  const delivery = await prisma.celeYouConnectDelivery.findUnique({
    where: { id: deliveryId },
  });
  if (!delivery) return;
  if (delivery.status === "SENT" || delivery.status === "CANCELLED" || delivery.status === "SUPPRESSED") {
    return;
  }
  if (delivery.runAt.getTime() > Date.now()) {
    await dispatchJob(CELEYOU_CONNECT_QUEUE, { deliveryId: delivery.id }, 5, delivery.runAt);
    return;
  }

  await prisma.celeYouConnectDelivery.update({
    where: { id: delivery.id },
    data: { status: "SENDING", attempts: { increment: 1 } },
  });

  const result = await communicationService.trySendDirect({
    channel: "EMAIL",
    to: delivery.toEmail,
    subject: delivery.subject,
    body: delivery.body,
  });

  if (result.ok) {
    await prisma.celeYouConnectDelivery.update({
      where: { id: delivery.id },
      data: {
        status: "SENT",
        providerAccepted: true,
        sentAt: new Date(),
        lastError: null,
      },
    });
    if (delivery.connectionId && delivery.kind === "GUEST_FOLLOWUP") {
      await prisma.smartCardConnection.update({
        where: { id: delivery.connectionId },
        data: { lastFollowupAt: new Date() },
      });
      await prisma.celeYouConnectEvent
        .create({
          data: {
            connectionId: delivery.connectionId,
            cardId: delivery.cardId,
            kind: "FOLLOWUP_SENT",
            meta: { deliveryId: delivery.id },
          },
        })
        .catch(() => undefined);
    }
    return;
  }

  const attempts = delivery.attempts + 1;
  const failed = attempts >= 5;
  await prisma.celeYouConnectDelivery.update({
    where: { id: delivery.id },
    data: {
      status: failed ? "FAILED" : "SCHEDULED",
      lastError: result.error || "Send failed",
    },
  });
  if (!failed) {
    const backoffMs = Math.min(60 * 60_000, 2 ** attempts * 30_000);
    await dispatchJob(
      CELEYOU_CONNECT_QUEUE,
      { deliveryId: delivery.id },
      5,
      new Date(Date.now() + backoffMs)
    );
  }
}

export async function upsertCeleYouConnectAutomation(input: {
  userId: string;
  cardId: string;
  enabled?: boolean;
  subject?: string;
  body?: string;
  delay?: CeleYouFollowupDelay;
  customDelayMinutes?: number | null;
  requireFollowupConsent?: boolean;
}) {
  const card = await prisma.digitalBusinessCard.findFirst({
    where: { id: input.cardId, userId: input.userId },
    select: { id: true, slug: true, displayName: true },
  });
  if (!card) return null;
  const profileUrl = digitalCardIdentityUrl(
    card.slug,
    celeYouProductionOrigin(getAppUrlFromEnv())
  );
  const defaults = {
    subject: DEFAULT_CELEYOU_FOLLOWUP_SUBJECT,
    body: defaultCeleYouFollowupBody(
      { displayName: card.displayName, profileUrl },
      "{{guestName}}"
    ),
    delay: "HOUR" as CeleYouFollowupDelay,
    customDelayMinutes: null as number | null,
    requireFollowupConsent: true,
    enabled: false,
  };
  const current = await prisma.celeYouConnectAutomation.findUnique({
    where: { cardId: card.id },
  });
  const next = {
    enabled: input.enabled ?? current?.enabled ?? defaults.enabled,
    subject: (input.subject ?? current?.subject ?? defaults.subject).slice(0, 160),
    body: (input.body ?? current?.body ?? defaults.body).slice(0, 4000),
    delay: input.delay ?? (current?.delay as CeleYouFollowupDelay | undefined) ?? defaults.delay,
    customDelayMinutes:
      input.customDelayMinutes === undefined
        ? current?.customDelayMinutes ?? defaults.customDelayMinutes
        : input.customDelayMinutes,
    requireFollowupConsent:
      input.requireFollowupConsent ??
      current?.requireFollowupConsent ??
      defaults.requireFollowupConsent,
  };
  return prisma.celeYouConnectAutomation.upsert({
    where: { cardId: card.id },
    create: { cardId: card.id, ...next },
    update: next,
  });
}

function maskEmail(value: string): string {
  const [local, domain] = value.split("@");
  if (!domain) return "***";
  const keep = local.slice(0, 1) || "*";
  return `${keep}***@${domain}`;
}

export async function getCeleYouConnectAutomation(userId: string, cardId: string) {
  const card = await prisma.digitalBusinessCard.findFirst({
    where: { id: cardId, userId },
    select: { id: true, slug: true, displayName: true },
  });
  if (!card) return null;
  const row = await prisma.celeYouConnectAutomation.findUnique({ where: { cardId } });
  const profileUrl = digitalCardIdentityUrl(
    card.slug,
    celeYouProductionOrigin(getAppUrlFromEnv())
  );
  const automation =
    row ?? {
      cardId,
      enabled: false,
      subject: DEFAULT_CELEYOU_FOLLOWUP_SUBJECT,
      body: defaultCeleYouFollowupBody({ displayName: card.displayName, profileUrl }, "{{guestName}}"),
      delay: "HOUR",
      customDelayMinutes: null,
      requireFollowupConsent: true,
    };
  const [deliveries, preferences] = await Promise.all([
    prisma.celeYouConnectDelivery.findMany({
      where: { cardId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        kind: true,
        status: true,
        runAt: true,
        sentAt: true,
        lastError: true,
        providerAccepted: true,
        toEmail: true,
        createdAt: true,
      },
    }),
    prefsFor(userId),
  ]);
  return {
    ...automation,
    deliveries: deliveries.map((item) => ({
      ...item,
      toEmail: maskEmail(item.toEmail),
    })),
    preferences,
  };
}

export function previewCeleYouFollowup(input: {
  subject: string;
  body: string;
  ownerName: string;
  guestName: string;
  slug: string;
}) {
  const profileUrl = digitalCardIdentityUrl(
    input.slug,
    celeYouProductionOrigin(getAppUrlFromEnv())
  );
  const vars = {
    guestName: celeYouGuestFirstName(input.guestName || "Ama"),
    ownerName: input.ownerName,
    profileUrl,
  };
  return {
    subject: renderCeleYouFollowupTemplate(input.subject, vars),
    body: renderCeleYouFollowupTemplate(input.body, vars),
  };
}

export async function sendCeleYouFollowupTest(input: {
  userId: string;
  cardId: string;
  toEmail: string;
  subject: string;
  body: string;
}) {
  const card = await prisma.digitalBusinessCard.findFirst({
    where: { id: input.cardId, userId: input.userId },
    select: { displayName: true, slug: true },
  });
  if (!card) return { error: "Not found" as const };
  const preview = previewCeleYouFollowup({
    subject: input.subject,
    body: input.body,
    ownerName: card.displayName,
    guestName: "Ama",
    slug: card.slug,
  });
  const result = await communicationService.trySendDirect({
    channel: "EMAIL",
    to: input.toEmail,
    subject: `[Test] ${preview.subject}`,
    body: preview.body,
  });
  return { ok: result.ok, error: result.error, preview };
}
