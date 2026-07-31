import { NextResponse } from "next/server";
import {
  authorizeGuestWrite,
  errorResponse,
  guardRate,
} from "@/lib/guest-search/api-auth";
import {
  deleteEventGuestTag,
  GuestTagNotFoundError,
} from "@/services/guests/guest-tags.service";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/events/[id]/guest-tags/[tagId]
 * Soft-deletes a catalog tag (preset or custom) for organizers/admins.
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; tagId: string }> }
) {
  const { id: eventId, tagId } = await params;

  const auth = await authorizeGuestWrite(eventId);
  if (auth.error) return auth.error;

  const limited = await guardRate(req, auth.ctx.userId, "guest-tag-delete", 40, 60);
  if (limited) return limited;

  try {
    const tag = await deleteEventGuestTag(eventId, tagId);
    return NextResponse.json({ success: true, data: { tag } });
  } catch (error) {
    if (error instanceof GuestTagNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return errorResponse(error, 500);
  }
}
