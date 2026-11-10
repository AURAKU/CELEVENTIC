import { prisma } from "@/lib/prisma";
import {
  DEFAULT_CELECARD_CONCIERGE_PRICE_GHS,
  overlaySmartCardPlanPrices,
  type CeleCardPlanPriceMap,
  type SmartCardPlanId,
} from "@/lib/digital-business-card/plans";

export type CeleCardCatalog = {
  planPrices: Record<SmartCardPlanId, number>;
  conciergePriceGhs: number;
  conciergeBundledPlanId: SmartCardPlanId;
  plans: ReturnType<typeof overlaySmartCardPlanPrices>;
};

const DEFAULT_PRICES: Record<SmartCardPlanId, number> = {
  monthly: 49,
  quarter: 129,
  half: 239,
  yearly: 449,
};

function asPriceMap(value: unknown): CeleCardPlanPriceMap {
  if (!value || typeof value !== "object") return {};
  const raw = value as Record<string, unknown>;
  const next: CeleCardPlanPriceMap = {};
  for (const key of ["monthly", "quarter", "half", "yearly"] as const) {
    const n = Number(raw[key]);
    if (Number.isFinite(n) && n >= 1 && n <= 20000) next[key] = Math.round(n);
  }
  return next;
}

export async function getCeleCardCatalog(): Promise<CeleCardCatalog> {
  const row = await prisma.celeCardLifecyclePolicy
    .findUnique({ where: { id: "default" } })
    .catch(() => null);
  const overlay = asPriceMap(row?.planPrices);
  const planPrices = { ...DEFAULT_PRICES, ...overlay };
  const conciergePriceGhs =
    Number(row?.conciergePriceGhs) > 0 ? Number(row?.conciergePriceGhs) : DEFAULT_CELECARD_CONCIERGE_PRICE_GHS;
  const bundled = row?.conciergeBundledPlanId === "monthly" || row?.conciergeBundledPlanId === "quarter" || row?.conciergeBundledPlanId === "half"
    ? row.conciergeBundledPlanId
    : "yearly";
  return {
    planPrices,
    conciergePriceGhs,
    conciergeBundledPlanId: bundled,
    plans: overlaySmartCardPlanPrices(planPrices),
  };
}

export async function upsertCeleCardCatalog(
  input: {
    planPrices?: CeleCardPlanPriceMap;
    conciergePriceGhs?: number;
    conciergeBundledPlanId?: SmartCardPlanId | null;
  },
  updatedByUserId?: string
) {
  const current = await getCeleCardCatalog();
  const planPrices = { ...current.planPrices, ...asPriceMap(input.planPrices) };
  const conciergePriceGhs =
    input.conciergePriceGhs && input.conciergePriceGhs > 0
      ? Math.round(input.conciergePriceGhs)
      : current.conciergePriceGhs;
  const conciergeBundledPlanId = input.conciergeBundledPlanId || current.conciergeBundledPlanId;
  await prisma.celeCardLifecyclePolicy.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      planPrices,
      conciergePriceGhs,
      conciergeBundledPlanId,
      updatedByUserId,
    },
    update: {
      planPrices,
      conciergePriceGhs,
      conciergeBundledPlanId,
      updatedByUserId,
    },
  });
  return getCeleCardCatalog();
}
