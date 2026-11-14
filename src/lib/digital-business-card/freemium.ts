/**
 * CeleYou Free, optional 7-day Pro trial, and draft international prices.
 * Paid GHS catalog and Paystack checkout stay in plans.ts / billing-rules.ts.
 * Do not auto-start a trial on register. Do not charge when a trial ends.
 */

import {
  CELEYOU_TIER_CATALOG,
  type CeleYouEntitlementKey,
  type CeleYouTierId,
} from "@/lib/digital-business-card/entitlements";
import {
  hasPaidEntitlementHistory,
  isCeleCardCourtesyState,
  isWithinPaidWindow,
  resolveCeleCardLifecycle,
  type CeleCardLifecycleInput,
} from "@/lib/digital-business-card/lifecycle";
import {
  DEFAULT_CELECARD_CONCIERGE_PRICE_GHS,
  SMARTCARD_PLAN_BY_ID,
  type SmartCardPlanId,
} from "@/lib/digital-business-card/plans";
import {
  formatCeleYouMoney,
  type CeleYouDisplayCurrency,
} from "@/lib/digital-business-card/currencies";

export const CELEYOU_FREE_STATUS = "FREE" as const;
export const CELEYOU_PRO_TRIAL_DAYS = 7;
export const CELEYOU_BUSINESS_TRIAL_DAYS = 14;
export const CELEYOU_PRO_TRIAL_MS = CELEYOU_PRO_TRIAL_DAYS * 24 * 60 * 60 * 1000;

export const CELEYOU_FREE_PLAN_LABEL = "CeleYou Free";
export const CELEYOU_PRO_TRIAL_LABEL = "CeleYou Pro Trial";
export const CELEYOU_TRY_PRO_CTA = "Try CeleYou Pro Free for 7 Days";
export const CELEYOU_IDENTITY_STAYS_COPY = "Your digital identity stays. Premium features grow with you.";
export const CELEYOU_FREE_HOSTING_COPY =
  "A published CeleYou stays publicly reachable on the Free plan. Premium studio tools, extra published cards, and advanced analytics need an active Pro term or trial.";
export const CELEYOU_TRIAL_NO_CARD_COPY =
  "No payment is required to start the trial. Nothing is charged when it ends.";
export const CELEYOU_TRIAL_MUST_PUBLISH_COPY =
  "Publish your CeleYou first, then you can try Pro for 7 days.";

export type CeleYouTrialFamily = "pro" | "business";
export type CeleYouTrialStatus = "ELIGIBLE" | "ACTIVE" | "CONVERTED" | "EXPIRED" | "BLOCKED";

export type CeleYouTrialSnapshot = {
  userId: string;
  family: CeleYouTrialFamily;
  status: CeleYouTrialStatus;
  startedAt: Date | null;
  expiresAt: Date | null;
  convertedAt: Date | null;
  durationDays: number;
};

export type CeleYouAccessTier = "free" | "trial" | "pro";

export const CELEYOU_DRAFT_INTERNATIONAL_PRO: Record<
  Exclude<CeleYouDisplayCurrency, "GHS">,
  Record<SmartCardPlanId, number>
> = {
  USD: { monthly: 5.99, quarter: 15.99, half: 29.99, yearly: 49.99 },
  GBP: { monthly: 4.99, quarter: 12.99, half: 23.99, yearly: 39.99 },
  CNY: { monthly: 39, quarter: 99, half: 189, yearly: 319 },
};

export const CELEYOU_DRAFT_CONCIERGE: Record<CeleYouDisplayCurrency, number> = {
  GHS: DEFAULT_CELECARD_CONCIERGE_PRICE_GHS,
  USD: 99,
  GBP: 79,
  CNY: 699,
};

export function celeYouProPrice(planId: SmartCardPlanId, currency: CeleYouDisplayCurrency): number {
  if (currency === "GHS") return SMARTCARD_PLAN_BY_ID[planId].priceGhs;
  return CELEYOU_DRAFT_INTERNATIONAL_PRO[currency][planId];
}

export function celeYouProPriceLabel(planId: SmartCardPlanId, currency: CeleYouDisplayCurrency): string {
  return formatCeleYouMoney(celeYouProPrice(planId, currency), currency);
}

export function celeYouProDisplay(planId: SmartCardPlanId, currency: CeleYouDisplayCurrency) {
  const plan = SMARTCARD_PLAN_BY_ID[planId];
  const price = celeYouProPrice(planId, currency);
  const monthly = celeYouProPrice("monthly", currency);
  const compared = monthly * plan.months;
  const saveAmount = Math.max(0, Math.round((compared - price) * 100) / 100);
  const savePercent = compared > 0 ? Math.round((saveAmount / compared) * 100) : 0;
  const perMonth = Math.round((price / plan.months) * 100) / 100;
  return {
    price,
    perMonth,
    saveAmount,
    savePercent,
    priceLabel: formatCeleYouMoney(price, currency),
    perMonthLabel: formatCeleYouMoney(perMonth, currency),
    saveLabel: formatCeleYouMoney(saveAmount, currency),
  };
}

export const CELEYOU_FREE_PUBLISH_LIMIT_MESSAGE =
  "CeleYou Free includes one published card. Start a Pro trial or buy a term to publish another.";

export function celeYouProTrialExpiry(from = new Date(), days = CELEYOU_PRO_TRIAL_DAYS): Date {
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
}

export function isCeleYouProTrialActive(
  trial: Pick<CeleYouTrialSnapshot, "status" | "expiresAt"> | null | undefined,
  now = new Date()
): boolean {
  if (!trial || trial.status !== "ACTIVE") return false;
  if (!trial.expiresAt) return false;
  return trial.expiresAt.getTime() > now.getTime();
}

export function celeYouTrialRemainingMs(
  trial: Pick<CeleYouTrialSnapshot, "status" | "expiresAt"> | null | undefined,
  now = new Date()
): number {
  if (!isCeleYouProTrialActive(trial, now) || !trial?.expiresAt) return 0;
  return Math.max(0, trial.expiresAt.getTime() - now.getTime());
}

export function formatCeleYouTrialClock(remainingMs: number): { days: number; hours: number; copy: string } {
  const days = Math.floor(remainingMs / 86_400_000);
  const hours = Math.floor((remainingMs % 86_400_000) / 3_600_000);
  if (remainingMs <= 0) return { days: 0, hours: 0, copy: "Your CeleYou Pro trial has ended." };
  if (days >= 1) {
    return {
      days,
      hours,
      copy: `${days} day${days === 1 ? "" : "s"} remaining.`,
    };
  }
  return {
    days: 0,
    hours: Math.max(1, hours),
    copy: `${Math.max(1, hours)} hour${hours === 1 ? "" : "s"} remaining.`,
  };
}

export type CeleYouTrialEligibility = {
  eligible: boolean;
  reason:
    | "ok"
    | "unpublished"
    | "already_active"
    | "already_used"
    | "converted"
    | "blocked"
    | "paid_term"
    | "paid_history"
    | "feature_off"
    | "legacy_protected"
    | "wrong_family";
  message: string;
};

export function celeYouTrialEligibility(input: {
  published: boolean;
  paidNow: boolean;
  /** Any prior paid activation, complimentary grant, or advertising payment. */
  hasPaidHistory?: boolean;
  /** Feature flag gate for the optional Pro trial. */
  proTrialEnabled?: boolean;
  /** When false, ambiguous or legacy unpaid accounts stay off automatic trial. */
  mayStartProTrial?: boolean;
  family?: CeleYouTrialFamily;
  trial?: Pick<CeleYouTrialSnapshot, "status" | "family" | "expiresAt"> | null;
  now?: Date;
}): CeleYouTrialEligibility {
  const family = input.family ?? "pro";
  if (input.proTrialEnabled === false) {
    return {
      eligible: false,
      reason: "feature_off",
      message: "The CeleYou Pro trial is not open on this environment.",
    };
  }
  if (family !== "pro") {
    return {
      eligible: false,
      reason: "wrong_family",
      message: "The Business trial is not open yet.",
    };
  }
  if (input.paidNow) {
    return {
      eligible: false,
      reason: "paid_term",
      message: "This CeleYou already has an active Pro term.",
    };
  }
  if (input.hasPaidHistory) {
    return {
      eligible: false,
      reason: "paid_history",
      message: "Existing paid CeleYou accounts keep their original terms. A Pro trial is not started for them.",
    };
  }
  if (input.mayStartProTrial === false) {
    return {
      eligible: false,
      reason: "legacy_protected",
      message: "This account is protected until its subscription history is reviewed.",
    };
  }
  if (!input.published) {
    return {
      eligible: false,
      reason: "unpublished",
      message: CELEYOU_TRIAL_MUST_PUBLISH_COPY,
    };
  }
  const trial = input.trial;
  if (!trial) {
    return { eligible: true, reason: "ok", message: CELEYOU_TRY_PRO_CTA };
  }
  if (trial.status === "BLOCKED") {
    return {
      eligible: false,
      reason: "blocked",
      message: "This account cannot start another Pro trial.",
    };
  }
  if (trial.status === "CONVERTED") {
    return {
      eligible: false,
      reason: "converted",
      message: "This account already used a Pro trial and has a paid history.",
    };
  }
  if (trial.status === "EXPIRED") {
    return {
      eligible: false,
      reason: "already_used",
      message: "This account already used its Pro trial.",
    };
  }
  if (isCeleYouProTrialActive(trial, input.now)) {
    return {
      eligible: false,
      reason: "already_active",
      message: "Your CeleYou Pro trial is already running.",
    };
  }
  if (trial.status === "ACTIVE") {
    return {
      eligible: false,
      reason: "already_used",
      message: "This account already used its Pro trial.",
    };
  }
  return { eligible: true, reason: "ok", message: CELEYOU_TRY_PRO_CTA };
}

export type CeleYouTrialReminderSlot = "day1" | "day4" | "day6" | "day7";

/** Hours from activation. Server clock is the source of truth. */
export const CELEYOU_TRIAL_REMINDER_HOURS: Record<CeleYouTrialReminderSlot, number> = {
  day1: 2,
  day4: 4 * 24,
  day6: 6 * 24,
  day7: 7 * 24,
};

export function dueCeleYouTrialReminder(
  trial: Pick<CeleYouTrialSnapshot, "status" | "startedAt" | "expiresAt">,
  sent: Partial<Record<CeleYouTrialReminderSlot, Date | string | null>> | null | undefined,
  now = new Date()
): CeleYouTrialReminderSlot | null {
  if (!trial.startedAt) return null;
  if (trial.status !== "ACTIVE" && trial.status !== "EXPIRED") return null;
  const elapsedH = (now.getTime() - trial.startedAt.getTime()) / 3_600_000;
  const slots: CeleYouTrialReminderSlot[] =
    trial.status === "EXPIRED" ? ["day7"] : ["day1", "day4", "day6", "day7"];
  for (const slot of slots) {
    if (sent?.[slot]) continue;
    if (elapsedH + 0.01 >= CELEYOU_TRIAL_REMINDER_HOURS[slot]) return slot;
  }
  return null;
}

export function celeYouTrialReminderCopy(slot: CeleYouTrialReminderSlot, displayName: string) {
  const billing = "/dashboard/business-card/billing";
  if (slot === "day1") {
    return {
      title: "Welcome to CeleYou Pro",
      body: `Your 7-day Pro trial is on. Open studio to try premium looks, analytics, and extra published cards for ${displayName}. Nothing is charged unless you buy a term. ${billing}`,
    };
  }
  if (slot === "day4") {
    return {
      title: "Three days left on CeleYou Pro",
      body: `About three days remain on the Pro trial for ${displayName}. Premium templates and analytics stay available until the trial ends. ${billing}`,
    };
  }
  if (slot === "day6") {
    return {
      title: "One day left on CeleYou Pro",
      body: `The Pro trial for ${displayName} ends in about a day. Your public card, username, QR, and NFC stay. Premium tools pause unless you start a paid term. ${billing}`,
    };
  }
  return {
    title: "Your CeleYou Pro trial ended",
    body: `${displayName} is on CeleYou Free. The public card, username, QR, and NFC stay. Upgrade any time for premium studio tools. ${billing}`,
  };
}

const FREE_ENTITLEMENTS: Record<CeleYouEntitlementKey, boolean | number> = {
  premiumTemplates: false,
  multipleCards: 1,
  advancedAnalytics: false,
  connectBack: true,
  twoWayExchange: true,
  followUpAutomation: false,
  crmIntegrations: false,
  contactEnrichment: 0,
  teamManagement: false,
};

function catalogEntitlements(id: CeleYouTierId) {
  return CELEYOU_TIER_CATALOG.find((tier) => tier.id === id)?.entitlements;
}

export function celeYouAccessTier(input: {
  card: CeleCardLifecycleInput;
  trial?: Pick<CeleYouTrialSnapshot, "status" | "expiresAt"> | null;
  now?: Date;
}): CeleYouAccessTier {
  const now = input.now ?? new Date();
  if (isWithinPaidWindow(input.card, now)) return "pro";
  if (isCeleYouProTrialActive(input.trial, now)) return "trial";
  if (input.card.subscriptionStatus === "TRIAL" && input.card.subscriptionExpiresAt) {
    if (input.card.subscriptionExpiresAt.getTime() > now.getTime() && !hasPaidEntitlementHistory(input.card)) {
      return "trial";
    }
  }
  return "free";
}

export function celeYouEntitlementsForTier(tier: CeleYouAccessTier): Record<CeleYouEntitlementKey, boolean | number> {
  if (tier === "pro" || tier === "trial") {
    return { ...(catalogEntitlements("pro") ?? FREE_ENTITLEMENTS) };
  }
  return { ...FREE_ENTITLEMENTS };
}

export function hasCeleYouEntitlement(
  entitlements: Record<CeleYouEntitlementKey, boolean | number>,
  key: CeleYouEntitlementKey
): boolean {
  const value = entitlements[key];
  if (typeof value === "number") return value > 0;
  return Boolean(value);
}

export function celeYouPublishedCardLimit(tier: CeleYouAccessTier): number | null {
  if (tier === "pro" || tier === "trial") return null;
  const cap = celeYouEntitlementsForTier("free").multipleCards;
  return typeof cap === "number" ? cap : 1;
}

export function canPublishAnotherCeleYou(input: {
  tier: CeleYouAccessTier;
  publishedCount: number;
}): boolean {
  const cap = celeYouPublishedCardLimit(input.tier);
  if (cap == null) return true;
  return input.publishedCount < cap;
}

export function shouldPreserveLegacyCourtesy(card: CeleCardLifecycleInput, now = new Date()): boolean {
  if (!card.isPublished) return false;
  if (!hasPaidEntitlementHistory(card)) return false;
  if (isWithinPaidWindow(card, now)) return false;
  return Boolean(card.lastCourtesyAt);
}

export function isCeleYouFreePresentation(card: CeleCardLifecycleInput, now = new Date()): boolean {
  if (!card.isPublished) return false;
  if (card.deletedAt || card.adminSuspendedAt || card.adminDeactivatedAt) return false;
  const state = resolveCeleCardLifecycle(card, now);
  if (isCeleCardCourtesyState(state)) return false;
  if (isWithinPaidWindow(card, now)) return false;
  return true;
}

export function emptyCeleYouTrial(userId: string): CeleYouTrialSnapshot {
  return {
    userId,
    family: "pro",
    status: "ELIGIBLE",
    startedAt: null,
    expiresAt: null,
    convertedAt: null,
    durationDays: CELEYOU_PRO_TRIAL_DAYS,
  };
}

/** In-flight studio trials from before optional activation still count as the one Pro trial. */
export function inferLegacyCeleYouTrial(
  userId: string,
  cards: Array<{
    subscriptionStatus: string;
    subscriptionExpiresAt: Date | null;
    lastActivatedAt?: Date | null;
  }>,
  now = new Date()
): CeleYouTrialSnapshot {
  const empty = emptyCeleYouTrial(userId);
  const open = cards.find(
    (card) =>
      card.subscriptionStatus === "TRIAL" &&
      !card.lastActivatedAt &&
      card.subscriptionExpiresAt &&
      card.subscriptionExpiresAt.getTime() > now.getTime()
  );
  if (open?.subscriptionExpiresAt) {
    return {
      ...empty,
      status: "ACTIVE",
      startedAt: new Date(open.subscriptionExpiresAt.getTime() - CELEYOU_PRO_TRIAL_MS),
      expiresAt: open.subscriptionExpiresAt,
    };
  }
  const ended = cards.find(
    (card) =>
      card.subscriptionStatus === "TRIAL" &&
      !card.lastActivatedAt &&
      card.subscriptionExpiresAt &&
      card.subscriptionExpiresAt.getTime() <= now.getTime()
  );
  if (ended) {
    return {
      ...empty,
      status: "EXPIRED",
      startedAt: ended.subscriptionExpiresAt
        ? new Date(ended.subscriptionExpiresAt.getTime() - CELEYOU_PRO_TRIAL_MS)
        : null,
      expiresAt: ended.subscriptionExpiresAt,
    };
  }
  return empty;
}
