import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";

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
]);

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const body = await req.json().catch(() => ({}));
  const event = String(body.event ?? "");
  if (!ALLOWED.has(event)) {
    return NextResponse.json({ error: "Invalid event" }, { status: 400 });
  }

  const path = String(body.path ?? "").slice(0, 200);
  const slug = String(body.slug ?? "").slice(0, 120);

  if (session?.user?.id) {
    await createAuditLog({
      userId: session.user.id,
      action: "UPDATE",
      entity: "GuideAnalyticsEvent",
      entityId: event,
      details: { path, slug, meta: body },
    }).catch(() => undefined);
  }

  return NextResponse.json({ success: true });
}
