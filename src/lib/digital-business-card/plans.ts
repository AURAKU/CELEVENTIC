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
  perMonthGhs: number;
  saveGhs: number;
  badge?: string;
  blurb: string;
};

export const SMARTCARD_CURRENCY = "GHS";

/** Base monthly rate used to compute savings. */
export const SMARTCARD_MONTHLY_PRICE_GHS = 49;
export const DIGITAL_CARD_MONTHLY_PRICE_GHS = SMARTCARD_MONTHLY_PRICE_GHS;

export const SMARTCARD_PLANS: SmartCardPlan[] = [
  {
    id: "monthly",
    label: "Monthly",
    months: 1,
    priceGhs: 49,
    perMonthGhs: 49,
    saveGhs: 0,
    blurb: "Start live this week. Cancel anytime before renewal.",
  },
  {
    id: "quarter",
    label: "3 months",
    months: 3,
    priceGhs: 129,
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
    perMonthGhs: 40,
    saveGhs: 55,
    blurb: "Half a year of one identity that updates everywhere.",
  },
  {
    id: "yearly",
    label: "Yearly",
    months: 12,
    priceGhs: 449,
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
