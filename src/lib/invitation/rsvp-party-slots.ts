/**
 * RSVP party-slot copy for invitations that admit a plus-one or more.
 * Pure helpers shared by theme RSVP and the generic RSVP panel.
 */

export function clampAttendingCount(attending: number, allowance: number): number {
  const max = Math.max(1, Math.trunc(allowance) || 1);
  const value = Number.isFinite(attending) ? Math.trunc(attending) : 1;
  return Math.max(1, Math.min(max, value));
}

export function rsvpPartyCapacityLine(allowance: number): string {
  const max = Math.max(1, Math.trunc(allowance) || 1);
  if (max === 1) return "This invitation admits only you.";
  const companions = max - 1;
  return companions === 1
    ? "This invitation admits you and 1 companion."
    : `This invitation admits you and ${companions} companions.`;
}

/**
 * Live guidance while the guest picks how many seats to confirm.
 * Remaining = unused invitation slots (not gate remaining after check-in).
 */
export function rsvpPartySlotGuidance(allowance: number, attending: number): {
  summary: string;
  detail: string;
  companions: number;
  remaining: number;
  confirmed: number;
} {
  const max = Math.max(1, Math.trunc(allowance) || 1);
  const confirmed = clampAttendingCount(attending, max);
  const companions = confirmed - 1;
  const remaining = max - confirmed;

  if (max === 1) {
    return {
      summary: "Confirming 1 seat",
      detail: "This invitation is for you alone.",
      companions: 0,
      remaining: 0,
      confirmed: 1,
    };
  }

  const summary =
    companions === 0
      ? `Confirming 1 of ${max} seats · just you`
      : companions === 1
        ? `Confirming ${confirmed} of ${max} seats · you + 1 companion`
        : `Confirming ${confirmed} of ${max} seats · you + ${companions} companions`;

  const detail =
    remaining === 0
      ? "You’re using every seat on this invitation. The hosts will plan for that full party."
      : remaining === 1
        ? "1 seat on this invitation will stay unused unless you raise the count."
        : `${remaining} seats on this invitation will stay unused unless you raise the count.`;

  return { summary, detail, companions, remaining, confirmed };
}

export function rsvpAcceptedThankYou(attending: number, allowance: number): string {
  const max = Math.max(1, Math.trunc(allowance) || 1);
  const confirmed = clampAttendingCount(attending, max);
  if (max === 1 || confirmed === 1) {
    return "Your reply has been received with gratitude. The hosts have been notified for seating and planning.";
  }
  return `You’ve confirmed ${confirmed} of ${max} seats. The hosts now have your exact party size for seating and planning.`;
}
