import { prisma } from "@/lib/prisma";
import { notificationService } from "@/services/notifications/notification.service";
import { communicationService } from "@/services/communications/communication.service";
import { normalizeSocials } from "@/lib/digital-business-card/types";
import { getAppUrlFromEnv } from "@/lib/app-url";
import {
  DEFAULT_CELECARD_LIFECYCLE_POLICY,
  dueReminderOffsetDays,
  graceWindowEnd,
  resolveCeleCardLifecycle,
  skipReminderForShortTerm,
} from "@/lib/digital-business-card/lifecycle";
import { getCeleCardLifecyclePolicy } from "./lifecycle-policy.service";
import { recordCeleCardLifecycleEvent } from "./digital-business-card.service";

export const SMARTCARD_RENEWAL_WINDOWS = [72, 48, 24] as const;
export type SmartCardRenewalWindow = (typeof SMARTCARD_RENEWAL_WINDOWS)[number] | 0;
export const SMARTCARD_RENEWAL_SCAN_PAGE_SIZE = 100;
export const SMARTCARD_RENEWAL_SCAN_MAX = 5_000;

export function celeCardReminderLegacyLink(cardId: string) {
  return `/dashboard/business-card/billing?card=${cardId}`;
}

export function celeCardReminderDedupeLink(cardId: string, expiresAt: Date) {
  return `${celeCardReminderLegacyLink(cardId)}&term=${expiresAt.toISOString().slice(0, 10)}`;
}

/** Legacy hour windows kept for existing tests. Prefer dueReminderOffsetDays. */
export function dueRenewalWindow(expiresAt: Date, now = new Date()): SmartCardRenewalWindow | null {
  const hoursLeft = (expiresAt.getTime() - now.getTime()) / 3_600_000;
  if (hoursLeft <= 0) return 0;
  if (hoursLeft <= 24) return 24;
  if (hoursLeft <= 48) return 48;
  if (hoursLeft <= 72) return 72;
  return null;
}

function reminderType(offsetDays: number) {
  if (offsetDays === 3) return "SMARTCARD_RENEWAL_72";
  if (offsetDays === 2) return "SMARTCARD_RENEWAL_48";
  if (offsetDays === 1) return "SMARTCARD_RENEWAL_24";
  if (offsetDays === 0) return "SMARTCARD_EXPIRED";
  if (offsetDays > 0) return `CELECARD_REMIND_${offsetDays}D`;
  return `CELECARD_REMIND_PLUS_${Math.abs(offsetDays)}D`;
}

function copyForOffset(offsetDays: number, displayName: string) {
  const billing = `${getAppUrlFromEnv()}/dashboard/business-card/billing`;
  if (offsetDays === 0) {
    return {
      title: "Your CeleYou is ready when you are",
      body: `${displayName} is preserved with its designs and sharing link. Reactivate whenever you are ready. ${billing}`,
      sms: `${displayName} is preserved on CeleYou. Reactivate: ${billing}`,
    };
  }
  if (offsetDays < 0) {
    return {
      title: "Your connections are still finding you",
      body: `Visitors can still reach your CeleYou identity. Reactivate ${displayName} to restore the full profile. ${billing}`,
      sms: `Reactivate ${displayName} on CeleYou: ${billing}`,
    };
  }
  return {
    title: `CeleYou renews in ${offsetDays} day${offsetDays === 1 ? "" : "s"}`,
    body: `${displayName} stays live for about ${offsetDays} day${offsetDays === 1 ? "" : "s"}. Renew now so your public card stays available. ${billing}`,
    sms: `Celeventic CeleYou: ${displayName} renews in about ${offsetDays} days. ${billing}`,
  };
}

function digitsPhone(value?: string | null): string | null {
  if (!value) return null;
  const digits = value.replace(/[^\d]/g, "");
  return digits.length >= 10 ? digits : null;
}

function termDays(activatedAt: Date | null, expiresAt: Date): number | null {
  if (!activatedAt) return null;
  return (expiresAt.getTime() - activatedAt.getTime()) / 86_400_000;
}

export async function runSmartCardRenewalReminders(now = new Date()) {
  const policy = await getCeleCardLifecyclePolicy();
  const maxBefore = Math.max(0, ...policy.reminderOffsetsDays);
  const horizon = new Date(now.getTime() + maxBefore * 86_400_000);
  const afterHorizon = new Date(now.getTime() - 31 * 86_400_000);
  const where = {
    deletedAt: null,
    adminSuspendedAt: null,
    subscriptionStatus: { in: ["ACTIVE", "EXPIRED"] },
    subscriptionExpiresAt: { not: null, lte: horizon, gte: afterHorizon },
  };

  const results = {
    scanned: 0,
    expired: 0,
    courtesy: 0,
    reminded: 0,
    skipped: 0,
    channelErrors: 0,
    pages: 0,
  };

  let cursor: string | undefined;
  let scanned = 0;

  while (scanned < SMARTCARD_RENEWAL_SCAN_MAX) {
    const batch = await prisma.digitalBusinessCard.findMany({
      where,
      include: {
        user: { select: { id: true, email: true, phone: true, name: true } },
      },
      orderBy: { id: "asc" },
      take: SMARTCARD_RENEWAL_SCAN_PAGE_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });
    if (!batch.length) break;
    results.pages += 1;
    scanned += batch.length;
    results.scanned = scanned;
    cursor = batch[batch.length - 1]?.id;

    for (const card of batch) {
    if (!card.subscriptionExpiresAt) continue;
    const offset = dueReminderOffsetDays(card.subscriptionExpiresAt, now, policy.reminderOffsetsDays);
    if (offset === null) {
      results.skipped += 1;
      continue;
    }
    if (skipReminderForShortTerm(offset, termDays(card.lastActivatedAt, card.subscriptionExpiresAt))) {
      results.skipped += 1;
      continue;
    }

    const lifecycle = resolveCeleCardLifecycle(card, now, policy);
    if (offset <= 0 && card.subscriptionStatus === "ACTIVE") {
      await prisma.digitalBusinessCard.update({
        where: { id: card.id },
        data: { subscriptionStatus: "EXPIRED", isPublished: card.isPublished },
      });
      results.expired += 1;
      await recordCeleCardLifecycleEvent({ cardId: card.id, kind: "SubscriptionExpired" });
    }

    const graceEnd = graceWindowEnd(card, policy);
    if (
      graceEnd &&
      now.getTime() >= graceEnd.getTime() &&
      lifecycle === "COURTESY" &&
      !card.lastCourtesyAt
    ) {
      await prisma.digitalBusinessCard.update({
        where: { id: card.id },
        data: { lastCourtesyAt: now },
      });
      results.courtesy += 1;
      await recordCeleCardLifecycleEvent({ cardId: card.id, kind: "CourtesyModeEntered" });
    }

    const type = reminderType(offset);
    const link = celeCardReminderDedupeLink(card.id, card.subscriptionExpiresAt);
    const legacyLink = celeCardReminderLegacyLink(card.id);
    const already = await prisma.notification.findFirst({
      where: { userId: card.userId, type, OR: [{ link }, { link: legacyLink }] },
      select: { id: true },
    });
    if (already) {
      results.skipped += 1;
      continue;
    }

    const copy = copyForOffset(offset, card.displayName);
    await notificationService.notify(card.userId, {
      title: copy.title,
      message: copy.body,
      type,
      link,
    });

    const socials = normalizeSocials(card.socials);
    const email = card.email || card.user.email;
    const smsPhone = digitsPhone(card.phone) || digitsPhone(card.user.phone);
    const whatsapp = Array.isArray(socials.whatsapp) ? socials.whatsapp[0] : socials.whatsapp;
    const waPhone = digitsPhone(typeof whatsapp === "string" ? whatsapp : null) || smsPhone;

    if (email) {
      const emailResult = await communicationService.trySendDirect({
        channel: "EMAIL",
        to: email,
        subject: copy.title,
        body: copy.body,
      });
      if (!emailResult.ok) results.channelErrors += 1;
    }
    if (waPhone) {
      const waResult = await communicationService.trySendDirect({
        channel: "WHATSAPP",
        to: waPhone,
        body: copy.sms,
      });
      if (!waResult.ok) results.channelErrors += 1;
    }
    if (smsPhone) {
      const smsResult = await communicationService.trySendDirect({
        channel: "SMS",
        to: smsPhone,
        body: copy.sms,
      });
      if (!smsResult.ok) results.channelErrors += 1;
    }

    results.reminded += 1;
    }

    if (batch.length < SMARTCARD_RENEWAL_SCAN_PAGE_SIZE) break;
  }

  return results;
}
