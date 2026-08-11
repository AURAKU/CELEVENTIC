import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { buildSafeGuideAnalyticsPayload } from "@/lib/celeventic-guide/analytics-privacy";

const ALLOWED = new Set([
  "guide_viewed",
  "guide_video_milestone",
  "guide_share",
  "guide_search",
  "guide_search_no_result",
  "guide_context_help",
  "guide_tour_start",
  "guide_tour_complete",
  "guide_tour_skip",
  "guide_feedback",
  "guide_motion_replay",
  "guide_journey_start",
  "guide_first_time_cta",
  "guide_first_time_dismiss",
]);

/**
 * Guide analytics — privacy enforced (§57).
 * Never stores guest names, admission codes, QR tokens, payment info, or private invite URLs.
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const body = await req.json().catch(() => ({}));
  const event = String(body.event ?? "");
  if (!ALLOWED.has(event)) {
    return NextResponse.json({ error: "Invalid event" }, { status: 400 });
  }

  const safe = buildSafeGuideAnalyticsPayload({
    event,
    path: body.path,
    slug: body.slug,
    q: body.q ?? body.query ?? body.search,
    meta: typeof body === "object" && body ? (body as Record<string, unknown>) : {},
  });

  if (session?.user?.id) {
    await createAuditLog({
      userId: session.user.id,
      action: "UPDATE",
      entity: "GuideAnalyticsEvent",
      entityId: safe.event,
      details: {
        path: safe.path,
        slug: safe.slug,
        q: safe.q,
        meta: safe.meta,
      },
    }).catch(() => undefined);
  }

  return NextResponse.json({ success: true });
}
