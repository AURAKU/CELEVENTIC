import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { notificationService } from "@/services/notifications/notification.service";
import { isWithinPaidWindow } from "@/lib/digital-business-card/lifecycle";
import { recordCeleCardLifecycleEvent } from "@/services/digital-business-card/digital-business-card.service";
import {
  CELEYOU_PRO_TRIAL_DAYS,
  CELEYOU_TRY_PRO_CTA,
  celeYouProTrialExpiry,
  celeYouTrialEligibility,
  celeYouTrialRemainingMs,
  celeYouTrialReminderCopy,
  dueCeleYouTrialReminder,
  formatCeleYouTrialClock,
  inferLegacyCeleYouTrial,
  isCeleYouProTrialActive,
  type CeleYouTrialReminderSlot,
  type CeleYouTrialSnapshot,
  type CeleYouTrialStatus,
} from "@/lib/digital-business-card/freemium";
import {
  CELEYOU_FREEMIUM_SHIP_AT,
  accountHasLegacyPaidSignal,
  assertCeleYouSubscriberMutationSafe,
  celeYouTrialExpiryMayTouchCard,
  classifyCeleYouAccount,
  resolveCeleYouSubscriptionFeatureFlags,
} from "@/lib/digital-business-card/subscriber-protection";

const REMINDER_FIELD: Record<CeleYouTrialReminderSlot, keyof TrialRow> = {
  day1: "reminderDay1At",
  day4: "reminderDay4At",
  day6: "reminderDay6At",
  day7: "reminderDay7At",
};

type TrialRow = {
  id: string;
  userId: string;
  cardId: string | null;
  family: string;
  status: string;
  startedAt: Date | null;
  expiresAt: Date | null;
  convertedAt: Date | null;
  durationDays: number;
  reminderDay1At: Date | null;
  reminderDay4At: Date | null;
  reminderDay6At: Date | null;
  reminderDay7At: Date | null;
};

function asSnapshot(row: TrialRow | null, userId: string): CeleYouTrialSnapshot {
  if (!row) return inferLegacyCeleYouTrial(userId, []);
  return {
    userId: row.userId,
    family: row.family === "business" ? "business" : "pro",
    status: row.status as CeleYouTrialStatus,
    startedAt: row.startedAt,
    expiresAt: row.expiresAt,
    convertedAt: row.convertedAt,
    durationDays: row.durationDays || CELEYOU_PRO_TRIAL_DAYS,
  };
}

async function writeTrialEvent(input: {
  trialId?: string | null;
  userId: string;
  actorId?: string | null;
  action: string;
  reason?: string | null;
}) {
  await prisma.celeYouTrialEvent.create({
    data: {
      trialId: input.trialId || undefined,
      userId: input.userId,
      actorId: input.actorId || undefined,
      action: input.action,
      reason: input.reason || undefined,
    },
  });
}

export async function getCeleYouTrialForUser(userId: string, now = new Date()) {
  const flags = resolveCeleYouSubscriptionFeatureFlags();
  const [row, cards, paidPayment] = await Promise.all([
    prisma.celeYouTrialRecord.findUnique({ where: { userId } }),
    prisma.digitalBusinessCard.findMany({
      where: { userId, deletedAt: null },
      select: {
        id: true,
        isPublished: true,
        subscriptionStatus: true,
        subscriptionExpiresAt: true,
        lastActivatedAt: true,
        lastActivationPaymentId: true,
        entitlementKind: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.payment.findFirst({
      where: { userId, purpose: "ADVERTISING", status: "SUCCESSFUL" },
      select: { id: true },
    }),
  ]);
  const snapshot = row
    ? asSnapshot(row, userId)
    : inferLegacyCeleYouTrial(userId, cards, now);
  const published = cards.find((card) => card.isPublished) ?? cards[0] ?? null;
  const paidNow = cards.some((card) => isWithinPaidWindow(card, now));
  const hasPaidHistory = accountHasLegacyPaidSignal(cards, now) || Boolean(paidPayment);
  const protection = classifyCeleYouAccount({
    cards,
    trialStatus: snapshot.status === "ELIGIBLE" && !row ? null : snapshot.status,
    hasAdvertisingPayment: Boolean(paidPayment),
    freemiumShipAt: CELEYOU_FREEMIUM_SHIP_AT,
    now,
  });
  const eligibility = celeYouTrialEligibility({
    published: Boolean(published?.isPublished),
    paidNow,
    hasPaidHistory,
    proTrialEnabled: flags.proTrialEnabled,
    mayStartProTrial: protection.mayStartProTrial,
    trial: snapshot,
    now,
  });
  const remainingMs = celeYouTrialRemainingMs(snapshot, now);
  return {
    trial: snapshot,
    record: row,
    card: published,
    paidNow,
    hasPaidHistory,
    protection,
    eligibility,
    remainingMs,
    clock: formatCeleYouTrialClock(remainingMs),
    cta: CELEYOU_TRY_PRO_CTA,
    active: isCeleYouProTrialActive(snapshot, now),
  };
}

export async function activateCeleYouProTrial(input: {
  userId: string;
  cardId?: string | null;
  actorId?: string | null;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const flags = resolveCeleYouSubscriptionFeatureFlags();
  try {
  return await prisma.$transaction(async (tx) => {
    const cards = await tx.digitalBusinessCard.findMany({
      where: { userId: input.userId, deletedAt: null },
      select: {
        id: true,
        isPublished: true,
        displayName: true,
        subscriptionStatus: true,
        subscriptionExpiresAt: true,
        lastActivatedAt: true,
        lastActivationPaymentId: true,
        entitlementKind: true,
        publicToken: true,
        slug: true,
        themeId: true,
        createdAt: true,
      },
    });
    const published =
      cards.find((card) => card.id === input.cardId && card.isPublished) ??
      cards.find((card) => card.isPublished) ??
      null;
    const existing = await tx.celeYouTrialRecord.findUnique({ where: { userId: input.userId } });
    const snapshot = existing
      ? asSnapshot(existing, input.userId)
      : inferLegacyCeleYouTrial(input.userId, cards, now);
    const paidNow = cards.some((card) => isWithinPaidWindow(card, now));
    const paidPayment = await tx.payment.findFirst({
      where: { userId: input.userId, purpose: "ADVERTISING", status: "SUCCESSFUL" },
      select: { id: true },
    });
    const hasPaidHistory = accountHasLegacyPaidSignal(cards, now) || Boolean(paidPayment);
    const protection = classifyCeleYouAccount({
      cards,
      trialStatus: snapshot.status === "ELIGIBLE" && !existing ? null : snapshot.status,
      hasAdvertisingPayment: Boolean(paidPayment),
      freemiumShipAt: CELEYOU_FREEMIUM_SHIP_AT,
      now,
    });
    const eligibility = celeYouTrialEligibility({
      published: Boolean(published?.isPublished),
      paidNow,
      hasPaidHistory,
      proTrialEnabled: flags.proTrialEnabled,
      mayStartProTrial: protection.mayStartProTrial,
      trial: snapshot,
      now,
    });
    if (!eligibility.eligible || !published) {
      if (existing) {
        await tx.celeYouTrialEvent.create({
          data: {
            trialId: existing.id,
            userId: input.userId,
            actorId: input.actorId || undefined,
            action: "duplicate_blocked",
            reason: eligibility.reason,
          },
        });
      }
      return { ok: false as const, error: eligibility.message, reason: eligibility.reason };
    }

    if (!celeYouTrialExpiryMayTouchCard(published) && published.subscriptionStatus !== "FREE") {
      return {
        ok: false as const,
        error: "Existing paid CeleYou accounts keep their original terms.",
        reason: "paid_history" as const,
      };
    }
    const proposed = {
      subscriptionStatus: "TRIAL",
      subscriptionExpiresAt: celeYouProTrialExpiry(now, CELEYOU_PRO_TRIAL_DAYS),
    };
    const safe = assertCeleYouSubscriberMutationSafe({
      before: published,
      after: proposed,
      now,
    });
    if (!safe.ok) {
      return {
        ok: false as const,
        error: "Existing paid CeleYou accounts keep their original terms.",
        reason: "paid_history" as const,
      };
    }

    const durationDays = CELEYOU_PRO_TRIAL_DAYS;
    const expiresAt = proposed.subscriptionExpiresAt;

    const record = existing
      ? await tx.celeYouTrialRecord.update({
          where: { id: existing.id },
          data: {
            cardId: published.id,
            family: "pro",
            status: "ACTIVE",
            startedAt: now,
            expiresAt,
            durationDays,
            convertedAt: null,
            convertedPlanId: null,
          },
        })
      : await tx.celeYouTrialRecord.create({
          data: {
            userId: input.userId,
            cardId: published.id,
            family: "pro",
            status: "ACTIVE",
            startedAt: now,
            expiresAt,
            durationDays,
          },
        });

    await tx.digitalBusinessCard.update({
      where: { id: published.id },
      data: {
        subscriptionStatus: "TRIAL",
        subscriptionExpiresAt: expiresAt,
      },
    });
    await tx.celeYouTrialEvent.create({
      data: {
        trialId: record.id,
        userId: input.userId,
        actorId: input.actorId || undefined,
        action: "activated",
      },
    });
    await recordCeleCardLifecycleEvent({
      cardId: published.id,
      kind: "TrialActivated",
      meta: { durationDays, expiresAt: expiresAt.toISOString() },
    });
    return {
      ok: true as const,
      trial: asSnapshot(record, input.userId),
      cardId: published.id,
      displayName: published.displayName,
      expiresAt,
    };
  });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return {
        ok: false as const,
        error: "Your CeleYou Pro trial is already running.",
        reason: "already_active" as const,
      };
    }
    throw error;
  }
}

export async function expireCeleYouProTrials(now = new Date()) {
  const due = await prisma.celeYouTrialRecord.findMany({
    where: {
      status: "ACTIVE",
      expiresAt: { lte: now },
    },
    take: 200,
  });
  let expired = 0;
  for (const row of due) {
    await prisma.$transaction(async (tx) => {
      await tx.celeYouTrialRecord.update({
        where: { id: row.id },
        data: { status: "EXPIRED" },
      });
      const touchable = await tx.digitalBusinessCard.findMany({
        where: {
          userId: row.userId,
          deletedAt: null,
          subscriptionStatus: "TRIAL",
          lastActivatedAt: null,
          lastActivationPaymentId: null,
          OR: [{ entitlementKind: null }, { entitlementKind: { notIn: ["PAID", "COMPLIMENTARY"] } }],
        },
        select: {
          id: true,
          subscriptionStatus: true,
          subscriptionExpiresAt: true,
          lastActivatedAt: true,
          lastActivationPaymentId: true,
          entitlementKind: true,
        },
      });
      const ids = touchable.filter((card) => celeYouTrialExpiryMayTouchCard(card)).map((card) => card.id);
      if (ids.length) {
        await tx.digitalBusinessCard.updateMany({
          where: { id: { in: ids } },
          data: { subscriptionStatus: "FREE" },
        });
      }
      await tx.celeYouTrialEvent.create({
        data: {
          trialId: row.id,
          userId: row.userId,
          action: "expired",
        },
      });
    });
    if (row.cardId) {
      await recordCeleCardLifecycleEvent({
        cardId: row.cardId,
        kind: "TrialExpired",
        meta: { trialId: row.id },
      });
    }
    expired += 1;
  }
  const legacyCandidates = await prisma.digitalBusinessCard.findMany({
    where: {
      deletedAt: null,
      subscriptionStatus: "TRIAL",
      lastActivatedAt: null,
      lastActivationPaymentId: null,
      subscriptionExpiresAt: { lte: now },
      OR: [{ entitlementKind: null }, { entitlementKind: { notIn: ["PAID", "COMPLIMENTARY"] } }],
    },
    select: {
      id: true,
      subscriptionStatus: true,
      subscriptionExpiresAt: true,
      lastActivatedAt: true,
      lastActivationPaymentId: true,
      entitlementKind: true,
    },
    take: 500,
  });
  const legacyIds = legacyCandidates.filter((card) => celeYouTrialExpiryMayTouchCard(card)).map((card) => card.id);
  const legacy = legacyIds.length
    ? await prisma.digitalBusinessCard.updateMany({
        where: { id: { in: legacyIds } },
        data: { subscriptionStatus: "FREE" },
      })
    : { count: 0 };
  return { scanned: due.length, expired, legacyExpired: legacy.count };
}

export async function convertCeleYouTrialToPaid(input: {
  userId: string;
  planId: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const row = await prisma.celeYouTrialRecord.findUnique({ where: { userId: input.userId } });
  if (!row || row.status !== "ACTIVE") return null;
  const updated = await prisma.celeYouTrialRecord.update({
    where: { id: row.id },
    data: {
      status: "CONVERTED",
      convertedAt: now,
      convertedPlanId: input.planId,
    },
  });
  await prisma.celeYouTrialEvent.create({
    data: {
      trialId: row.id,
      userId: input.userId,
      action: "converted",
      reason: input.planId,
    },
  });
  if (row.cardId) {
    await recordCeleCardLifecycleEvent({
      cardId: row.cardId,
      kind: "TrialConverted",
      meta: { planId: input.planId },
    });
  }
  return updated;
}

export async function runCeleYouTrialReminders(now = new Date()) {
  const rows = await prisma.celeYouTrialRecord.findMany({
    where: { status: { in: ["ACTIVE", "EXPIRED"] } },
    include: {
      user: { select: { id: true, email: true, name: true } },
      card: { select: { id: true, displayName: true } },
    },
    take: 500,
  });
  let reminded = 0;
  for (const row of rows) {
    const snapshot = asSnapshot(row, row.userId);
    const sent = {
      day1: row.reminderDay1At,
      day4: row.reminderDay4At,
      day6: row.reminderDay6At,
      day7: row.reminderDay7At,
    };
    const slot = dueCeleYouTrialReminder(snapshot, sent, now);
    if (!slot) continue;
    const field = REMINDER_FIELD[slot];
    const already = await prisma.notification.findFirst({
      where: {
        userId: row.userId,
        type: `CELEYOU_TRIAL_${slot.toUpperCase()}`,
        link: `/dashboard/business-card/billing?trial=${row.id}`,
      },
    });
    if (already) {
      await prisma.celeYouTrialRecord.update({
        where: { id: row.id },
        data: { [field]: now },
      });
      continue;
    }
    const displayName = row.card?.displayName || row.user.name || "your CeleYou";
    const copy = celeYouTrialReminderCopy(slot, displayName);
    await notificationService.notify(row.userId, {
      type: `CELEYOU_TRIAL_${slot.toUpperCase()}`,
      title: copy.title,
      message: copy.body,
      link: `/dashboard/business-card/billing?trial=${row.id}`,
    }).catch(() => undefined);
    await prisma.celeYouTrialRecord.update({
      where: { id: row.id },
      data: { [field]: now },
    });
    await writeTrialEvent({
      trialId: row.id,
      userId: row.userId,
      action: `reminder_${slot}`,
    });
    reminded += 1;
  }
  return { scanned: rows.length, reminded };
}
