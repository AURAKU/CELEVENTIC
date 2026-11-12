import { DIGITAL_CARD_TRIAL_DAYS } from "@/lib/digital-business-card/types";

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const YEAR = 365 * DAY;

export type SubscriptionCountdownKind = "renewal" | "expiry" | "ended";

export type CountdownParts = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

export type SubscriptionCountdown = {
  kind: SubscriptionCountdownKind;
  remainingMs: number;
  startsAt: Date | null;
  endsAt: Date;
  paidThrough: string;
  activatedOn: string | null;
  /** Professional term line with activation and expiry dates. */
  termCopy: string;
  clock: string;
  label: string;
  parts: CountdownParts;
  urgent: boolean;
  /** 1 is a full paid window still ahead. 0 is ended. */
  remainingRatio: number;
};

export function parseSubscriptionEnd(value: Date | string | number | null | undefined): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === "string" && value.trim()) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

export function formatPaidThrough(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function resolveTermStart(
  endsAt: Date,
  activatedAt?: Date | string | number | null
): Date | null {
  const start = parseSubscriptionEnd(activatedAt);
  if (!start) return null;
  if (start.getTime() >= endsAt.getTime()) return null;
  return start;
}

export function formatTermDatesCopy(
  endsAt: Date,
  startsAt: Date | null,
  kind: SubscriptionCountdownKind
): string {
  const expiry = formatPaidThrough(endsAt);
  const expiryVerb = kind === "ended" ? "Expired" : "Expires";
  if (!startsAt) return `${expiryVerb} ${expiry}.`;
  return `Activated ${formatPaidThrough(startsAt)}. ${expiryVerb} ${expiry}.`;
}

export function countdownTickMs(remainingMs: number): number {
  if (remainingMs <= 0) return MINUTE;
  return SECOND;
}

/** Align the next paint to the wall-clock second so digits flip on the beat. */
export function countdownFlowDelayMs(nowMs: number = Date.now()): number {
  return Math.max(32, SECOND - (nowMs % SECOND));
}

export function countdownParts(ms: number): CountdownParts {
  const abs = Math.max(0, Math.abs(ms));
  return {
    days: Math.floor(abs / DAY),
    hours: Math.floor((abs % DAY) / HOUR),
    minutes: Math.floor((abs % HOUR) / MINUTE),
    seconds: Math.floor((abs % MINUTE) / SECOND),
  };
}

export function formatCountdownClock(ms: number): string {
  const abs = Math.max(0, Math.abs(ms));
  const days = Math.floor(abs / DAY);
  const hours = Math.floor((abs % DAY) / HOUR);
  const minutes = Math.floor((abs % HOUR) / MINUTE);
  const seconds = Math.floor((abs % MINUTE) / SECOND);
  if (days >= 1) {
    const dayPart = `${days} day${days === 1 ? "" : "s"}`;
    const hourPart = hours < 1 ? "" : ` ${hours} hour${hours === 1 ? "" : "s"}`;
    const minutePart = minutes < 1 ? "" : ` ${minutes} minute${minutes === 1 ? "" : "s"}`;
    return `${dayPart}${hourPart}${minutePart}`;
  }
  if (hours >= 1) {
    return `${hours} hour${hours === 1 ? "" : "s"} ${minutes} minute${minutes === 1 ? "" : "s"}`;
  }
  if (minutes >= 1) {
    return `${minutes} minute${minutes === 1 ? "" : "s"} ${seconds} second${seconds === 1 ? "" : "s"}`;
  }
  return `${seconds} second${seconds === 1 ? "" : "s"}`;
}

export function subscriptionCountdown(
  expiresAt: Date | string | number | null | undefined,
  status?: string | null,
  now: Date | number = Date.now(),
  activatedAt?: Date | string | number | null
): SubscriptionCountdown | null {
  const endsAt = parseSubscriptionEnd(expiresAt);
  if (!endsAt) return null;
  const nowMs = typeof now === "number" ? now : now.getTime();
  const remainingMs = endsAt.getTime() - nowMs;
  const clock = formatCountdownClock(remainingMs);
  const ended = remainingMs <= 0;
  const trial = (status ?? "").toUpperCase() === "TRIAL";
  const kind: SubscriptionCountdownKind = ended ? "ended" : trial ? "expiry" : "renewal";
  const label = ended
    ? `Ended ${clock} ago`
    : trial
      ? `Studio ends in ${clock}`
      : `Renews in ${clock}`;
  const startsAt = resolveTermStart(endsAt, activatedAt);
  const windowMs = startsAt
    ? Math.max(1, endsAt.getTime() - startsAt.getTime())
    : trial
      ? DIGITAL_CARD_TRIAL_DAYS * DAY
      : YEAR;
  const remainingRatio = ended ? 0 : Math.min(1, Math.max(0, remainingMs / windowMs));
  return {
    kind,
    remainingMs,
    startsAt,
    endsAt,
    paidThrough: formatPaidThrough(endsAt),
    activatedOn: startsAt ? formatPaidThrough(startsAt) : null,
    termCopy: formatTermDatesCopy(endsAt, startsAt, kind),
    clock,
    label,
    parts: countdownParts(remainingMs),
    urgent: remainingMs > 0 && remainingMs <= 3 * DAY,
    remainingRatio,
  };
}
