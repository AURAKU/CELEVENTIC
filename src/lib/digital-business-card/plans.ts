/**
 * SmartCard subscription plans. The public identity stays live only while paid
 * (or during the short design trial). Amounts are GHS.
 */

export type SmartCardPlanId = "monthly" | "quarter" | "half" | "yearly";

export type SmartCardPlan = {
  id: SmartCardPlanId;
  label: string;
  months: number;
  priceGhs: number;
  /** Integer pesewas. Use this for financial comparisons. */
  pricePesewas: number;
  perMonthGhs: number;
  saveGhs: number;
  badge?: string;
  blurb: string;
};

export const SMARTCARD_CURRENCY = "GHS";

export function ghsToPesewas(ghs: number): number {
  return Math.round(Number(ghs) * 100);
}

export function pesewasMatch(a: number, b: number, tolerancePesewas = 51): boolean {
  return Math.abs(ghsToPesewas(a) - ghsToPesewas(b)) <= tolerancePesewas;
}

/** Base monthly rate used to compute savings. */
export const SMARTCARD_MONTHLY_PRICE_GHS = 49;
export const DIGITAL_CARD_MONTHLY_PRICE_GHS = SMARTCARD_MONTHLY_PRICE_GHS;

export const SMARTCARD_PLANS: SmartCardPlan[] = [
  {
    id: "monthly",
    label: "Monthly",
    months: 1,
    priceGhs: 49,
    pricePesewas: 4900,
    perMonthGhs: 49,
    saveGhs: 0,
    blurb: "Start live this week. Cancel anytime before renewal.",
  },
  {
    id: "quarter",
    label: "3 months",
    months: 3,
    priceGhs: 129,
    pricePesewas: 12900,
    perMonthGhs: 43,
    saveGhs: 18,
    badge: "Popular",
    blurb: "A season of live QR, NFC and Connect Back.",
  },
  {
    id: "half",
    label: "6 months",
    months: 6,
    priceGhs: 239,
    pricePesewas: 23900,
    perMonthGhs: 40,
    saveGhs: 55,
    blurb: "Half a year of one identity that updates everywhere.",
  },
  {
    id: "yearly",
    label: "Yearly",
    months: 12,
    priceGhs: 449,
    pricePesewas: 44900,
    perMonthGhs: 37,
    saveGhs: 139,
    badge: "Best value",
    blurb: "The founder plan. Lowest monthly rate, always on.",
  },
];

export const SMARTCARD_PLAN_BY_ID: Record<SmartCardPlanId, SmartCardPlan> = Object.fromEntries(
  SMARTCARD_PLANS.map((plan) => [plan.id, plan])
) as Record<SmartCardPlanId, SmartCardPlan>;

export function getSmartCardPlan(id: string | null | undefined): SmartCardPlan | null {
  if (!id) return null;
  return SMARTCARD_PLAN_BY_ID[id as SmartCardPlanId] ?? null;
}

export function smartCardExpiryFromNow(months: number, from = new Date()): Date {
  const next = new Date(from);
  next.setMonth(next.getMonth() + months);
  return next;
}

export const SMARTCARD_PAYMENT_KIND = "smartcard-subscription";
export const CELECARD_CONCIERGE_PAYMENT_KIND = "celecard-concierge";
export const DEFAULT_CELECARD_CONCIERGE_PRICE_GHS = 199;

export type CeleCardPlanPriceMap = Partial<Record<SmartCardPlanId, number>>;

export function overlaySmartCardPlanPrices(prices?: CeleCardPlanPriceMap | null): SmartCardPlan[] {
  return SMARTCARD_PLANS.map((plan) => {
    const raw = prices?.[plan.id];
    const priceGhs = typeof raw === "number" && Number.isFinite(raw) && raw > 0 ? Math.round(raw) : plan.priceGhs;
    const pricePesewas = ghsToPesewas(priceGhs);
    const perMonthGhs = Math.round((priceGhs / plan.months) * 100) / 100;
    const saveGhs = Math.max(0, Math.round((SMARTCARD_MONTHLY_PRICE_GHS * plan.months - priceGhs) * 100) / 100);
    return { ...plan, priceGhs, pricePesewas, perMonthGhs, saveGhs };
  });
}

export function getSmartCardPlanFromCatalog(
  id: string | null | undefined,
  plans: SmartCardPlan[] = SMARTCARD_PLANS
): SmartCardPlan | null {
  if (!id) return null;
  return plans.find((plan) => plan.id === id) ?? getSmartCardPlan(id);
}

export function conciergeQuote(input: {
  designFeeGhs?: number;
  includeSubscription?: boolean;
  plan?: SmartCardPlan | null;
}): { designFeeGhs: number; subscriptionFeeGhs: number; totalGhs: number; planId: string | null } {
  const designFeeGhs = input.designFeeGhs && input.designFeeGhs > 0 ? Math.round(input.designFeeGhs) : DEFAULT_CELECARD_CONCIERGE_PRICE_GHS;
  const include = Boolean(input.includeSubscription && input.plan);
  const subscriptionFeeGhs = include ? input.plan!.priceGhs : 0;
  return {
    designFeeGhs,
    subscriptionFeeGhs,
    totalGhs: designFeeGhs + subscriptionFeeGhs,
    planId: include ? input.plan!.id : null,
  };
}
