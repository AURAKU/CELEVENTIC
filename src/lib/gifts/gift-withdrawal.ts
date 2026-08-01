/**
 * Pure helpers for event-gift withdrawal policy and payout masking.
 * No provider transfer is claimed here — Paystack Transfers are not wired.
 */

export type WithdrawalPayoutMethodId =
  | "MTN_MOMO"
  | "TELECEL_CASH"
  | "AIRTELTIGO_MONEY"
  | "GHANA_BANK";

export const WITHDRAWAL_PAYOUT_METHODS: Array<{
  id: WithdrawalPayoutMethodId;
  label: string;
  networkHint: string | null;
}> = [
  { id: "MTN_MOMO", label: "MTN Mobile Money", networkHint: "mtn" },
  { id: "TELECEL_CASH", label: "Telecel Cash", networkHint: "vod" },
  { id: "AIRTELTIGO_MONEY", label: "AirtelTigo / AT Money", networkHint: "atl" },
  { id: "GHANA_BANK", label: "Ghana bank account", networkHint: null },
];

export function maskPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 6) return "••••";
  return `${digits.slice(0, 3)}****${digits.slice(-4)}`;
}

export function maskBankAccount(raw: string): string {
  const digits = raw.replace(/\s/g, "");
  if (digits.length < 4) return "••••";
  return `••••${digits.slice(-4)}`;
}

export interface SettlementPolicyInput {
  withdrawAfterEventOnly: boolean;
  settlementDelayHours: number;
  minWithdrawalMinor: number;
  maxWithdrawalMinor?: number | null;
  eventStartDate?: Date | string | null;
  eventEndDate?: Date | string | null;
  eventStatus?: string | null;
}

export function withdrawalEligibleAt(policy: SettlementPolicyInput): Date | null {
  if (!policy.withdrawAfterEventOnly) return null;
  const endRaw = policy.eventEndDate ?? policy.eventStartDate;
  if (!endRaw) return new Date(0);
  const end = typeof endRaw === "string" ? new Date(endRaw) : endRaw;
  if (Number.isNaN(end.getTime())) return new Date(0);
  return new Date(end.getTime() + Math.max(0, policy.settlementDelayHours) * 60 * 60 * 1000);
}

export function evaluateWithdrawalPolicy(
  policy: SettlementPolicyInput,
  amountMinor: number,
  availableMinor: number,
  now: Date = new Date()
): { ok: true } | { ok: false; error: string } {
  if (policy.eventStatus === "CANCELLED") {
    return { ok: false, error: "Withdrawals are not available for a cancelled event" };
  }
  if (!Number.isInteger(amountMinor) || amountMinor <= 0) {
    return { ok: false, error: "Withdrawal amount must be a positive integer (minor units)" };
  }
  if (amountMinor < policy.minWithdrawalMinor) {
    return {
      ok: false,
      error: `Minimum withdrawal is ${policy.minWithdrawalMinor} minor units`,
    };
  }
  if (policy.maxWithdrawalMinor != null && amountMinor > policy.maxWithdrawalMinor) {
    return {
      ok: false,
      error: `Maximum single withdrawal is ${policy.maxWithdrawalMinor} minor units`,
    };
  }
  if (amountMinor > availableMinor) {
    return { ok: false, error: "Insufficient available balance for this withdrawal" };
  }

  const eligibleAt = withdrawalEligibleAt(policy);
  if (eligibleAt && now.getTime() < eligibleAt.getTime()) {
    return {
      ok: false,
      error:
        "Available funds become eligible for withdrawal after successful payment verification and the configured settlement period.",
    };
  }

  return { ok: true };
}

/** Statuses that still hold reserved funds. */
export const ACTIVE_RESERVE_STATUSES = [
  "REQUESTED",
  "UNDER_REVIEW",
  "APPROVED",
  "PROCESSING",
] as const;

export function canRequesterSelfApprove(requestedById: string, actorId: string): boolean {
  return requestedById === actorId;
}
