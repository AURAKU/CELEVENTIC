/** Client-side Celeventic Guide analytics — extends usability patterns. */

export type GuideAnalyticsEvent =
  | "guide_viewed"
  | "guide_video_milestone"
  | "guide_share"
  | "guide_search"
  | "guide_search_no_result"
  | "guide_context_help"
  | "guide_tour_start"
  | "guide_tour_complete"
  | "guide_tour_skip"
  | "guide_feedback"
  | "guide_motion_replay"
  | "guide_first_time_dismiss"
  | "guide_first_time_cta"
  | "guide_journey_start";

export function trackGuideEvent(
  event: GuideAnalyticsEvent,
  meta?: Record<string, string | number | boolean | null | undefined>
) {
  if (typeof window === "undefined") return;
  try {
    const clean: Record<string, string | number | boolean> = {};
    for (const [k, v] of Object.entries(meta ?? {})) {
      if (v === null || v === undefined) continue;
      clean[k] = v;
    }
    void fetch("/api/analytics/guides", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event,
        path: window.location.pathname,
        ...clean,
      }),
      keepalive: true,
    });
  } catch {
    // analytics must never block UX
  }
}
