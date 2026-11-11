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
import type { DigitalCardPresentationMode, DigitalCardPublicPayload } from "@/lib/digital-business-card/types";
import { smartCardStudioPath } from "@/lib/auth/safe-next-path";
import {
  DEFAULT_CELECARD_LIFECYCLE_POLICY,
  celeCardPublicPresentation,
  isCeleCardGuestShareable,
  resolveCeleCardLifecycle,
  type CeleCardLifecycleInput,
  type CeleCardLifecyclePolicy,
  type CeleCardLifecycleState,
} from "@/lib/digital-business-card/lifecycle";
import { nfcTapOutcome, type NfcTapOutcome } from "@/lib/digital-business-card/nfc-device";
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

export type CeleYouShareChannel = "profile" | "qr" | "nfc" | "tap" | "vcard";

export type CeleYouShareBlockReason =
  | "ok"
  | "missing"
  | "deleted"
  | "suspended"
  | "unpublished"
  | "inactive"
  | "nfc_paused"
  | "nfc_lost"
  | "nfc_replaced"
  | "nfc_unknown"
  | "tap_off";

export type CeleYouPublicShareDecision = {
  found: boolean;
  guestShareable: boolean;
  presentation: DigitalCardPresentationMode | "missing";
  lifecycleState: CeleCardLifecycleState | null;
  nfcOutcome: NfcTapOutcome | null;
  recordOpen: boolean;
  redirectToProfile: boolean;
  channelAllowed: boolean;
  reason: CeleYouShareBlockReason;
};

type PublicShareCard = LiveGateCard & {
  nfcEnabled?: boolean;
  proximityDiscoverable?: boolean | null;
};

export function celeYouShareGuestMessage(reason: CeleYouShareBlockReason): string {
  if (reason === "tap_off") return "Tap-to-Connect is turned off on this CeleYou.";
  if (reason === "missing" || reason === "deleted") return "This CeleYou is no longer available.";
  return "This CeleYou cannot be shared right now.";
}

/**
 * Single eligibility decision for QR, NFC, public profile, vCard, and Tap-to-Connect.
 * Paystack configuration is never consulted. A published trial stays shareable.
 */
export function resolveCeleYouPublicShare(input: {
  card?: PublicShareCard | null;
  channel: CeleYouShareChannel;
  nfc?: { deviceStatus?: string | null };
  now?: Date;
  policy?: CeleCardLifecyclePolicy;
}): CeleYouPublicShareDecision {
  const now = input.now ?? new Date();
  const policy = livePolicy(input.policy);
  const card = input.card;
  if (!card) {
    return {
      found: false,
      guestShareable: false,
      presentation: "missing",
      lifecycleState: null,
      nfcOutcome: input.channel === "nfc" ? "unknown" : null,
      recordOpen: false,
      redirectToProfile: false,
      channelAllowed: false,
      reason: "missing",
    };
  }

  const guestShareable = isCeleCardGuestShareable(card, now, policy);
  const presentation = celeCardPublicPresentation(card, now, policy);
  const lifecycleState = resolveCeleCardLifecycle(card, now, policy);
  let reason: CeleYouShareBlockReason = "ok";
  if (card.deletedAt) reason = "deleted";
  else if (card.adminSuspendedAt) reason = "suspended";
  else if (!card.isPublished) reason = "unpublished";
  else if (!guestShareable) reason = "inactive";

  if (input.channel === "nfc") {
    const nfcOutcome = nfcTapOutcome({
      deviceStatus: input.nfc?.deviceStatus,
      nfcEnabled: card.nfcEnabled !== false,
      guestShareable,
    });
    const nfcReason: CeleYouShareBlockReason =
      nfcOutcome === "paused"
        ? "nfc_paused"
        : nfcOutcome === "lost"
          ? "nfc_lost"
          : nfcOutcome === "replaced"
            ? "nfc_replaced"
            : nfcOutcome === "unknown"
              ? "nfc_unknown"
              : reason;
    return {
      found: !card.deletedAt,
      guestShareable,
      presentation: card.deletedAt ? "unavailable" : presentation,
      lifecycleState,
      nfcOutcome,
      recordOpen: nfcOutcome === "open",
      redirectToProfile: nfcOutcome === "open" || nfcOutcome === "profile",
      channelAllowed: nfcOutcome === "open" || nfcOutcome === "profile",
      reason: nfcOutcome === "open" ? "ok" : nfcReason,
    };
  }

  if (input.channel === "tap") {
    const tapOff = card.proximityDiscoverable === false;
    return {
      found: true,
      guestShareable,
      presentation,
      lifecycleState,
      nfcOutcome: null,
      recordOpen: false,
      redirectToProfile: false,
      channelAllowed: !tapOff && guestShareable,
      reason: tapOff ? "tap_off" : guestShareable ? "ok" : reason,
    };
  }

  if (input.channel === "vcard") {
    return {
      found: true,
      guestShareable,
      presentation,
      lifecycleState,
      nfcOutcome: null,
      recordOpen: guestShareable,
      redirectToProfile: false,
      channelAllowed: guestShareable,
      reason: guestShareable ? "ok" : reason,
    };
  }

  if (input.channel === "qr") {
    return {
      found: !card.deletedAt,
      guestShareable,
      presentation: card.deletedAt ? "unavailable" : presentation,
      lifecycleState,
      nfcOutcome: null,
      recordOpen: guestShareable,
      redirectToProfile: !card.deletedAt,
      channelAllowed: !card.deletedAt,
      reason: guestShareable ? "ok" : reason,
    };
  }

  return {
    found: !card.deletedAt,
    guestShareable,
    presentation: card.deletedAt ? "unavailable" : presentation,
    lifecycleState,
    nfcOutcome: null,
    recordOpen: guestShareable,
    redirectToProfile: false,
    channelAllowed: !card.deletedAt,
    reason: guestShareable ? "ok" : reason,
  };
}

export function isCeleCardPubliclyReachable(
  card: LiveGateCard,
  policy?: CeleCardLifecyclePolicy,
  now = new Date()
): boolean {
  return resolveCeleYouPublicShare({ card, channel: "profile", policy, now }).guestShareable;
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
  const share = resolveCeleYouPublicShare({ card, channel: "profile", policy });
  const presentation = share.presentation;
  if (presentation === "live") {
    const payload = toPublicPayload(card, livePolicy(policy));
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
