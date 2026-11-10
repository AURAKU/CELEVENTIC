import { prisma } from "@/lib/prisma";
import {
  DEFAULT_CELECARD_LIFECYCLE_POLICY,
  celeCardPolicyFromRecord,
  resolveCeleCardLifecycle,
  type CeleCardLifecyclePolicy,
} from "@/lib/digital-business-card/lifecycle";
import { SMARTCARD_PLANS } from "@/lib/digital-business-card/plans";
import { recordCeleCardLifecycleEvent } from "./digital-business-card.service";

let policyCache: { value: CeleCardLifecyclePolicy; at: number } | null = null;
const POLICY_CACHE_MS = 15_000;

export function invalidateCeleCardLifecyclePolicyCache() {
  policyCache = null;
}

export async function getCeleCardLifecyclePolicy(): Promise<CeleCardLifecyclePolicy> {
  if (policyCache && Date.now() - policyCache.at < POLICY_CACHE_MS) return policyCache.value;
  const row = await prisma.celeCardLifecyclePolicy.findUnique({ where: { id: "default" } }).catch(() => null);
  if (!row) {
    policyCache = { value: DEFAULT_CELECARD_LIFECYCLE_POLICY, at: Date.now() };
    return policyCache.value;
  }
  const offsets = Array.isArray(row.reminderOffsetsDays)
    ? (row.reminderOffsetsDays as number[])
    : DEFAULT_CELECARD_LIFECYCLE_POLICY.reminderOffsetsDays;
  const value = celeCardPolicyFromRecord({
    timezone: row.timezone,
    gracePeriodDays: row.gracePeriodDays,
    expiringSoonDays: row.expiringSoonDays,
    reminderOffsetsDays: offsets,
    reconnectBatchHours: row.reconnectBatchHours,
    reconnectPerCardPerHour: row.reconnectPerCardPerHour,
    reconnectPerIpPerHour: row.reconnectPerIpPerHour,
    designVaultMax: row.designVaultMax,
  });
  policyCache = { value, at: Date.now() };
  return value;
}

export async function upsertCeleCardLifecyclePolicy(
  input: Partial<CeleCardLifecyclePolicy>,
  updatedByUserId?: string
) {
  const current = await getCeleCardLifecyclePolicy();
  const next = celeCardPolicyFromRecord({ ...current, ...input });
  invalidateCeleCardLifecyclePolicyCache();
  return prisma.celeCardLifecyclePolicy.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      gracePeriodDays: next.gracePeriodDays,
      expiringSoonDays: next.expiringSoonDays,
      reminderOffsetsDays: next.reminderOffsetsDays,
      timezone: next.timezone,
      reconnectBatchHours: next.reconnectBatchHours,
      reconnectPerCardPerHour: next.reconnectPerCardPerHour,
      reconnectPerIpPerHour: next.reconnectPerIpPerHour,
      designVaultMax: next.designVaultMax,
      updatedByUserId,
    },
    update: {
      gracePeriodDays: next.gracePeriodDays,
      expiringSoonDays: next.expiringSoonDays,
      reminderOffsetsDays: next.reminderOffsetsDays,
      timezone: next.timezone,
      reconnectBatchHours: next.reconnectBatchHours,
      reconnectPerCardPerHour: next.reconnectPerCardPerHour,
      reconnectPerIpPerHour: next.reconnectPerIpPerHour,
      designVaultMax: next.designVaultMax,
      updatedByUserId,
    },
  });
}

export async function getCeleCardAdminOverview() {
  const policy = await getCeleCardLifecyclePolicy();
  const cards = await prisma.digitalBusinessCard.findMany({
    select: {
      id: true,
      isPublished: true,
      subscriptionStatus: true,
      subscriptionExpiresAt: true,
      adminSuspendedAt: true,
      deletedAt: true,
      lastActivatedAt: true,
    },
    take: 2000,
  });
  const counts: Record<string, number> = {
    DRAFT: 0,
    ACTIVE: 0,
    EXPIRING: 0,
    GRACE_PERIOD: 0,
    COURTESY: 0,
    SUSPENDED: 0,
    DELETED: 0,
  };
  for (const card of cards) {
    const state = resolveCeleCardLifecycle(card, new Date(), policy);
    counts[state] = (counts[state] ?? 0) + 1;
  }
  const reconnects = await prisma.smartCardConnection.count({
    where: { source: "courtesy_reconnect" },
  });
  return {
    totals: counts,
    registeredOwners: new Set(cards.map((c) => c.id)).size,
    cardCount: cards.length,
    courtesyReconnects: reconnects,
    plans: SMARTCARD_PLANS.map((plan) => ({
      id: plan.id,
      label: plan.label,
      months: plan.months,
      priceGhs: plan.priceGhs,
      pricePesewas: plan.pricePesewas,
      currency: "GHS",
    })),
    prepaidNote: "CeleYou plans are prepaid terms, not contractual monthly recurring revenue.",
  };
}

export async function setCardAdminSuspension(cardId: string, suspend: boolean) {
  const card = await prisma.digitalBusinessCard.findUnique({ where: { id: cardId } });
  if (!card) return null;
  const updated = await prisma.digitalBusinessCard.update({
    where: { id: cardId },
    data: { adminSuspendedAt: suspend ? new Date() : null },
  });
  await recordCeleCardLifecycleEvent({
    cardId,
    kind: "CardSuspended",
    meta: { suspend },
  });
  return updated;
}
