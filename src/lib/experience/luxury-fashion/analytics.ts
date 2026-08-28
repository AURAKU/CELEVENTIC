import { trackInviteEvent } from "@/lib/analytics/invite-events";

/**
 * Fashion flagship analytics — non-PII action names on INVITE_ACTION_CLICK.
 * Reuses the existing Celeventic pipeline rather than inventing event types.
 */
export type FashionInviteAction =
  | "intro_viewed"
  | "whisper_seen"
  | "opening_started"
  | "folio_viewed"
  | "folio_opened"
  | "unveil_started"
  | "silk_opened"
  | "silk_reveal_opened"
  | "doors_opened"
  | "portal_opened"
  | "unveil_completed"
  | "replay_unveiling"
  | "store_preview_started"
  | "store_preview_completed"
  | "collection_opened"
  | "maps_clicked"
  | "rsvp_started"
  | "rsvp_completed"
  | "share_clicked"
  | "calendar_clicked"
  | "nav_clicked"
  | "boutique_opened"
  | "lookbook_item_viewed"
  | "film_started"
  | "film_completed"
  | "store_film_play"
  | "store_film_complete"
  | "film_muted"
  | "film_fullscreen";

export function trackFashionAction(
  action: FashionInviteAction,
  meta?: { invitationId?: string; templateSlug?: string; extra?: Record<string, unknown> }
): void {
  trackInviteEvent(
    {
      eventType: "INVITE_ACTION_CLICK",
      invitationId: meta?.invitationId,
      templateSlug: meta?.templateSlug,
      metadata: { family: "luxury-fashion", action, ...meta?.extra },
    },
    `fashion:${action}:${meta?.invitationId ?? "anon"}`
  );
}
