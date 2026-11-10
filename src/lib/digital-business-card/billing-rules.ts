import {
  isWithinPaidWindow,
  renewalBaseDate,
  type CeleCardLifecycleInput,
} from "@/lib/digital-business-card/lifecycle";

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

/** Prepaid CeleYou terms run to expiry. Owners cannot cancel or end them early. */
export function paidTermCannotBeCancelled(): boolean {
  return true;
}

export const CELEYOU_RENEWAL_WAIT_MESSAGE =
  "This CeleYou is already paid through the current term. You can renew after it ends.";

/** Owners may start or resume payment only after the paid window ends. Extra cards share that term. */
export function ownerMayRenewSubscription(
  card: CeleCardLifecycleInput | null | undefined,
  now = new Date()
): boolean {
  if (!card) return true;
  if (card.subscriptionStatus === "TRIAL" || !card.lastActivatedAt) return true;
  return !isWithinPaidWindow(card, now);
}

export function refundPublicPresentation(): "courtesy" {
  return "courtesy";
}

export function upgradeUsesCatalogAmount(chargedPesewas: number, catalogPesewas: number): boolean {
  return chargedPesewas === catalogPesewas;
}
