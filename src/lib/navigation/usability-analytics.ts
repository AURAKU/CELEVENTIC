/** Fire-and-forget usability events — no sensitive content. */
export type UsabilityEvent =
  | "page_viewed"
  | "primary_action_clicked"
  | "onboarding_completed"
  | "onboarding_skipped"
  | "flow_abandoned"
  | "search_used"
  | "feature_discovered"
  | "error_encountered";

export function trackUsability(
  event: UsabilityEvent,
  meta?: Record<string, string | number | boolean>
) {
  if (typeof window === "undefined") return;
  try {
    void fetch("/api/analytics/usability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event,
        path: window.location.pathname,
        ...meta,
      }),
      keepalive: true,
    });
  } catch {
    // analytics must never block UX
  }
}
