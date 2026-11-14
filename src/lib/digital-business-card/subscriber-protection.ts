/**
 * CeleYou existing-subscriber protection.
 * New Free plan, Pro trial, and international draft prices must never rewrite
 * an active paid term, its price, remaining days, QR/NFC destinations, or payment history.
 * Release-blocking: if compatibility cannot be verified, block the rollout.
 */

import {
  hasPaidEntitlementHistory,
  isWithinPaidWindow,
  type CeleCardLifecycleInput,
} from "@/lib/digital-business-card/lifecycle";

export const CELEYOU_SUBSCRIBER_PROTECTION_VERSION = "2026-11-14";

/** Env feature flags. Missing means the safe default below. */
export type CeleYouSubscriptionFeatureFlags = {
  /** New accounts may start on Free. Never reclassify legacy paid rows. */
  freePlanEnabled: boolean;
  /** Optional 7-day Pro trial for eligible unpublished/new unpaid accounts. */
  proTrialEnabled: boolean;
  /** Draft USD/GBP/CNY catalog display. Checkout stays GHS Paystack until published. */
  internationalPricingEnabled: boolean;
  /**
   * When false (default), Free / trial UX must not auto-apply to accounts that
   * already have paid history or an ambiguous legacy status.
   */
  autoApplyFreeOrTrialToLegacy: boolean;
};

export type CeleYouAccountClass =
  | "existing_active_subscriber"
  | "existing_expired_subscriber"
  | "existing_unpaid_account"
  | "existing_ambiguous_account"
  | "new_free_account"
  | "new_trial_account"
  | "new_paid_subscriber";

export type CeleYouProtectedCardSnapshot = CeleCardLifecycleInput & {
  id?: string;
  publicToken?: string | null;
  slug?: string | null;
  themeId?: string | null;
  entitlementKind?: string | null;
  lastActivationPaymentId?: string | null;
  createdAt?: Date | null;
};

export type CeleYouSubscriberProtectionVerdict = {
  class: CeleYouAccountClass;
  mayStartProTrial: boolean;
  mayReclassifyToFree: boolean;
  preservePaidTerm: boolean;
  reviewRequired: boolean;
  reasons: string[];
};

const TRUTH = new Set(["1", "true", "yes", "on"]);

function readFlag(env: NodeJS.ProcessEnv, name: string, fallback: boolean): boolean {
  const raw = env[name];
  if (raw == null || raw.trim() === "") return fallback;
  return TRUTH.has(raw.trim().toLowerCase());
}

/** Safe defaults: Free + trial for eligible new users; never auto-apply to legacy paid accounts. */
export function resolveCeleYouSubscriptionFeatureFlags(
  env: NodeJS.ProcessEnv = process.env
): CeleYouSubscriptionFeatureFlags {
  return {
    freePlanEnabled: readFlag(env, "CELEYOU_FEATURE_FREE_PLAN", true),
    proTrialEnabled: readFlag(env, "CELEYOU_FEATURE_PRO_TRIAL", true),
    internationalPricingEnabled: readFlag(env, "CELEYOU_FEATURE_INTERNATIONAL_PRICING", false),
    autoApplyFreeOrTrialToLegacy: readFlag(env, "CELEYOU_FEATURE_AUTO_APPLY_FREE_TRIAL_TO_LEGACY", false),
  };
}

export const getCeleYouSubscriptionFeatureFlags = resolveCeleYouSubscriptionFeatureFlags;
export const celeYouSubscriptionFeatureFlags = resolveCeleYouSubscriptionFeatureFlags;

export function cardHasLegacyPaidSignal(card: CeleYouProtectedCardSnapshot): boolean {
  if (hasPaidEntitlementHistory(card)) return true;
  if (card.entitlementKind === "PAID" || card.entitlementKind === "COMPLIMENTARY") return true;
  if (card.lastActivationPaymentId) return true;
  return false;
}

export function accountHasLegacyPaidSignal(
  cards: CeleYouProtectedCardSnapshot[],
  now = new Date()
): boolean {
  return cards.some((card) => cardHasLegacyPaidSignal(card) || isWithinPaidWindow(card, now));
}

/**
 * Classify from verified card rows. Never assume "no new trial row" means Free.
 * Ambiguous legacy TRIAL rows without payment history are flagged for review.
 */
export function classifyCeleYouAccount(input: {
  cards: CeleYouProtectedCardSnapshot[];
  trialStatus?: string | null;
  hasAdvertisingPayment?: boolean;
  freemiumShipAt?: Date;
  now?: Date;
}): CeleYouSubscriberProtectionVerdict {
  const now = input.now ?? new Date();
  const reasons: string[] = [];
  const cards = input.cards.filter((card) => !card.deletedAt);
  const paidLive = cards.filter((card) => isWithinPaidWindow(card, now));
  const paidHistory = cards.filter((card) => cardHasLegacyPaidSignal(card));
  const openLegacyTrial = cards.find(
    (card) =>
      card.subscriptionStatus === "TRIAL" &&
      !card.lastActivatedAt &&
      card.subscriptionExpiresAt &&
      card.subscriptionExpiresAt.getTime() > now.getTime()
  );
  const expiredLegacyTrial = cards.find(
    (card) =>
      card.subscriptionStatus === "TRIAL" &&
      !card.lastActivatedAt &&
      card.subscriptionExpiresAt &&
      card.subscriptionExpiresAt.getTime() <= now.getTime()
  );

  if (paidLive.length) {
    reasons.push("active_paid_window");
    const shipAt = input.freemiumShipAt;
    const activatedAfterShip =
      Boolean(shipAt) &&
      paidLive.every(
        (card) =>
          card.lastActivatedAt &&
          card.lastActivatedAt.getTime() >= shipAt!.getTime()
      );
    return {
      class: activatedAfterShip ? "new_paid_subscriber" : "existing_active_subscriber",
      mayStartProTrial: false,
      mayReclassifyToFree: false,
      preservePaidTerm: true,
      reviewRequired: false,
      reasons: activatedAfterShip ? [...reasons, "activated_after_freemium_ship"] : reasons,
    };
  }

  if (paidHistory.length || input.hasAdvertisingPayment) {
    reasons.push(paidHistory.length ? "paid_entitlement_history" : "advertising_payment_history");
    return {
      class: "existing_expired_subscriber",
      mayStartProTrial: false,
      mayReclassifyToFree: false,
      preservePaidTerm: true,
      reviewRequired: false,
      reasons,
    };
  }

  if (input.trialStatus === "ACTIVE" || openLegacyTrial) {
    reasons.push(input.trialStatus === "ACTIVE" ? "trial_record_active" : "legacy_open_trial");
    return {
      class: "new_trial_account",
      mayStartProTrial: false,
      mayReclassifyToFree: false,
      preservePaidTerm: false,
      reviewRequired: Boolean(openLegacyTrial && !input.trialStatus),
      reasons,
    };
  }

  if (input.trialStatus === "CONVERTED" || input.trialStatus === "EXPIRED" || input.trialStatus === "BLOCKED") {
    reasons.push(`trial_record_${String(input.trialStatus).toLowerCase()}`);
    return {
      class: "existing_unpaid_account",
      mayStartProTrial: false,
      mayReclassifyToFree: true,
      preservePaidTerm: false,
      reviewRequired: false,
      reasons,
    };
  }

  if (expiredLegacyTrial) {
    reasons.push("legacy_expired_trial_without_payment");
    return {
      class: "existing_unpaid_account",
      mayStartProTrial: false,
      mayReclassifyToFree: true,
      preservePaidTerm: false,
      reviewRequired: true,
      reasons,
    };
  }

  const inactiveOnly =
    cards.length > 0 &&
    cards.every((card) => card.subscriptionStatus === "INACTIVE" && !card.lastActivatedAt);
  if (inactiveOnly) {
    reasons.push("inactive_without_paid_signal");
    return {
      class: "existing_ambiguous_account",
      mayStartProTrial: false,
      mayReclassifyToFree: false,
      preservePaidTerm: true,
      reviewRequired: true,
      reasons,
    };
  }

  const freeOnly =
    cards.length > 0 && cards.every((card) => card.subscriptionStatus === "FREE");
  const shipAt = input.freemiumShipAt;
  const allCreatedAfterShip =
    Boolean(shipAt) &&
    cards.length > 0 &&
    cards.every((card) => card.createdAt && card.createdAt.getTime() >= shipAt!.getTime());

  if (freeOnly && allCreatedAfterShip) {
    reasons.push("free_after_freemium_ship");
    return {
      class: "new_free_account",
      mayStartProTrial: true,
      mayReclassifyToFree: true,
      preservePaidTerm: false,
      reviewRequired: false,
      reasons,
    };
  }

  if (freeOnly) {
    reasons.push("free_status_without_paid_signal");
    return {
      class: "existing_unpaid_account",
      mayStartProTrial: true,
      mayReclassifyToFree: true,
      preservePaidTerm: false,
      reviewRequired: !allCreatedAfterShip,
      reasons,
    };
  }

  if (!cards.length) {
    reasons.push("no_cards");
    return {
      class: "new_free_account",
      mayStartProTrial: false,
      mayReclassifyToFree: true,
      preservePaidTerm: false,
      reviewRequired: false,
      reasons,
    };
  }

  reasons.push("ambiguous_legacy_status");
  return {
    class: "existing_ambiguous_account",
    mayStartProTrial: false,
    mayReclassifyToFree: false,
    preservePaidTerm: true,
    reviewRequired: true,
    reasons,
  };
}

/** Fields that must survive Free / trial rollout for any paid or ambiguous card. */
export const CELEYOU_PROTECTED_IDENTITY_FIELDS = [
  "publicToken",
  "slug",
  "themeId",
  "subscriptionStatus",
  "subscriptionExpiresAt",
  "lastActivatedAt",
  "lastActivationPaymentId",
  "entitlementKind",
] as const;

export type CeleYouProtectedIdentityField = (typeof CELEYOU_PROTECTED_IDENTITY_FIELDS)[number];

export function celeYouTrialMutationTouchesPaidCard(
  card: CeleYouProtectedCardSnapshot,
  now = new Date()
): boolean {
  if (isWithinPaidWindow(card, now)) return true;
  if (cardHasLegacyPaidSignal(card)) return true;
  if (card.subscriptionStatus === "ACTIVE" || card.subscriptionStatus === "EXPIRED") return true;
  return false;
}

/**
 * Trial expiry may only demote unpaid optional-trial rows to Free.
 * Never rewrite ACTIVE, EXPIRED, complimentary, or payment-linked cards.
 */
export function celeYouTrialExpiryMayTouchCard(card: CeleYouProtectedCardSnapshot): boolean {
  if (card.lastActivatedAt) return false;
  if (card.lastActivationPaymentId) return false;
  if (card.entitlementKind === "PAID" || card.entitlementKind === "COMPLIMENTARY") return false;
  if (card.subscriptionStatus === "ACTIVE" || card.subscriptionStatus === "EXPIRED") return false;
  if (card.subscriptionStatus !== "TRIAL") return false;
  return true;
}

export function assertCeleYouSubscriberMutationSafe(input: {
  before: CeleYouProtectedCardSnapshot;
  after: Partial<CeleYouProtectedCardSnapshot>;
  now?: Date;
}): { ok: true } | { ok: false; blocked: string[] } {
  const now = input.now ?? new Date();
  const blocked: string[] = [];
  const protect = celeYouTrialMutationTouchesPaidCard(input.before, now) || input.before.subscriptionStatus === "ACTIVE";
  if (!protect) return { ok: true };

  for (const field of CELEYOU_PROTECTED_IDENTITY_FIELDS) {
    if (!(field in input.after)) continue;
    const next = input.after[field];
    const prev = input.before[field];
    if (field === "subscriptionExpiresAt" || field === "lastActivatedAt") {
      const prevMs = prev instanceof Date ? prev.getTime() : prev ? new Date(String(prev)).getTime() : null;
      const nextMs = next instanceof Date ? next.getTime() : next ? new Date(String(next)).getTime() : null;
      if (prevMs !== nextMs) blocked.push(field);
      continue;
    }
    if (next !== prev) blocked.push(field);
  }
  return blocked.length ? { ok: false, blocked } : { ok: true };
}

export type CeleYouSubscriptionAuditBucket =
  | "active"
  | "expired"
  | "trial"
  | "free"
  | "pending_payment"
  | "other";

export function bucketCeleYouSubscriptionRow(
  card: CeleYouProtectedCardSnapshot,
  now = new Date()
): CeleYouSubscriptionAuditBucket {
  if (isWithinPaidWindow(card, now)) return "active";
  if (card.subscriptionStatus === "EXPIRED" || (cardHasLegacyPaidSignal(card) && !isWithinPaidWindow(card, now))) {
    return "expired";
  }
  if (card.subscriptionStatus === "TRIAL") return "trial";
  if (card.subscriptionStatus === "FREE") return "free";
  return "other";
}

export function summarizeCeleYouSubscriptionAudit(
  cards: CeleYouProtectedCardSnapshot[],
  now = new Date()
): Record<CeleYouSubscriptionAuditBucket, number> {
  const summary: Record<CeleYouSubscriptionAuditBucket, number> = {
    active: 0,
    expired: 0,
    trial: 0,
    free: 0,
    pending_payment: 0,
    other: 0,
  };
  for (const card of cards) {
    summary[bucketCeleYouSubscriptionRow(card, now)] += 1;
  }
  return summary;
}

/** Freemium ship cutover used when classifying "new Free" vs legacy unpaid. */
export const CELEYOU_FREEMIUM_SHIP_AT = new Date("2026-11-14T00:00:00.000Z");

export const CELEYOU_LEGACY_TRIAL_POLICY =
  "Older unpaid accounts with a completed legacy studio TRIAL window are not granted a second Pro trial. Accounts with any paid activation, advertising payment, or complimentary entitlement never receive an automatic Pro trial. Ambiguous statuses keep paid access semantics and are flagged for review.";
