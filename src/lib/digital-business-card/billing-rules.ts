import {
  isWithinPaidWindow,
  renewalBaseDate,
  type CeleCardLifecycleInput,
} from "@/lib/digital-business-card/lifecycle";
import { ghsToPesewas } from "@/lib/digital-business-card/plans";
import { paystackAmountsMatch } from "@/lib/payments/paystack";

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

/**
 * Provider-verified evidence required before a prepaid CeleYou goes live.
 * Compare integer pesewas and ISO currency. A success page or unsigned
 * webhook must not activate the card.
 */
export function celeYouPaymentEvidenceMatches(input: {
  storedAmountGhs: number;
  storedCurrency: string;
  providerAmountMinor: number;
  providerCurrency: string;
  providerStatus: string;
}): boolean {
  if (input.providerStatus !== "success") return false;
  if (!Number.isFinite(input.storedAmountGhs) || input.storedAmountGhs <= 0) return false;
  const storedCurrency = String(input.storedCurrency || "").trim().toUpperCase();
  const providerCurrency = String(input.providerCurrency || "").trim().toUpperCase();
  if (!storedCurrency || storedCurrency !== providerCurrency) return false;
  return paystackAmountsMatch(ghsToPesewas(input.storedAmountGhs), input.providerAmountMinor);
}

export function refundShouldDeleteIdentity(): boolean {
  return false;
}

/** Prepaid CeleYou terms run to expiry. Owners cannot cancel or end them early. */
export function paidTermCannotBeCancelled(): boolean {
  return true;
}

export const CELEYOU_RENEWAL_WAIT_MESSAGE =
  "This CeleYou is already paid through the current term. You can renew or change plan after it ends.";

export const CELEYOU_TERM_LOCKED_CTA = "Paid through this term";

export const CELEYOU_TERM_LOCKED_HINT =
  "You cannot renew or upgrade until this term ends. Extra cards you save stay on this same subscription, each with a unique QR, link, and NFC.";

export const CELEYOU_TERM_OPEN_HINT =
  "Live activation uses Paystack. A paid term runs until expiry and cannot be cancelled. You cannot renew or upgrade until that term ends. Extra cards share that term.";

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
