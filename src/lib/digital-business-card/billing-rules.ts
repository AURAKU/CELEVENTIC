import { renewalBaseDate, type CeleCardLifecycleInput } from "@/lib/digital-business-card/lifecycle";

/** Paystack checkout here is one-time. Do not invent a recurring mandate. */
export const CELECARD_CHECKOUT_IS_RECURRING_MANDATE = false;

export type CeleCardRenewalKind = "new" | "early" | "late";

export function classifyCeleCardRenewal(card: CeleCardLifecycleInput, now = new Date()): CeleCardRenewalKind {
  if (card.subscriptionStatus === "TRIAL" || !card.lastActivatedAt) return "new";
  const base = renewalBaseDate(card, now);
  if (base.getTime() > now.getTime()) return "early";
  return "late";
}

export function renewalMustNotShorten(currentExpiry: Date | null, nextExpiry: Date, now = new Date()): boolean {
  if (!currentExpiry || currentExpiry.getTime() <= now.getTime()) return true;
  return nextExpiry.getTime() >= currentExpiry.getTime();
}

export function paymentFailureShouldActivate(): boolean {
  return false;
}

export function refundShouldDeleteIdentity(): boolean {
  return false;
}

export function refundPublicPresentation(): "courtesy" {
  return "courtesy";
}

export function upgradeUsesCatalogAmount(chargedPesewas: number, catalogPesewas: number): boolean {
  return chargedPesewas === catalogPesewas;
}
