import { NextResponse } from "next/server";
import { eventGuideService } from "@/services/event-guide/event-guide.service";
import { rateLimit } from "@/lib/rate-limit";
import { isEventGuideTab } from "@/lib/event-guide/types";

export const dynamic = "force-dynamic";

function clientKey(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || req.headers.get("x-real-ip")?.trim() || "unknown-client";
}

/**
 * Aggregate tab-view counter.
 *
 * Increments one `(day, tab)` row. No visitor identifier, no user agent, no
 * address and no referrer is stored — the organizer learns that the menu was
 * opened 240 times, never who opened it.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ publicToken: string }> }
) {
  const { publicToken } = await params;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const tab = body?.tab;
  if (!isEventGuideTab(tab)) {
    return new NextResponse(null, { status: 204 });
  }

  // Keeps a scripted client from inflating an organizer's numbers.
  const limit = await rateLimit(`event-guide:view:${publicToken}:${clientKey(req)}`, 60, 60);
  if (!limit.success) return new NextResponse(null, { status: 204 });

  const guide = await eventGuideService.resolvePublic(publicToken);
  if (!guide.available) return new NextResponse(null, { status: 204 });

  await eventGuideService
    .recordActivity({ guideId: guide.guideId, tab, views: 1 })
    .catch(() => undefined);

  return new NextResponse(null, { status: 204 });
}
