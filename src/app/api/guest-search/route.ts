import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeSearch, errorResponse, guardRate } from "@/lib/guest-search/api-auth";
import { searchGuests } from "@/services/guest-search/guest-search.service";
import { MAX_QUERY_LENGTH } from "@/lib/guest-search/query";

/**
 * Smart Guest Search.
 *
 * `GET` rather than `POST` so the browser and any edge cache can collapse the
 * repeated requests a typeahead generates, and so a search never looks like a
 * mutation in the audit trail.
 */

export const dynamic = "force-dynamic";

const querySchema = z.object({
  eventId: z.string().min(1, "eventId is required"),
  q: z.string().max(MAX_QUERY_LENGTH).default(""),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  page: z.coerce.number().int().min(1).max(10_000).optional(),
  includeArchived: z.enum(["0", "1"]).optional(),
  includeGeneralPasses: z.enum(["0", "1"]).optional(),
  status: z.string().max(40).optional(),
});

export async function GET(req: Request) {
  const url = new URL(req.url);

  const parsed = querySchema.safeParse({
    eventId: url.searchParams.get("eventId") ?? "",
    q: url.searchParams.get("q") ?? "",
    limit: url.searchParams.get("limit") ?? undefined,
    page: url.searchParams.get("page") ?? undefined,
    includeArchived: url.searchParams.get("includeArchived") ?? undefined,
    includeGeneralPasses: url.searchParams.get("includeGeneralPasses") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const { eventId, q, limit, page, includeArchived, includeGeneralPasses, status } = parsed.data;

  const auth = await authorizeSearch(eventId);
  if (auth.error) return auth.error;

  // Generous: one request per keystroke is the intended usage.
  const limited = await guardRate(req, auth.ctx.userId, "query", 240, 60);
  if (limited) return limited;

  try {
    const result = await searchGuests({
      eventId,
      query: q,
      limit,
      page,
      includeArchived: includeArchived === "1",
      // Default ON so organizer CRM never hides general-pass invitations.
      includeGeneralPasses: includeGeneralPasses !== "0",
      status,
    });
    return NextResponse.json(
      { success: true, data: result },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    return errorResponse(error, 500);
  }
}
