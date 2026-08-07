import { NextResponse } from "next/server";
import { eventGuideService } from "@/services/event-guide/event-guide.service";
import { guideSeatingService } from "@/services/event-guide/guide-seating.service";

export const dynamic = "force-dynamic";

const MAX_QUERY_CHARS = 80;

function clientKey(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || req.headers.get("x-real-ip")?.trim() || "unknown-client";
}

/**
 * Names to offer while a guest is still typing.
 *
 * A guest who types `kofi` and is told "we could not find that" gives up,
 * even though the list has them. This answers with the party labels that
 * begin with what they typed — and with nothing else.
 *
 * Everything that keeps it from being a guest list lives on the server:
 * suggestions are dead in admission-code mode, the query has a minimum length
 * checked before any read, matching is prefix-anchored rather than fuzzy, at
 * most five labels come back, and the endpoint is rate limited per token and
 * client. The response body is a list of strings — there is no field on it
 * for a seat, a table, a member, a code or a contact detail.
 *
 * A failure is an empty list, never an error: a typeahead that throws while
 * someone is mid-word is worse than one that says nothing.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ publicToken: string }> }
) {
  const { publicToken } = await params;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const rawQuery = typeof body?.query === "string" ? body.query.slice(0, MAX_QUERY_CHARS) : "";

  const empty = NextResponse.json(
    { suggestions: [] as string[] },
    { headers: { "Cache-Control": "no-store" } }
  );

  if (!rawQuery.trim()) return empty;

  const guide = await eventGuideService.resolvePublic(publicToken).catch(() => null);
  if (!guide?.available) return empty;

  const seating = guide.payload.seating;
  const suggestions = await guideSeatingService
    .suggest({
      eventId: guide.eventId,
      publicToken,
      clientKey: clientKey(req),
      mode: seating.mode,
      rawQuery,
      minQueryLength: seating.minQueryLength,
      enabled: seating.enabled,
    })
    .catch(() => []);

  return NextResponse.json({ suggestions }, { headers: { "Cache-Control": "no-store" } });
}
