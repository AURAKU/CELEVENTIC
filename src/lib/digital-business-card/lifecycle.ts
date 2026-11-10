/**
 * CeleYou commercial entitlement stays on subscriptionStatus.
 * Public presentation uses this derived lifecycle. Do not treat CSS or
 * client flags as the source of truth.
 */

export const CELECARD_LIFECYCLE_STATES = [
  "DRAFT",
  "ACTIVE",
  "EXPIRING",
  "GRACE_PERIOD",
  "COURTESY",
  "SUSPENDED",
  "DELETED",
] as const;

export type CeleCardLifecycleState = (typeof CELECARD_LIFECYCLE_STATES)[number];

export const CELECARD_TIMEZONE = "Africa/Accra";

export type CeleCardLifecyclePolicy = {
  timezone: string;
  gracePeriodDays: number;
  expiringSoonDays: number;
  reminderOffsetsDays: number[];
  reconnectBatchHours: number;
  reconnectPerCardPerHour: number;
  reconnectPerIpPerHour: number;
  designVaultMax: number;
};

export const DEFAULT_CELECARD_LIFECYCLE_POLICY: CeleCardLifecyclePolicy = {
  timezone: CELECARD_TIMEZONE,
  gracePeriodDays: 3,
  expiringSoonDays: 14,
  reminderOffsetsDays: [14, 7, 3, 1, 0, -3, -14, -30],
  reconnectBatchHours: 6,
  reconnectPerCardPerHour: 3,
  reconnectPerIpPerHour: 10,
  designVaultMax: 40,
};

export type CeleCardLifecycleInput = {
  isPublished: boolean;
  subscriptionStatus: string;
  subscriptionExpiresAt: Date | null;
  adminSuspendedAt?: Date | null;
  adminDeactivatedAt?: Date | null;
  deletedAt?: Date | null;
  lastActivatedAt?: Date | null;
};

const DAY_MS = 86_400_000;

export function celeCardPolicyFromRecord(
  record?: Partial<CeleCardLifecyclePolicy> | null
): CeleCardLifecyclePolicy {
  const base = DEFAULT_CELECARD_LIFECYCLE_POLICY;
  if (!record) return base;
  return {
    timezone: record.timezone || base.timezone,
    gracePeriodDays: Number.isFinite(record.gracePeriodDays) ? Number(record.gracePeriodDays) : base.gracePeriodDays,
    expiringSoonDays: Number.isFinite(record.expiringSoonDays)
      ? Number(record.expiringSoonDays)
      : base.expiringSoonDays,
    reminderOffsetsDays: Array.isArray(record.reminderOffsetsDays)
      ? record.reminderOffsetsDays.map(Number).filter((n) => Number.isFinite(n))
      : base.reminderOffsetsDays,
    reconnectBatchHours: Number.isFinite(record.reconnectBatchHours)
      ? Number(record.reconnectBatchHours)
      : base.reconnectBatchHours,
    reconnectPerCardPerHour: Number.isFinite(record.reconnectPerCardPerHour)
      ? Number(record.reconnectPerCardPerHour)
      : base.reconnectPerCardPerHour,
    reconnectPerIpPerHour: Number.isFinite(record.reconnectPerIpPerHour)
      ? Number(record.reconnectPerIpPerHour)
      : base.reconnectPerIpPerHour,
    designVaultMax: Number.isFinite(record.designVaultMax) ? Number(record.designVaultMax) : base.designVaultMax,
  };
}

export function hasPaidEntitlementHistory(card: CeleCardLifecycleInput): boolean {
  if (card.lastActivatedAt) return true;
  return card.subscriptionStatus === "ACTIVE" || card.subscriptionStatus === "EXPIRED";
}

export function paidWindowEnd(card: CeleCardLifecycleInput): Date | null {
  return card.subscriptionExpiresAt;
}

export function graceWindowEnd(
  card: CeleCardLifecycleInput,
  policy: CeleCardLifecyclePolicy = DEFAULT_CELECARD_LIFECYCLE_POLICY
): Date | null {
  const end = paidWindowEnd(card);
  if (!end || !hasPaidEntitlementHistory(card)) return null;
  return new Date(end.getTime() + policy.gracePeriodDays * DAY_MS);
}

export function isWithinPaidWindow(card: CeleCardLifecycleInput, now = new Date()): boolean {
  if (card.subscriptionStatus === "TRIAL" || card.subscriptionStatus === "INACTIVE") return false;
  if (!hasPaidEntitlementHistory(card)) return false;
  if (card.subscriptionStatus === "EXPIRED") return false;
  if (card.subscriptionStatus !== "ACTIVE") return false;
  if (!card.subscriptionExpiresAt) return true;
  return card.subscriptionExpiresAt.getTime() > now.getTime();
}

export function isWithinGracePeriod(
  card: CeleCardLifecycleInput,
  now = new Date(),
  policy: CeleCardLifecyclePolicy = DEFAULT_CELECARD_LIFECYCLE_POLICY
): boolean {
  if (card.deletedAt || card.adminSuspendedAt) return false;
  if (!hasPaidEntitlementHistory(card)) return false;
  if (isWithinPaidWindow(card, now)) return false;
  const graceEnd = graceWindowEnd(card, policy);
  if (!graceEnd) return false;
  return now.getTime() < graceEnd.getTime();
}

export function resolveCeleCardLifecycle(
  card: CeleCardLifecycleInput,
  now = new Date(),
  policy: CeleCardLifecyclePolicy = DEFAULT_CELECARD_LIFECYCLE_POLICY
): CeleCardLifecycleState {
  if (card.deletedAt) return "DELETED";
  if (card.adminSuspendedAt) return "SUSPENDED";
  if (card.adminDeactivatedAt) return "DRAFT";
  if (isWithinPaidWindow(card, now)) {
    if (!card.isPublished) return "DRAFT";
    const end = paidWindowEnd(card);
    if (end) {
      const daysLeft = (end.getTime() - now.getTime()) / DAY_MS;
      if (daysLeft <= policy.expiringSoonDays) return "EXPIRING";
    }
    return "ACTIVE";
  }
  if (isWithinGracePeriod(card, now, policy)) {
    return card.isPublished ? "GRACE_PERIOD" : "DRAFT";
  }
  if (hasPaidEntitlementHistory(card) && card.isPublished) return "COURTESY";
  return "DRAFT";
}

export function isCeleCardFullyPublic(state: CeleCardLifecycleState): boolean {
  return state === "ACTIVE" || state === "EXPIRING" || state === "GRACE_PERIOD";
}

export function isCeleCardCourtesyState(state: CeleCardLifecycleState): boolean {
  return state === "COURTESY";
}

export function celeCardPublicPresentation(
  card: CeleCardLifecycleInput,
  now = new Date(),
  policy: CeleCardLifecyclePolicy = DEFAULT_CELECARD_LIFECYCLE_POLICY
): "live" | "courtesy" | "suspended" | "unavailable" {
  const state = resolveCeleCardLifecycle(card, now, policy);
  if (state === "DELETED") return "unavailable";
  if (state === "SUSPENDED") return "suspended";
  if (card.adminDeactivatedAt) return "unavailable";
  if (isCeleCardFullyPublic(state)) return "live";
  if (isCeleCardCourtesyState(state)) return "courtesy";
  return "unavailable";
}

export function renewalBaseDate(card: CeleCardLifecycleInput, now = new Date()): Date {
  if (isWithinPaidWindow(card, now) && card.subscriptionExpiresAt) {
    return card.subscriptionExpiresAt;
  }
  if (isWithinGracePeriod(card, now) && card.subscriptionExpiresAt) {
    return card.subscriptionExpiresAt;
  }
  return now;
}

export function skipReminderForShortTerm(
  offsetDays: number,
  termDays: number | null
): boolean {
  if (offsetDays <= 0) return false;
  if (termDays == null) return false;
  return termDays < offsetDays + 1;
}

export function dueReminderOffsetDays(
  expiresAt: Date,
  now = new Date(),
  offsets: number[] = DEFAULT_CELECARD_LIFECYCLE_POLICY.reminderOffsetsDays
): number | null {
  const daysLeft = (expiresAt.getTime() - now.getTime()) / DAY_MS;
  const before = offsets.filter((d) => d >= 0).sort((a, b) => a - b);
  const after = offsets.filter((d) => d < 0).sort((a, b) => a - b);
  const maxBefore = before.length ? before[before.length - 1] : 0;
  if (daysLeft > maxBefore) return null;
  if (daysLeft > 0) {
    const hit = before.find((d) => d > 0 && daysLeft <= d);
    return hit ?? 0;
  }
  const hits = after.filter((d) => daysLeft <= d);
  if (!hits.length) return daysLeft <= 0 && before.includes(0) ? 0 : null;
  return Math.min(...hits);
}

export const CELECARD_LIFECYCLE_EVENTS = [
  "CardCreated",
  "CardPreviewed",
  "CheckoutStarted",
  "CheckoutFailed",
  "SubscriptionActivated",
  "SubscriptionRenewed",
  "SubscriptionExpired",
  "CourtesyModeEntered",
  "CourtesyPageViewed",
  "ConnectionRequested",
  "ReactivationStarted",
  "ReactivationCompleted",
  "DesignDuplicated",
  "DesignRestored",
  "DesignPublished",
  "CardSuspended",
  "CardUnsuspended",
  "CardDeactivated",
  "CardReactivated",
  "CardDeleted",
  "EntitlementGranted",
  "CardClaimed",
  "CardUnclaimedCreated",
  "AdminInvitationSent",
] as const;

export type CeleCardLifecycleEventKind = (typeof CELECARD_LIFECYCLE_EVENTS)[number];

export const OWNER_COURTESY_COPY = {
  heading: "Your CeleYou is ready when you are.",
  body: "Your identity, designs, and sharing link are preserved. Reactivate to restore your complete digital profile.",
  primary: "Reactivate CeleYou",
  secondary: "View Saved Designs",
} as const;
