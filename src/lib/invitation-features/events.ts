import { revalidatePath } from "next/cache";

/**
 * Shared Invitation Feature Layer — real-time + cache seam.
 *
 * No real-time transport exists in the repo yet (see discovery), so this is a
 * single, swappable seam: today it invalidates Next caches + logs the event;
 * an SSE/WebSocket publisher can be dropped in behind `publishFeatureEvent`
 * without touching call sites. Guest surfaces poll (admission-status pattern).
 */
export type FeatureEventName =
  | "INVITATION_CONFIGURATION_UPDATED"
  | "INVITATION_FEATURE_ENABLED"
  | "INVITATION_FEATURE_DISABLED"
  | "INVITATION_FEATURE_REORDERED"
  | "PASS_CREATED"
  | "PASS_REVOKED"
  | "PASS_REGENERATED"
  | "PARTY_SIZE_UPDATED"
  | "SEATING_UPDATED"
  | "ADMISSION_UPDATED"
  | "ADMISSION_RESET"
  | "PORTAL_UNLOCKED"
  | "PORTAL_LOCKED"
  | "MENU_UPDATED"
  | "PROGRAMME_UPDATED"
  | "SERVICE_UPDATED"
  | "ANNOUNCEMENT_PUBLISHED"
  | "GIFT_WALLET_UPDATED"
  | "MEMORY_VAULT_UPDATED";

export interface FeatureEventPayload {
  eventId?: string;
  invitationId?: string;
  invitationLink?: string;
  featureKey?: string;
  actorUserId?: string;
  [key: string]: unknown;
}

/** Invalidate the cached read paths for an invitation's live surfaces. */
export function invalidateInvitationCaches(link?: string | null) {
  if (!link) return;
  try {
    revalidatePath(`/invite/${link}`);
    revalidatePath(`/invite/${link}/event-day`);
  } catch {
    // revalidatePath throws outside a request/render scope (e.g. scripts) — safe to ignore.
  }
}

/** Publish a feature/admission event. Swap the body for SSE/WS later. */
export function publishFeatureEvent(name: FeatureEventName, payload: FeatureEventPayload) {
  invalidateInvitationCaches(payload.invitationLink);
  if (process.env.NODE_ENV !== "test") {
    console.info(`[feature-event] ${name}`, JSON.stringify(payload));
  }
}
