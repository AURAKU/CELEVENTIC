import { NextResponse } from "next/server";
import { eventGuideService } from "@/services/event-guide/event-guide.service";
import { guideSeatingService } from "@/services/event-guide/guide-seating.service";
import { SEATING_OUTCOME_COPY } from "@/lib/event-guide/seating-finder";

export const dynamic = "force-dynamic";

const MAX_QUERY_CHARS = 80;

/**
 * Rate-limit bucket. Prefers the proxy-provided client address; falls back to a
 * shared bucket so a request with no usable address is throttled more, not less.
 */
function clientKey(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || req.headers.get("x-real-ip")?.trim() || "unknown-client";
}

/**
 * Privacy-safe seating lookup.
 *
 * Returns one party or nothing. Short queries are rejected before any database
 * read, attempts are rate limited per token + client, and an ambiguous result
 * reports only a count — never the candidate names.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ publicToken: string }> }
) {
  const { publicToken } = await params;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const rawQuery = typeof body?.query === "string" ? body.query.slice(0, MAX_QUERY_CHARS) : "";

  const guide = await eventGuideService.resolvePublic(publicToken);
  if (!guide.available) {
    return NextResponse.json(
      { status: "disabled", message: SEATING_OUTCOME_COPY.disabled },
      { status: 404, headers: { "Cache-Control": "no-store" } }
    );
  }

  const seating = guide.payload.seating;
  const outcome = await guideSeatingService.find({
    eventId: guide.eventId,
    publicToken,
    clientKey: clientKey(req),
    mode: seating.mode,
    rawQuery,
    minQueryLength: seating.minQueryLength,
    maxMatches: seating.maxMatches,
    enabled: seating.enabled,
  });

  // Counters only — the query itself is never recorded.
  await eventGuideService
    .recordActivity({
      guideId: guide.guideId,
      tab: "seating",
      searches: 1,
      matches: outcome.status === "ok" ? 1 : 0,
    })
    .catch(() => undefined);

  if (outcome.status === "rate_limited") {
    return NextResponse.json(
      { status: outcome.status, message: SEATING_OUTCOME_COPY.rate_limited },
      {
        status: 429,
        headers: {
          "Retry-After": String(outcome.retryAfterSeconds),
          "Cache-Control": "no-store",
        },
      }
    );
  }

  if (outcome.status === "ok") {
    return NextResponse.json(
      { status: "ok", match: outcome.match },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  return NextResponse.json(
    {
      status: outcome.status,
      message: SEATING_OUTCOME_COPY[outcome.status],
      ...(outcome.status === "query_too_short"
        ? { minQueryLength: outcome.minQueryLength }
        : {}),
    },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
}
