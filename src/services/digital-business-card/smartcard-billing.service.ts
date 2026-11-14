import { prisma } from "@/lib/prisma";
import { SMARTCARD_PAYMENT_KIND, getSmartCardPlan } from "@/lib/digital-business-card/plans";
import { ownerMayRenewSubscription } from "@/lib/digital-business-card/billing-rules";
import { pickAccountPaidEntitlement, resolveCeleCardLifecycle } from "@/lib/digital-business-card/lifecycle";
import { isDigitalCardLive } from "@/services/digital-business-card/digital-business-card.service";
import { getCeleCardLifecyclePolicy } from "@/services/digital-business-card/lifecycle-policy.service";
import { parsePaginationInput } from "@/lib/pagination";

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

export function isCeleYouAdvertisingMeta(
  metadata: unknown,
  cardId?: string,
  planId?: string
): metadata is Record<string, unknown> {
  const meta = asRecord(metadata);
  if (!meta || meta.kind !== SMARTCARD_PAYMENT_KIND) return false;
  if (cardId && meta.cardId !== cardId) return false;
  if (planId && meta.planId !== planId) return false;
  return true;
}

export function serializeCeleYouPayment(payment: {
  id: string;
  reference: string;
  status: string;
  amount: unknown;
  currency: string;
  createdAt: Date;
  metadata: unknown;
}) {
  const meta = asRecord(payment.metadata);
  const planId = typeof meta?.planId === "string" ? meta.planId : null;
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
    cardId: typeof meta?.cardId === "string" ? meta.cardId : null,
    idempotent: Boolean(meta?.kind === SMARTCARD_PAYMENT_KIND),
  };
}

export async function findOpenCeleYouCheckout(userId: string, cardId: string, planId: string) {
  const rows = await prisma.payment.findMany({
    where: { userId, purpose: "ADVERTISING", status: "PENDING" },
    orderBy: { createdAt: "desc" },
    take: 25,
  });
  const found = rows.find((row) => isCeleYouAdvertisingMeta(row.metadata, cardId, planId)) ?? null;
  if (!found) return null;
  if (found.idempotencyKey) return found;
  return prisma.payment.update({
    where: { id: found.id },
    data: { idempotencyKey: `smartcard-open-${found.id}` },
  });
}

export async function listCeleYouPaymentsForCard(input: {
  cardId: string;
  userId: string;
  page?: number | string | null;
  limit?: number | string | null;
}) {
  const { page, limit, skip } = parsePaginationInput(
    { page: input.page, limit: input.limit },
    { limit: 20 }
  );
  const rows = await prisma.payment.findMany({
    where: { userId: input.userId, purpose: "ADVERTISING" },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const history = rows
    .filter((row) => isCeleYouAdvertisingMeta(row.metadata, input.cardId))
    .map(serializeCeleYouPayment);
  return {
    items: history.slice(skip, skip + limit),
    total: history.length,
    page,
    limit,
  };
}

export async function getSmartCardBilling(
  userId: string,
  paging?: { page?: number | string | null; limit?: number | string | null }
) {
  const { page, limit, skip } = parsePaginationInput(paging, { limit: 20 });
  const [cards, payments] = await Promise.all([
    prisma.digitalBusinessCard.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.payment.findMany({
      where: { userId, purpose: "ADVERTISING" },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);

  const history = payments
    .filter((payment) => isCeleYouAdvertisingMeta(payment.metadata))
    .map(serializeCeleYouPayment);

  const policy = await getCeleCardLifecyclePolicy();
  const now = new Date();
  const retained = cards.filter((card) => !card.deletedAt);
  const canRenew = ownerMayRenewSubscription(pickAccountPaidEntitlement(retained, now, policy), now);
  return {
    cards: retained.map((card) => ({
      id: card.id,
      slug: card.slug,
      displayName: card.displayName,
      themeId: card.themeId,
      subscriptionStatus: card.subscriptionStatus,
      subscriptionExpiresAt: card.subscriptionExpiresAt?.toISOString() ?? null,
      isLive: isDigitalCardLive(card, now, policy),
      lifecycleState: resolveCeleCardLifecycle(card, now, policy),
      canRenew,
      hoursLeft: card.subscriptionExpiresAt
        ? (card.subscriptionExpiresAt.getTime() - Date.now()) / 3_600_000
        : null,
    })),
    payments: history.slice(skip, skip + limit),
    paymentTotal: history.length,
    paymentPage: page,
    paymentLimit: limit,
  };
}
