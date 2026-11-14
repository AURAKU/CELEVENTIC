/**
 * Precise CeleYou product metrics. Each event has one counting rule.
 * Retention uses weekly cohorts, not lifetime registration totals.
 */

export const CELEYOU_PRODUCT_EVENTS = {
  registration_completed: {
    id: "registration_completed",
    once: "user",
    counts: "A CeleYou-intent account is created.",
    not: "Later logins, password resets, or onboarding page views.",
  },
  card_setup_completed: {
    id: "card_setup_completed",
    once: "card",
    counts: "A card has a display name and at least one reach field or published design.",
    not: "Empty drafts or dummy walkthrough cards.",
  },
  card_published: {
    id: "card_published",
    once: "card_per_publish",
    counts: "isPublished flips to true for a live, non-demo card.",
    not: "Studio preview, courtesy pages, or repeated saves of an already published card.",
  },
  first_successful_share: {
    id: "first_successful_share",
    once: "card",
    counts: "The owner completes a share or copy of the live profile URL for the first time.",
    not: "Guest share taps, crawler hits, or opening the share desk.",
  },
  connect_back_submitted: {
    id: "connect_back_submitted",
    once: "connection",
    counts: "A Connect Back, exchange, or meeting request row is created.",
    not: "Duplicate courtesy reconnects inside the 6 hour window.",
  },
  returning_active_cardholder: {
    id: "returning_active_cardholder",
    once: "user_per_week",
    counts: "An owner who published a card earlier returns and opens studio, share, or billing in a later ISO week.",
    not: "The registration week itself, and not guest profile views.",
  },
  subscription_renewed: {
    id: "subscription_renewed",
    once: "term",
    counts: "Paystack fulfillment extends an existing live term.",
    not: "Checkout created, client success pages, or first activation.",
  },
  referral_converted: {
    id: "referral_converted",
    once: "user",
    counts: "A new account arrived with from={username} and later published a card.",
    not: "Link clicks, or the inviter viewing their own invite URL.",
  },
  onboarding_started: {
    id: "onboarding_started",
    once: "user",
    counts: "The owner opens the first-card wizard after a CeleYou-intent signup.",
    not: "Studio visits by published cardholders, or guest profile views.",
  },
  onboarding_abandoned: {
    id: "onboarding_abandoned",
    once: "user_until_complete",
    counts: "The owner leaves the first-card wizard before publish. Only the step id is stored.",
    not: "Field values, emails, phones, IPs, or crawler hits.",
  },
  onboarding_completed: {
    id: "onboarding_completed",
    once: "user",
    counts: "The first unpublished CeleYou for that account is published.",
    not: "Later studio saves of an already published card.",
  },
  free_card_published: {
    id: "free_card_published",
    once: "card",
    counts: "A card is published while the owner is on CeleYou Free.",
    not: "Paid activations, trial activations, or republish saves.",
  },
  trial_activated: {
    id: "trial_activated",
    once: "user",
    counts: "The owner starts the optional 7-day Pro trial after publishing.",
    not: "Registration, card create, or a second click during an active trial.",
  },
  trial_completed: {
    id: "trial_completed",
    once: "user",
    counts: "A Pro trial reaches its stored UTC expiry without a paid conversion.",
    not: "Browser countdown ticks or unpaid checkout attempts.",
  },
  trial_converted: {
    id: "trial_converted",
    once: "user",
    counts: "Paystack fulfillment turns an active Pro trial into a paid term.",
    not: "Client success pages or catalog views during the trial.",
  },
} as const;

export type CeleYouProductEventId = keyof typeof CELEYOU_PRODUCT_EVENTS;

export function celeYouIsoWeekCohort(date: Date): string {
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((utc.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function isLaterCohort(registration: Date, activity: Date): boolean {
  return celeYouIsoWeekCohort(activity) > celeYouIsoWeekCohort(registration);
}
