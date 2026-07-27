/**
 * Central mobile money / payment channel mapping for the Gift Experience.
 *
 * Ghanaian networks rebrand (Vodafone → Telecel, Airtel + Tigo → AirtelTigo)
 * long before payment processors update their channel codes. Every surface —
 * guest picker, initialize route, verification, receipts, dashboard filters —
 * reads from this one table so a rename is a single-line change.
 */

export type GiftPaymentMethodId = "MTN_MOMO" | "TELECEL_CASH" | "AIRTELTIGO_MONEY" | "CARD";

export interface GiftPaymentMethod {
  id: GiftPaymentMethodId;
  /** Guest-facing network name (current brand). */
  label: string;
  shortLabel: string;
  /** Historical names guests may still recognise. */
  aka?: string;
  /** Paystack mobile money provider code. */
  paystackProvider: string | null;
  /** Paystack checkout channel restriction. */
  paystackChannel: "mobile_money" | "card";
  /** Prisma EventGiftChannel value. */
  channel: "MOBILE_MONEY" | "CARD";
  /** Local dialling prefixes used to pre-select the guest's network. */
  prefixes: string[];
  accentClass: string;
  enabled: boolean;
}

export const GIFT_PAYMENT_METHODS: readonly GiftPaymentMethod[] = [
  {
    id: "MTN_MOMO",
    label: "MTN Mobile Money",
    shortLabel: "MTN MoMo",
    paystackProvider: "mtn",
    paystackChannel: "mobile_money",
    channel: "MOBILE_MONEY",
    prefixes: ["024", "054", "055", "059", "025", "053"],
    accentClass: "gift-network-mtn",
    enabled: true,
  },
  {
    id: "TELECEL_CASH",
    label: "Telecel Cash",
    shortLabel: "Telecel",
    aka: "Vodafone Cash",
    // Paystack still transmits Telecel under the legacy Vodafone code.
    paystackProvider: "vod",
    paystackChannel: "mobile_money",
    channel: "MOBILE_MONEY",
    prefixes: ["020", "050"],
    accentClass: "gift-network-telecel",
    enabled: true,
  },
  {
    id: "AIRTELTIGO_MONEY",
    label: "AirtelTigo Money",
    shortLabel: "AirtelTigo",
    paystackProvider: "atl",
    paystackChannel: "mobile_money",
    channel: "MOBILE_MONEY",
    prefixes: ["026", "056", "027", "057"],
    accentClass: "gift-network-airteltigo",
    enabled: true,
  },
  {
    id: "CARD",
    label: "Debit or Credit Card",
    shortLabel: "Card",
    paystackProvider: null,
    paystackChannel: "card",
    channel: "CARD",
    prefixes: [],
    accentClass: "gift-network-card",
    enabled: true,
  },
] as const;

export const GIFT_PAYMENT_METHOD_IDS = GIFT_PAYMENT_METHODS.map((m) => m.id);

export function isGiftPaymentMethodId(value: unknown): value is GiftPaymentMethodId {
  return typeof value === "string" && GIFT_PAYMENT_METHOD_IDS.includes(value as GiftPaymentMethodId);
}

export function getGiftPaymentMethod(id: GiftPaymentMethodId): GiftPaymentMethod {
  const method = GIFT_PAYMENT_METHODS.find((m) => m.id === id);
  if (!method) throw new Error(`Unknown gift payment method: ${id}`);
  return method;
}

/** Guest-visible list, omitting anything switched off centrally. */
export function listEnabledGiftPaymentMethods(): GiftPaymentMethod[] {
  return GIFT_PAYMENT_METHODS.filter((m) => m.enabled);
}

/** Normalise a Ghanaian mobile number to local 0XXXXXXXXX form. */
export function normaliseGhanaMsisdn(raw: string): string | null {
  const digits = raw.replace(/[^\d+]/g, "");
  const stripped = digits.startsWith("+") ? digits.slice(1) : digits;

  if (/^0\d{9}$/.test(stripped)) return stripped;
  if (/^233\d{9}$/.test(stripped)) return `0${stripped.slice(3)}`;
  if (/^\d{9}$/.test(stripped)) return `0${stripped}`;
  return null;
}

/** Best-effort network detection so the picker can pre-select the right tile. */
export function detectMethodFromPhone(raw: string): GiftPaymentMethodId | null {
  const local = normaliseGhanaMsisdn(raw);
  if (!local) return null;
  const prefix = local.slice(0, 3);
  const match = GIFT_PAYMENT_METHODS.find((m) => m.prefixes.includes(prefix));
  return match?.id ?? null;
}

/** Channel restriction passed to Paystack so the guest lands on the right tab. */
export function paystackChannelsFor(id: GiftPaymentMethodId): string[] {
  return [getGiftPaymentMethod(id).paystackChannel];
}
