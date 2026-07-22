import { isPreviewInvitationId } from "@/lib/invitation/guest-portal-actions";
import type { AnalyticsEventType } from "@/services/invitation-os/invitation-analytics.service";

export interface InviteEventPayload {
  eventType: AnalyticsEventType;
  invitationId?: string;
  guestId?: string;
  templateSlug?: string;
  metadata?: Record<string, unknown>;
}

const sentKeys = new Set<string>();

/**
 * Fire-and-forget client analytics into the existing DB-backed pipeline
 * (/api/invitation-os/track). Uses sendBeacon so events survive navigation
 * (viral footer CTA). Dedupes per session key; skips preview invitations.
 */
export function trackInviteEvent(payload: InviteEventPayload, dedupeKey?: string): void {
  if (typeof window === "undefined") return;
  if (payload.invitationId && isPreviewInvitationId(payload.invitationId)) return;
  if (dedupeKey) {
    if (sentKeys.has(dedupeKey)) return;
    sentKeys.add(dedupeKey);
  }

  const body = JSON.stringify(payload);
  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon("/api/invitation-os/track", blob)) return;
    }
  } catch {
    // fall through to fetch
  }
  void fetch("/api/invitation-os/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => undefined);
}
