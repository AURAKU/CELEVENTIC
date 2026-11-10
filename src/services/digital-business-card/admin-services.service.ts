import { prisma } from "@/lib/prisma";
import { DEFAULT_PRODUCTION_URL, getCeleYouShareOrigin, isLocalHost } from "@/lib/app-url";
import { isProviderEnabled } from "@/lib/integrations/integration-runtime";
import { DIGITAL_CARD_THEMES } from "@/lib/digital-business-card/themes";
import {
  CELEYOU_ADMIN_SERVICES,
  type CeleYouAdminServiceStatus,
} from "@/lib/digital-business-card/admin-services-catalog";
import { getCeleCardLifecyclePolicy } from "@/services/digital-business-card/lifecycle-policy.service";
import { getCeleCardCatalog } from "@/services/digital-business-card/catalog.service";
import { getCeleCardCommandOverview } from "@/services/digital-business-card/admin-command.service";

export type CeleYouAdminQueueRow = {
  id: string;
  displayName: string;
  slug: string;
  email: string | null;
  status: string;
  expiresAt: string | null;
};

function queueRow(card: {
  id: string;
  displayName: string;
  slug: string;
  email: string | null;
  subscriptionStatus: string;
  subscriptionExpiresAt: Date | null;
  user?: { email: string | null } | null;
}): CeleYouAdminQueueRow {
  return {
    id: card.id,
    displayName: card.displayName,
    slug: card.slug,
    email: card.email || card.user?.email || null,
    status: card.subscriptionStatus,
    expiresAt: card.subscriptionExpiresAt?.toISOString() ?? null,
  };
}

export async function getCeleYouAdminServicesSnapshot() {
  const now = new Date();
  const shareOrigin = getCeleYouShareOrigin();
  const policy = await getCeleCardLifecyclePolicy();
  const [
    overview,
    catalog,
    paystackReady,
    nfcDevices,
    cardsTotal,
    distinctNfcCards,
    recentPayments,
    expiring,
    unclaimed,
    suspended,
  ] = await Promise.all([
    getCeleCardCommandOverview(),
    getCeleCardCatalog(),
    isProviderEnabled("PAYSTACK"),
    prisma.smartCardNfcDevice.count({ where: { status: { in: ["ACTIVE", "DISABLED", "LOST"] } } }),
    prisma.digitalBusinessCard.count({ where: { deletedAt: null } }),
    prisma.smartCardNfcDevice.groupBy({
      by: ["cardId"],
      where: { status: { in: ["ACTIVE", "DISABLED", "LOST"] } },
    }).then((rows) => rows.length),
    prisma.payment.count({
      where: { purpose: "ADVERTISING", createdAt: { gte: new Date(now.getTime() - 7 * 86_400_000) } },
    }),
    prisma.digitalBusinessCard.findMany({
      where: {
        deletedAt: null,
        subscriptionStatus: "ACTIVE",
        subscriptionExpiresAt: { gt: now, lte: new Date(now.getTime() + policy.expiringSoonDays * 86_400_000) },
      },
      orderBy: { subscriptionExpiresAt: "asc" },
      take: 8,
      select: {
        id: true,
        displayName: true,
        slug: true,
        email: true,
        subscriptionStatus: true,
        subscriptionExpiresAt: true,
        user: { select: { email: true } },
      },
    }),
    prisma.digitalBusinessCard.findMany({
      where: { deletedAt: null, claimedAt: null, unclaimedEmail: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        displayName: true,
        slug: true,
        email: true,
        subscriptionStatus: true,
        subscriptionExpiresAt: true,
        user: { select: { email: true } },
      },
    }),
    prisma.digitalBusinessCard.findMany({
      where: { deletedAt: null, adminSuspendedAt: { not: null } },
      orderBy: { adminSuspendedAt: "desc" },
      take: 8,
      select: {
        id: true,
        displayName: true,
        slug: true,
        email: true,
        subscriptionStatus: true,
        subscriptionExpiresAt: true,
        user: { select: { email: true } },
      },
    }),
  ]);

  const shareOriginIsLive = !isLocalHost(shareOrigin);
  const paystackPublicReady = Boolean(
    process.env.PAYSTACK_PUBLIC_KEY || process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY
  );
  const nfcCoverage = cardsTotal === 0 ? 1 : distinctNfcCards / cardsTotal;
  const health = {
    paystackReady,
    paystackPublicReady,
    shareOrigin,
    shareOriginIsLive,
    expectedLiveOrigin: DEFAULT_PRODUCTION_URL,
    themeCount: DIGITAL_CARD_THEMES.length,
    nfcDevices,
    nfcCardsCovered: distinctNfcCards,
    cardsTotal,
    nfcCoverage,
    paymentsLast7Days: recentPayments,
    planCount: catalog.plans.length,
  };

  const statusFor = (id: (typeof CELEYOU_ADMIN_SERVICES)[number]["id"]): CeleYouAdminServiceStatus => {
    if (id === "paid-activation") {
      if (!paystackReady) return "blocked";
      if (!paystackPublicReady) return "attention";
      return "ready";
    }
    if (id === "smart-qr" || id === "unique-share") {
      return shareOriginIsLive ? "ready" : "attention";
    }
    if (id === "nfc-tap") {
      if (cardsTotal === 0) return "ready";
      return nfcCoverage >= 0.98 ? "ready" : "attention";
    }
    if (id === "lifecycle") return policy.gracePeriodDays >= 0 ? "ready" : "attention";
    if (id === "templates") return DIGITAL_CARD_THEMES.length >= 30 ? "ready" : "attention";
    if (id === "concierge") return (overview.conciergeOpen ?? 0) > 8 ? "attention" : "ready";
    if (id === "connections") return overview.pendingConnectionRequests > 20 ? "attention" : "ready";
    return "ready";
  };

  return {
    health,
    overview,
    policy,
    plans: catalog.plans,
    services: CELEYOU_ADMIN_SERVICES.map((service) => ({
      ...service,
      status: statusFor(service.id),
    })),
    queues: {
      expiring: expiring.map(queueRow),
      unclaimed: unclaimed.map(queueRow),
      suspended: suspended.map(queueRow),
    },
  };
}
