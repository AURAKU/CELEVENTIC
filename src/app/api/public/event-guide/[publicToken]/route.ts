import { NextResponse } from "next/server";
import { eventGuideService } from "@/services/event-guide/event-guide.service";
import { GUIDE_UNAVAILABLE_COPY } from "@/lib/event-guide/types";
import { shouldPurgeOfflineCache, unavailableHttpStatus } from "@/lib/event-guide/access";

export const dynamic = "force-dynamic";

/**
 * The published Event Guide snapshot.
 *
 * This is exactly what the service worker caches and what a Venue Offline Pack
 * ships, so it must contain nothing private. It is served from the stored
 * snapshot, which means a draft edit can never reach it.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ publicToken: string }> }
) {
  const { publicToken } = await params;
  const result = await eventGuideService.resolvePublic(publicToken);

  if (!result.available) {
    const copy = GUIDE_UNAVAILABLE_COPY[result.reason];
    return NextResponse.json(
      {
        available: false,
        reason: result.reason,
        purgeCache: shouldPurgeOfflineCache(result.reason),
        heading: copy.heading,
        body: copy.body,
      },
      {
        status: unavailableHttpStatus(result.reason),
        headers: { "Cache-Control": "no-store" },
      }
    );
  }

  return NextResponse.json(
    { available: true, payload: result.payload },
    {
      headers: {
        // Always revalidate: a republish must reach guests on their next
        // connection, and the service worker holds the offline copy.
        "Cache-Control": "no-cache, must-revalidate",
        "X-Guide-Version": String(result.payload.version),
      },
    }
  );
}
