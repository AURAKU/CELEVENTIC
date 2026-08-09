/**
 * Placement rules for where a live gift campaign may appear to guests.
 *
 * Guest CTAs are limited to:
 * - Event Guide (public guide page) — uses `showOnInvitation` column
 *   (legacy name; digital invitation never shows gift CTAs anymore)
 * - Event Companion (post-admission TAKE PART) — uses `showOnCompanion`
 *
 * Direct `/gift/{token}` checkout still works when the feature is on, so a
 * printed QR can land guests in Paystack without a CTA on the invitation.
 */

export type GiftPlacementSurface = "invitation" | "event-guide" | "companion";

export interface GiftCampaignPlacementInput {
  status: string;
  /**
   * Legacy column name. When true, the gift CTA may render on Event Guide.
   * Digital invitation pages never use this for placement anymore.
   */
  showOnInvitation: boolean;
  /** Defaults true for legacy campaigns that pre-date the column. */
  showOnCompanion?: boolean;
  opensAt?: Date | string | null;
  closesAt?: Date | string | null;
}

function asDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const date = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(date.getTime()) ? null : date;
}

/** True when the campaign is open for guests on the given surface. */
export function isCampaignPlaceable(
  campaign: GiftCampaignPlacementInput,
  surface: GiftPlacementSurface,
  now: Date = new Date()
): boolean {
  if (campaign.status !== "ACTIVE") return false;
  // Digital invitation: never place a guest gift CTA here.
  if (surface === "invitation") return false;
  if (surface === "event-guide" && !campaign.showOnInvitation) return false;
  if (surface === "companion" && campaign.showOnCompanion === false) return false;

  const opensAt = asDate(campaign.opensAt);
  if (opensAt && opensAt.getTime() > now.getTime()) return false;

  const closesAt = asDate(campaign.closesAt);
  if (closesAt && closesAt.getTime() <= now.getTime()) return false;

  return true;
}

/**
 * Only allow returning into our own invite/companion/guide routes after checkout.
 * Blocks open redirects via absolute URLs or protocol-relative paths.
 */
export function sanitizeCompanionReturnUrl(raw: string | null | undefined): string | null {
  return sanitizeGiftReturnUrl(raw);
}

/** Safe relative return path after a verified gift (invite, companion, or Event Guide). */
export function sanitizeGiftReturnUrl(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.length > 500) return null;
  if (!trimmed.startsWith("/invite/") && !trimmed.startsWith("/event-guide/")) return null;
  if (trimmed.startsWith("//")) return null;
  if (/[\s\\]/.test(trimmed)) return null;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) return null;
  return trimmed;
}

/**
 * Build the guest gift URL, preserving personalisation and a safe return path
 * after a verified gift (companion or Event Guide).
 */
export function buildCompanionGiftUrl(
  giftUrl: string,
  options: { guestQrToken?: string | null; companionReturnUrl?: string | null } = {}
): string {
  const url = new URL(giftUrl, "https://celeventic.local");
  const guest = options.guestQrToken?.trim();
  if (guest) url.searchParams.set("g", guest);

  const returnUrl = sanitizeGiftReturnUrl(options.companionReturnUrl);
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
