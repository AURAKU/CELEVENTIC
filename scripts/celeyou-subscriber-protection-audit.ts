/**
 * Read-only CeleYou subscriber protection audit.
 * Safe for local or sanitized copies. Does not UPDATE or DELETE subscription rows.
 *
 *   DATABASE_URL="file:./prisma/dev.db" npx tsx scripts/celeyou-subscriber-protection-audit.ts
 */
import { PrismaClient } from "@prisma/client";
import {
  CELEYOU_FREEMIUM_SHIP_AT,
  CELEYOU_LEGACY_TRIAL_POLICY,
  CELEYOU_SUBSCRIBER_PROTECTION_VERSION,
  classifyCeleYouAccount,
  resolveCeleYouSubscriptionFeatureFlags,
  summarizeCeleYouSubscriptionAudit,
} from "../src/lib/digital-business-card/subscriber-protection";

async function main() {
  const prisma = new PrismaClient();
  const now = new Date();
  const flags = resolveCeleYouSubscriptionFeatureFlags();
  try {
    const trialDelegate = (prisma as { celeYouTrialRecord?: { findMany: Function } }).celeYouTrialRecord;
    const [cards, trials, pendingPayments, successPayments, grants, nfc] = await Promise.all([
      prisma.digitalBusinessCard.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          userId: true,
          isPublished: true,
          subscriptionStatus: true,
          subscriptionExpiresAt: true,
          lastActivatedAt: true,
          lastActivationPaymentId: true,
          entitlementKind: true,
          publicToken: true,
          slug: true,
          themeId: true,
          createdAt: true,
          deletedAt: true,
        },
      }),
      trialDelegate
        ? trialDelegate.findMany({
            select: { userId: true, status: true, startedAt: true, expiresAt: true },
          })
        : Promise.resolve([] as Array<{ userId: string; status: string; startedAt: Date | null; expiresAt: Date | null }>),
      prisma.payment.count({
        where: { purpose: "ADVERTISING", status: "PENDING" },
      }),
      prisma.payment.findMany({
        where: { purpose: "ADVERTISING", status: "SUCCESSFUL" },
        select: { userId: true },
      }),
      prisma.smartCardEntitlementGrant.count(),
      prisma.smartCardNfcDevice.count({ where: { status: { not: "REVOKED" } } }),
    ]);

    const paidUsers = new Set(successPayments.map((row) => row.userId));
    const trialByUser = new Map(trials.map((row) => [row.userId, row]));
    const byUser = new Map<string, typeof cards>();
    for (const card of cards) {
      const list = byUser.get(card.userId) ?? [];
      list.push(card);
      byUser.set(card.userId, list);
    }

    const classes: Record<string, number> = {};
    let reviewRequired = 0;
    for (const [userId, userCards] of byUser) {
      const trial = trialByUser.get(userId);
      const verdict = classifyCeleYouAccount({
        cards: userCards,
        trialStatus: trial?.status ?? null,
        hasAdvertisingPayment: paidUsers.has(userId),
        freemiumShipAt: CELEYOU_FREEMIUM_SHIP_AT,
        now,
      });
      classes[verdict.class] = (classes[verdict.class] ?? 0) + 1;
      if (verdict.reviewRequired) reviewRequired += 1;
    }

    const buckets = summarizeCeleYouSubscriptionAudit(cards, now);
    const report = {
      version: CELEYOU_SUBSCRIBER_PROTECTION_VERSION,
      auditedAt: now.toISOString(),
      flags,
      legacyTrialPolicy: CELEYOU_LEGACY_TRIAL_POLICY,
      cardBuckets: buckets,
      accountClasses: classes,
      reviewRequiredAccounts: reviewRequired,
      pendingAdvertisingPayments: pendingPayments,
      successAdvertisingPayments: successPayments.length,
      entitlementGrants: grants,
      activeNfcDevices: nfc,
      destructiveUpdates: false,
      note: "Read-only audit. Existing paid terms, prices, QR tokens, and NFC tokens were not modified.",
    };
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
