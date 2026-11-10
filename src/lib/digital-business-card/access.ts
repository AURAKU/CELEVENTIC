/**
 * CeleYou access policy.
 *
 * Shared Celeventic authentication. No second user database.
 * Product records stay on DigitalBusinessCard / SmartCard* tables, not Event rows.
 *
 * Anonymous guests may open a published guest-shareable card and use Save, Connect, Share,
 * public contacts, socials, portfolios, booking links, payment links, and payment QRs.
 * Creating, publishing, customizing, or owning a card requires a signed-in account.
 */

import { isDigitalCardLive, toPublicPayload } from "@/services/digital-business-card/digital-business-card.service";
import { buildGuestReach } from "@/lib/digital-business-card/privacy";
import type { DigitalCardPublicPayload } from "@/lib/digital-business-card/types";
import { smartCardStudioPath } from "@/lib/auth/safe-next-path";
import {
  DEFAULT_CELECARD_LIFECYCLE_POLICY,
  celeCardPublicPresentation,
  isCeleCardGuestShareable,
  resolveCeleCardLifecycle,
  type CeleCardLifecycleInput,
  type CeleCardLifecyclePolicy,
} from "@/lib/digital-business-card/lifecycle";
import { courtesyGuestPayload, unavailableGuestPayload } from "@/lib/digital-business-card/courtesy";

export const CELECARD_PRODUCT_INTENT = "celecard";

export const CELECARD_PUBLIC_ACTIONS = ["view", "save", "connect", "share", "pay"] as const;
export type CeleCardPublicAction = (typeof CELECARD_PUBLIC_ACTIONS)[number];

/** Owner JSON and Prisma rows may include these. Guest payloads must never. */
export const CELECARD_OWNER_ONLY_FIELDS = [
  "userId",
  "subscriptionStatus",
  "subscriptionExpiresAt",
  "viewCount",
  "offlineSnapshotVersion",
  "claimSecretHash",
  "passwordHash",
  "adminSuspendedAt",
  "adminDeactivatedAt",
  "entitlementKind",
  "unclaimedEmail",
  "unclaimedPhone",
  "claimedAt",
  "deletedAt",
  "lastActivatedAt",
  "lastActivationPaymentId",
  "publishedDesignVersionId",
  "lastCourtesyAt",
] as const;

type LiveGateCard = CeleCardLifecycleInput;

export type GuestSourceCard = Parameters<typeof toPublicPayload>[0];

export function isCeleCardProductIntent(value?: string | null): boolean {
  if (!value) return false;
  const key = value.trim().toLowerCase();
  return (
    key === "celecard" ||
    key === "smartcard" ||
    key === "card" ||
    key === "identity" ||
    key === "digital-card" ||
    key === "digitalcard"
  );
}

export function celeCardOwnerStudioPath(plan?: string | null, theme?: string | null) {
  return smartCardStudioPath(plan, theme);
}

function livePolicy(policy?: CeleCardLifecyclePolicy) {
  return policy ?? DEFAULT_CELECARD_LIFECYCLE_POLICY;
}

export function isCeleCardPubliclyReachable(
  card: LiveGateCard,
  policy?: CeleCardLifecyclePolicy,
  now = new Date()
): boolean {
  return isCeleCardGuestShareable(card, now, livePolicy(policy));
}

export function celeCardOwnerShareFlags(card: LiveGateCard, policy?: CeleCardLifecyclePolicy, now = new Date()) {
  const resolved = livePolicy(policy);
  return {
    isLive: isDigitalCardLive(card, now, resolved),
    guestShareable: isCeleCardGuestShareable(card, now, resolved),
    lifecycleState: resolveCeleCardLifecycle(card, now, resolved),
  };
}

export function guestMayUsePublicAction(
  card: LiveGateCard & { connectBackEnabled?: boolean },
  action: CeleCardPublicAction,
  policy?: CeleCardLifecyclePolicy
): boolean {
  if (!isCeleCardPubliclyReachable(card, livePolicy(policy))) return false;
  if (action === "connect") return card.connectBackEnabled !== false;
  return true;
}

export function ownerMayManageCard(ownerUserId: string, cardUserId: string): boolean {
  return Boolean(ownerUserId) && ownerUserId === cardUserId;
}

export function withheldGuestPayload(slug: string, themeId?: string): DigitalCardPublicPayload {
  return unavailableGuestPayload(slug, themeId, "unavailable");
}

export function isCeleCardCourtesyReachable(
  card: LiveGateCard,
  policy?: CeleCardLifecyclePolicy,
  now = new Date()
): boolean {
  return celeCardPublicPresentation(card, now, livePolicy(policy)) === "courtesy";
}

/** Guest-safe payload. Contact and socials exist only while the identity is guest-shareable. */
export function toGuestPublicPayload(
  card: GuestSourceCard,
  grantedItemKeys: Iterable<string> = [],
  policy?: CeleCardLifecyclePolicy
): DigitalCardPublicPayload {
  const resolved = livePolicy(policy);
  const presentation = celeCardPublicPresentation(card, new Date(), resolved);
  if (presentation === "live") {
    const payload = toPublicPayload(card, resolved);
    const guest = buildGuestReach(card, grantedItemKeys);
    return {
      ...payload,
      email: guest.email,
      phone: guest.phone,
      website: guest.website,
      socials: guest.socials,
      guestReach: guest.guestReach,
      isLive: true,
      presentationMode: "live",
    };
  }
  if (presentation === "courtesy") {
    return courtesyGuestPayload({
      slug: card.slug,
      themeId: card.themeId,
      displayName: card.displayName,
      title: card.title,
      company: card.company,
      avatarUrl: card.avatarUrl,
    });
  }
  if (presentation === "suspended") {
    return unavailableGuestPayload(card.slug, card.themeId, "suspended");
  }
  return withheldGuestPayload(card.slug, card.themeId);
}

export function publicPayloadExposesOwnerSecrets(payload: object): boolean {
  return CELECARD_OWNER_ONLY_FIELDS.some((field) => field in payload);
}

export function guestPayloadExposesProfile(payload: DigitalCardPublicPayload): boolean {
  const socialKeys = Object.keys(payload.socials || {}).filter(
    (key) => key !== "stackOrder" && key !== "dockOrder"
  );
  return Boolean(
    payload.email ||
      payload.phone ||
      payload.website ||
      payload.bio ||
      payload.avatarUrl ||
      payload.publicToken ||
      payload.displayName ||
      socialKeys.length
  );
}
