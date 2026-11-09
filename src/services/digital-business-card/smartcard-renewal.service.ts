import { prisma } from "@/lib/prisma";
import { notificationService } from "@/services/notifications/notification.service";
import { communicationService } from "@/services/communications/communication.service";
import { normalizeSocials } from "@/lib/digital-business-card/types";
import { getAppUrlFromEnv } from "@/lib/app-url";

export const SMARTCARD_RENEWAL_WINDOWS = [72, 48, 24] as const;
export type SmartCardRenewalWindow = (typeof SMARTCARD_RENEWAL_WINDOWS)[number] | 0;

export function dueRenewalWindow(expiresAt: Date, now = new Date()): SmartCardRenewalWindow | null {
  const hoursLeft = (expiresAt.getTime() - now.getTime()) / 3_600_000;
  if (hoursLeft <= 0) return 0;
  if (hoursLeft <= 24) return 24;
  if (hoursLeft <= 48) return 48;
  if (hoursLeft <= 72) return 72;
  return null;
}

function reminderType(windowHours: SmartCardRenewalWindow) {
  return windowHours === 0 ? "SMARTCARD_EXPIRED" : `SMARTCARD_RENEWAL_${windowHours}`;
}

function copyForWindow(windowHours: SmartCardRenewalWindow, displayName: string, hoursLeft: number) {
  const billing = `${getAppUrlFromEnv()}/dashboard/business-card/billing`;
  if (windowHours === 0) {
    return {
      title: "Your CeleCard is off",
      body: `${displayName} is no longer live. Renew on Celeventic to turn QR, NFC, and Wallet sharing back on. ${billing}`,
      sms: `${displayName} is off. Renew your Celeventic CeleCard to go live again: ${billing}`,
    };
  }
  const hours = Math.max(1, Math.round(hoursLeft));
  return {
    title: `CeleCard live for ${hours} more hours`,
    body: `${displayName} stays live for about ${hours} hours. Renew now so your public card does not go dark. ${billing}`,
    sms: `Celeventic CeleCard: ${displayName} expires in about ${hours} hours. Renew: ${billing}`,
  };
}

function digitsPhone(value?: string | null): string | null {
  if (!value) return null;
  const digits = value.replace(/[^\d]/g, "");
  return digits.length >= 10 ? digits : null;
}

export async function runSmartCardRenewalReminders(now = new Date()) {
  const horizon = new Date(now.getTime() + 72 * 3_600_000);
  const cards = await prisma.digitalBusinessCard.findMany({
    where: {
      subscriptionStatus: { in: ["ACTIVE", "EXPIRED"] },
      subscriptionExpiresAt: { not: null, lte: horizon },
    },
    include: {
      user: { select: { id: true, email: true, phone: true, name: true } },
    },
    take: 200,
  });

  const results = {
    scanned: cards.length,
    expired: 0,
    reminded: 0,
    skipped: 0,
    channelErrors: 0,
  };

  for (const card of cards) {
    if (!card.subscriptionExpiresAt) continue;
    const windowHours = dueRenewalWindow(card.subscriptionExpiresAt, now);
    if (windowHours === null) {
      results.skipped += 1;
      continue;
    }

    if (windowHours === 0 && card.subscriptionStatus === "ACTIVE") {
      await prisma.digitalBusinessCard.update({
        where: { id: card.id },
        data: { subscriptionStatus: "EXPIRED", isPublished: card.isPublished },
      });
      results.expired += 1;
    }

    const type = reminderType(windowHours);
    const link = `/dashboard/business-card/billing?card=${card.id}`;
    const already = await prisma.notification.findFirst({
      where: { userId: card.userId, type, link },
      select: { id: true },
    });
    if (already) {
      results.skipped += 1;
      continue;
    }

    const hoursLeft = (card.subscriptionExpiresAt.getTime() - now.getTime()) / 3_600_000;
    const copy = copyForWindow(windowHours, card.displayName, hoursLeft);
    await notificationService.notify(card.userId, {
      title: copy.title,
      message: copy.body,
      type,
      link,
    });

    const socials = normalizeSocials(card.socials);
    const email = card.email || card.user.email;
    const smsPhone = digitsPhone(card.phone) || digitsPhone(card.user.phone);
    const waPhone = digitsPhone(socials.whatsapp) || smsPhone;

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

  return results;
}
