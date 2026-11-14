import { DEFAULT_EXCHANGE_RATES } from "@/lib/commerce/constants";

/**
 * Guest-facing checkout methods. Card, mobile money, and bank transfer settle
 * in GHS through Paystack. Alipay and WeChat Pay collect through Stripe when
 * that merchant API is connected. Existing Paystack fulfillment is unchanged.
 */
export const CHECKOUT_METHOD_IDS = [
  "card",
  "mobile_money",
  "bank_transfer",
  "alipay",
  "wechat_pay",
] as const;

export type CheckoutMethodId = (typeof CHECKOUT_METHOD_IDS)[number];

export type CheckoutRail = "PAYSTACK" | "STRIPE";

export interface CheckoutMethod {
  id: CheckoutMethodId;
  label: string;
  description: string;
  rail: CheckoutRail;
  /** Paystack hosted-page channel. Null for wallet rails. */
  paystackChannel: "card" | "mobile_money" | "bank_transfer" | null;
  stripePaymentMethod: "alipay" | "wechat_pay" | null;
}

export const CHECKOUT_METHODS: readonly CheckoutMethod[] = [
  {
    id: "card",
    label: "Card",
    description: "Visa, Mastercard, and other cards through Paystack.",
    rail: "PAYSTACK",
    paystackChannel: "card",
    stripePaymentMethod: null,
  },
  {
    id: "mobile_money",
    label: "Mobile Money",
    description: "MTN MoMo, Telecel Cash, and AT Money through Paystack.",
    rail: "PAYSTACK",
    paystackChannel: "mobile_money",
    stripePaymentMethod: null,
  },
  {
    id: "bank_transfer",
    label: "Bank Transfer",
    description: "Pay into a Paystack virtual account from your bank.",
    rail: "PAYSTACK",
    paystackChannel: "bank_transfer",
    stripePaymentMethod: null,
  },
  {
    id: "alipay",
    label: "Alipay",
    description: "Pay with Alipay when the Stripe merchant API is connected.",
    rail: "STRIPE",
    paystackChannel: null,
    stripePaymentMethod: "alipay",
  },
  {
    id: "wechat_pay",
    label: "WeChat Pay",
    description: "Pay with WeChat Pay when the Stripe merchant API is connected.",
    rail: "STRIPE",
    paystackChannel: null,
    stripePaymentMethod: "wechat_pay",
  },
] as const;

/** Channels sent to Paystack when the guest does not pin a single method. */
export const DEFAULT_PAYSTACK_CHANNELS = ["card", "mobile_money", "bank_transfer"] as const;

export function isCheckoutMethodId(value: unknown): value is CheckoutMethodId {
  return typeof value === "string" && (CHECKOUT_METHOD_IDS as readonly string[]).includes(value);
}

export function getCheckoutMethod(id: CheckoutMethodId): CheckoutMethod {
  const method = CHECKOUT_METHODS.find((item) => item.id === id);
  if (!method) throw new Error(`Unknown checkout method: ${id}`);
  return method;
}

export function paystackChannelsForMethod(id: CheckoutMethodId): string[] | null {
  const channel = getCheckoutMethod(id).paystackChannel;
  return channel ? [channel] : null;
}

export function resolveInitializeChannels(
  methodId: CheckoutMethodId | null | undefined,
  explicit?: string[] | null
): string[] {
  if (methodId) {
    const pinned = paystackChannelsForMethod(methodId);
    if (pinned) return pinned;
  }
  if (explicit?.length) return explicit;
  return [...DEFAULT_PAYSTACK_CHANNELS];
}

/** Stripe Alipay and WeChat Pay collect in CNY. Settlement row stays GHS. */
export function ghsToWalletChargeMinor(ghs: number, currency: "CNY" = "CNY"): number {
  const rate = DEFAULT_EXCHANGE_RATES[currency] ?? 0.53;
  const major = Number(ghs) * rate;
  return Math.max(1, Math.round(major * 100));
}
