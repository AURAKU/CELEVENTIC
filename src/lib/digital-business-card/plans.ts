/**
 * CeleYou Pro prepaid catalog and concierge quote math.
 * Amounts are Ghana cedis. Checkout never trusts a browser-submitted price.
 *
 * Effective-date policy: Super Admin publishes a catalog. New purchases and
 * renewals charge that catalog. In-flight Paystack charges and completed
 * payments keep the amount stored on the payment row. Existing paid terms keep
 * their remaining duration. Settled transactions are never rewritten.
 */

export type SmartCardPlanId = "monthly" | "quarter" | "half" | "yearly";

export type SmartCardPlan = {
  id: SmartCardPlanId;
  family: "CeleYou Pro";
  label: string;
  durationLabel: string;
  months: number;
  priceGhs: number;
  /** Integer pesewas. Use this for financial comparisons. */
  pricePesewas: number;
  perMonthGhs: number;
  saveGhs: number;
  savePercent: number;
  badge?: string;
  blurb: string;
};

export const SMARTCARD_CURRENCY = "GHS";
export const CELEYOU_PRO_FAMILY = "CeleYou Pro" as const;

export function ghsToPesewas(ghs: number): number {
  return Math.round(Number(ghs) * 100);
}

export function pesewasMatch(a: number, b: number, tolerancePesewas = 51): boolean {
  return Math.abs(ghsToPesewas(a) - ghsToPesewas(b)) <= tolerancePesewas;
}

/** Base monthly rate used when an overlay does not yet set monthly. */
export const SMARTCARD_MONTHLY_PRICE_GHS = 49;
export const DIGITAL_CARD_MONTHLY_PRICE_GHS = SMARTCARD_MONTHLY_PRICE_GHS;

type PlanSpec = {
  id: SmartCardPlanId;
  label: string;
  durationLabel: string;
  months: number;
  priceGhs: number;
  badge?: string;
  blurb: string;
};

const PLAN_SPECS: PlanSpec[] = [
  {
    id: "monthly",
    label: "Monthly",
    durationLabel: "1 month",
    months: 1,
    priceGhs: 49,
    blurb: "Start live this week. Renew when this term ends.",
  },
  {
    id: "quarter",
    label: "Quarterly",
    durationLabel: "3 months",
    months: 3,
    priceGhs: 129,
    badge: "Popular",
    blurb: "A season of live QR, NFC, and Connect Back.",
  },
  {
    id: "half",
    label: "Half-Yearly",
    durationLabel: "6 months",
    months: 6,
    priceGhs: 239,
    blurb: "Half a year of one identity that updates everywhere.",
  },
  {
    id: "yearly",
    label: "Yearly",
    durationLabel: "12 months",
    months: 12,
    priceGhs: 399,
    blurb: "Lowest monthly rate for a full year of hosted CeleYou.",
  },
];

export function planSavingsVsMonthly(priceGhs: number, months: number, monthlyGhs: number) {
  const compared = monthlyGhs * months;
  const saveGhs = Math.max(0, Math.round((compared - priceGhs) * 100) / 100);
  const savePercent = compared > 0 ? Math.round((saveGhs / compared) * 100) : 0;
  return { saveGhs, savePercent };
}

export type CeleCardPlanPriceMap = Partial<Record<SmartCardPlanId, number>>;

export function overlaySmartCardPlanPrices(prices?: CeleCardPlanPriceMap | null): SmartCardPlan[] {
  const monthlyRaw = prices?.monthly;
  const monthlyGhs =
    typeof monthlyRaw === "number" && Number.isFinite(monthlyRaw) && monthlyRaw > 0
      ? Math.round(monthlyRaw)
      : SMARTCARD_MONTHLY_PRICE_GHS;
  return PLAN_SPECS.map((spec) => {
    const raw = prices?.[spec.id];
    const priceGhs =
      typeof raw === "number" && Number.isFinite(raw) && raw > 0 ? Math.round(raw) : spec.priceGhs;
    const pricePesewas = ghsToPesewas(priceGhs);
    const perMonthGhs = Math.round((priceGhs / spec.months) * 100) / 100;
    const { saveGhs, savePercent } = planSavingsVsMonthly(priceGhs, spec.months, monthlyGhs);
    const yearlyBadge =
      spec.id === "yearly" && savePercent > 0 ? `Best Value — Save about ${savePercent}%` : spec.badge;
    return {
      id: spec.id,
      family: CELEYOU_PRO_FAMILY,
      label: spec.label,
      durationLabel: spec.durationLabel,
      months: spec.months,
      priceGhs,
      pricePesewas,
      perMonthGhs,
      saveGhs,
      savePercent,
      badge: yearlyBadge,
      blurb: spec.blurb,
    };
  });
}

export const SMARTCARD_PLANS: SmartCardPlan[] = overlaySmartCardPlanPrices();

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
export const DEFAULT_CELECARD_CONCIERGE_PRICE_GHS = 800;

export const CELECARD_CONCIERGE_HEADLINE = "Professional Concierge Design";
export const CELECARD_CONCIERGE_SOLD_SEPARATELY = "Subscription sold separately.";
export const CELECARD_CONCIERGE_EXPLANATION =
  "One-time design and setup fee. Your approved design remains saved to your account. An active CeleYou subscription is required for premium hosting and subscription-dependent features.";

export const CELECARD_CATALOG_EFFECTIVE_DATE_POLICY =
  "New catalog prices apply to new purchases and renewals after Super Admin publishes them. In-flight Paystack charges and completed payments keep the amount recorded on the payment. Existing paid terms keep their remaining duration. Settled transactions are never rewritten.";

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
  const designFeeGhs =
    input.designFeeGhs && input.designFeeGhs > 0
      ? Math.round(input.designFeeGhs)
      : DEFAULT_CELECARD_CONCIERGE_PRICE_GHS;
  const include = Boolean(input.includeSubscription && input.plan);
  const subscriptionFeeGhs = include ? input.plan!.priceGhs : 0;
  return {
    designFeeGhs,
    subscriptionFeeGhs,
    totalGhs: designFeeGhs + subscriptionFeeGhs,
    planId: include ? input.plan!.id : null,
  };
}

export function defaultCatalogPlanPrices(): Record<SmartCardPlanId, number> {
  return {
    monthly: SMARTCARD_PLAN_BY_ID.monthly.priceGhs,
    quarter: SMARTCARD_PLAN_BY_ID.quarter.priceGhs,
    half: SMARTCARD_PLAN_BY_ID.half.priceGhs,
    yearly: SMARTCARD_PLAN_BY_ID.yearly.priceGhs,
  };
}
