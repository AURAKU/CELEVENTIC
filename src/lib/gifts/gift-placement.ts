/**
 * Placement rules for where a live gift campaign may appear.
 *
 * Invitation ceremony and Event Companion are separate surfaces:
 * - Invitation uses `showOnInvitation` so organisers can hide the in-invite card
 *   while still sharing a printed QR / companion CTA.
 * - Companion (post-admission TAKE PART) only needs an ACTIVE, open campaign.
 */

export type GiftPlacementSurface = "invitation" | "companion";

export interface GiftCampaignPlacementInput {
  status: string;
  showOnInvitation: boolean;
  closesAt?: Date | string | null;
}

/** True when the campaign is open for guests on the given surface. */
export function isCampaignPlaceable(
  campaign: GiftCampaignPlacementInput,
  surface: GiftPlacementSurface,
  now: Date = new Date()
): boolean {
  if (campaign.status !== "ACTIVE") return false;
  if (surface === "invitation" && !campaign.showOnInvitation) return false;

  if (campaign.closesAt) {
    const closesAt =
      typeof campaign.closesAt === "string"
        ? new Date(campaign.closesAt)
        : campaign.closesAt;
    if (!Number.isNaN(closesAt.getTime()) && closesAt.getTime() <= now.getTime()) {
      return false;
    }
  }

  return true;
}

/**
 * Only allow returning into our own invite/companion routes after checkout.
 * Blocks open redirects via absolute URLs or protocol-relative paths.
 */
export function sanitizeCompanionReturnUrl(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.length > 500) return null;
  if (!trimmed.startsWith("/invite/")) return null;
  if (trimmed.startsWith("//")) return null;
  if (/[\s\\]/.test(trimmed)) return null;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) return null;
  return trimmed;
}

/**
 * Build the guest gift URL for companion, preserving personalisation and a
 * safe return path back to Event Companion after a verified gift.
 */
export function buildCompanionGiftUrl(
  giftUrl: string,
  options: { guestQrToken?: string | null; companionReturnUrl?: string | null } = {}
): string {
  const url = new URL(giftUrl, "https://celeventic.local");
  const guest = options.guestQrToken?.trim();
  if (guest) url.searchParams.set("g", guest);

  const returnUrl = sanitizeCompanionReturnUrl(options.companionReturnUrl);
  if (returnUrl) url.searchParams.set("return", returnUrl);

  return `${url.pathname}${url.search}`;
}

/**
 * Compare pending gift vs Paystack verification before crediting.
 * Amount/currency/reference must all match — never trust the client.
 */
export function detectGiftVerificationMismatch(
  expected: { reference: string; amountMinor: number; currency: string },
  actual: { reference: string; amountMinor: number; currency: string },
  amountsEqual: (a: number, b: number) => boolean = (a, b) => a === b
): string | null {
  if (actual.reference !== expected.reference) {
    return `Reference mismatch: expected ${expected.reference}, provider reported ${actual.reference}`;
  }
  if (actual.currency.toUpperCase() !== expected.currency.toUpperCase()) {
    return `Currency mismatch: expected ${expected.currency}, provider reported ${actual.currency}`;
  }
  if (!amountsEqual(expected.amountMinor, actual.amountMinor)) {
    return `Amount mismatch: expected ${expected.amountMinor}, provider reported ${actual.amountMinor}`;
  }
  return null;
}

/** Guest is only personalised when they belong to the same event as the campaign. */
export function isGuestScopedToCampaignEvent(
  guest: { eventId: string } | null | undefined,
  campaignEventId: string
): boolean {
  return Boolean(guest && guest.eventId === campaignEventId);
}
