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
  // Exact admitted headcount — no "you and N additional" phrasing.
  return max === 1 ? "1 guest only" : `${max} guests only`;
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
      // NBSP keeps "Confirming" with its count so narrow columns wrap at spaces only.
      summary: "Confirming\u00A01 seat",
      detail: "This invitation is for you alone.",
      companions: 0,
      remaining: 0,
      confirmed: 1,
    };
  }

  const summary =
    companions === 0
      ? `Confirming\u00A01 of ${max} seats · just you`
      : companions === 1
        ? `Confirming\u00A0${confirmed} of ${max} seats · you + 1 companion`
        : `Confirming\u00A0${confirmed} of ${max} seats · you + ${companions} companions`;

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

/** Guest-facing confirmation after Accept / Decline / Maybe — button labels stay the same. */
export function rsvpGuestFeedback(
  response: "ACCEPTED" | "DECLINED" | "MAYBE",
  attending = 1,
  allowance = 1
): { headline: string; whisper: string; body: string } {
  if (response === "ACCEPTED") {
    return {
      headline: "Accept",
      whisper: "With joy",
      body: rsvpAcceptedThankYou(attending, allowance),
    };
  }
  if (response === "DECLINED") {
    return {
      headline: "Decline",
      whisper: "With regret",
      body: "We've noted you cannot join. The hosts have been told with care for seating and planning.",
    };
  }
  return {
    headline: "Maybe",
    whisper: "Still hoping",
    body: "We've noted you may still join. The hosts will keep your place in hope for seating and planning.",
  };
}
