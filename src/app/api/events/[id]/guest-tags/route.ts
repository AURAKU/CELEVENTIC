import { NextResponse } from "next/server";
import { z } from "zod";
import {
  authorizeGuestWrite,
  authorizeSearch,
  errorResponse,
  guardRate,
} from "@/lib/guest-search/api-auth";
import {
  createCustomGuestTag,
  GuestTagConflictError,
  listEventGuestTags,
} from "@/services/guests/guest-tags.service";

export const dynamic = "force-dynamic";

/**
 * Organizer-only guest relationship tag catalog for seating/planning.
 * Never returned on public invitation routes.
 */

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params;
  const auth = await authorizeSearch(eventId);
  if (auth.error) return auth.error;

  try {
    const tags = await listEventGuestTags(eventId);
    return NextResponse.json({ success: true, data: { tags } });
  } catch (error) {
    return errorResponse(error, 500);
  }
}

const createSchema = z.object({
  label: z.string().min(2).max(80),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const auth = await authorizeGuestWrite(eventId);
  if (auth.error) return auth.error;

  const limited = await guardRate(req, auth.ctx.userId, "guest-tag-create", 40, 60);
  if (limited) return limited;

  try {
    const tag = await createCustomGuestTag(eventId, parsed.data.label);
    return NextResponse.json({ success: true, data: { tag } });
  } catch (error) {
    if (error instanceof GuestTagConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error instanceof Error && /between 2 and 80/.test(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return errorResponse(error, 500);
  }
}
