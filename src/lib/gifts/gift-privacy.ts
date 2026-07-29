/**
 * Privacy boundary for the Gift Experience.
 *
 * A guest may see exactly one thing: their own gift. They must never learn who
 * else gave, how much anyone gave, how many gifts exist, or what the event has
 * received in total. Rather than trusting each route to remember that, every
 * public payload is built by one of the serialisers below, and
 * `assertNoPrivateGiftData` is the tripwire that keeps a future edit honest.
 */

export interface PublicGiftCampaignView {
  publicToken: string;
  giftType: string;
  status: "ACTIVE" | "CLOSED";
  currency: string;
  title: string;
  subtitle: string;
  description: string;
  ctaLabel: string;
  amountPrompt: string;
  messagePrompt: string;
  privacyNote: string;
  coverImageUrl: string | null;
  suggestedAmountsMinor: number[];
  minAmountMinor: number;
  maxAmountMinor: number | null;
  allowCustomAmount: boolean;
  allowGuestMessage: boolean;
  requireGuestName: boolean;
  requireGuestContact: boolean;
  allowAnonymous: boolean;
  closedReason: string | null;
  event: {
    title: string;
    hostName: string;
    startDate: string | null;
    eventType: string;
  };
  /** Prefilled identity when the guest arrived via a personalised gift QR. */
  guest: { name: string } | null;
}

export interface PublicGiftPaymentView {
  reference: string;
  status: string;
  /** UI-facing state so the client never has to interpret provider statuses. */
  state: "pending" | "processing" | "success" | "failed";
  amountMinor: number;
  currency: string;
  giftType: string;
  createdAt: string;
  paidAt: string | null;
  method: string | null;
  guestName: string | null;
  isAnonymous: boolean;
  receiptUrl: string | null;
  /** Safe relative path back to Event Companion after a verified gift. */
  companionReturnUrl: string | null;
  failureReason: string | null;
}

/** Keys that must never appear in a guest-facing gift payload. */
const FORBIDDEN_PUBLIC_KEYS = [
  "totalminor",
  "total",
  "totalamount",
  "balanceminor",
  "balance",
  "availableminor",
  "lifetimegiftminor",
  "giftcount",
  "contributors",
  "contributorlist",
  "donors",
  "leaderboard",
  "recentgifts",
  "othergifts",
  "guestemail",
  "guestphone",
  "iphash",
  "useragent",
  "organisernote",
  "organizernote",
  "ledgerentries",
  "payments",
  "goalminor",
  "targetminor",
  "progress",
  "percentraised",
  "providerreference",
  "authorizationurl",
  "webhook",
  "secret",
  "apikey",
];

/**
 * Deep-scans a payload about to be returned on a public route and throws if it
 * leaks aggregate or third-party data. Cheap enough to run on every request and
 * it turns a privacy regression into a loud 500 instead of a silent breach.
 */
export function assertNoPrivateGiftData(payload: unknown, path = "payload"): void {
  if (payload === null || payload === undefined) return;

  if (Array.isArray(payload)) {
    payload.forEach((item, index) => assertNoPrivateGiftData(item, `${path}[${index}]`));
    return;
  }

  if (typeof payload !== "object") return;

  for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
    if (FORBIDDEN_PUBLIC_KEYS.includes(key.toLowerCase())) {
      throw new Error(`Gift privacy violation: "${path}.${key}" must not be exposed publicly`);
    }
    assertNoPrivateGiftData(value, `${path}.${key}`);
  }
}

export type GiftPaymentUiState = PublicGiftPaymentView["state"];

export function giftPaymentUiState(status: string): GiftPaymentUiState {
  switch (status) {
    case "SUCCESS":
      return "success";
    case "PROCESSING":
      return "processing";
    case "FAILED":
    case "ABANDONED":
    case "REVERSED":
    case "REFUNDED":
    case "DISPUTED":
      return "failed";
    default:
      return "pending";
  }
}

/**
 * Only a server-confirmed SUCCESS may render as success. A provider callback,
 * a redirect, or an optimistic client state must never reach this value.
 */
export function isConfirmedGiftSuccess(status: string): boolean {
  return status === "SUCCESS";
}

/** Mask a guest name for organiser exports when the gift was anonymous. */
export function displayGiftGuestName(
  name: string | null | undefined,
  isAnonymous: boolean,
  fallback = "Anonymous guest"
): string {
  if (isAnonymous) return fallback;
  const trimmed = name?.trim();
  return trimmed ? trimmed : fallback;
}
