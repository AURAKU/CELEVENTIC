import { prisma } from "@/lib/prisma";
import { SMARTCARD_PAYMENT_KIND, getSmartCardPlan } from "@/lib/digital-business-card/plans";
import { isDigitalCardLive } from "@/services/digital-business-card/digital-business-card.service";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asAmount(value: unknown): number {
  if (typeof value === "number") return value;
  if (value && typeof value === "object" && "toNumber" in value) {
    return (value as { toNumber: () => number }).toNumber();
  }
  return Number(value ?? 0);
}

export async function getSmartCardBilling(userId: string) {
  const [cards, payments] = await Promise.all([
    prisma.digitalBusinessCard.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.payment.findMany({
      where: { userId, purpose: "ADVERTISING" },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
  ]);

  const history = payments
    .map((payment) => {
      const meta = asRecord(payment.metadata);
      if (meta?.kind !== SMARTCARD_PAYMENT_KIND) return null;
      const planId = typeof meta.planId === "string" ? meta.planId : null;
      const plan = getSmartCardPlan(planId);
      return {
        id: payment.id,
        reference: payment.reference,
        status: payment.status,
        amount: asAmount(payment.amount),
        currency: payment.currency,
        createdAt: payment.createdAt.toISOString(),
        planId,
        planLabel: plan?.label ?? planId,
        cardId: typeof meta.cardId === "string" ? meta.cardId : null,
      };
    })
    .filter(Boolean);

  return {
    cards: cards.map((card) => ({
      id: card.id,
      slug: card.slug,
      displayName: card.displayName,
      themeId: card.themeId,
      subscriptionStatus: card.subscriptionStatus,
      subscriptionExpiresAt: card.subscriptionExpiresAt?.toISOString() ?? null,
      isLive: isDigitalCardLive(card),
      hoursLeft: card.subscriptionExpiresAt
        ? (card.subscriptionExpiresAt.getTime() - Date.now()) / 3_600_000
        : null,
    })),
    payments: history,
  };
}
