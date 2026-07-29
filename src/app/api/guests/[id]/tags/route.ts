import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  authorizeGuestWrite,
  errorResponse,
  guardRate,
} from "@/lib/guest-search/api-auth";
import { setGuestTags } from "@/services/guests/guest-tags.service";
import { getResultCard } from "@/services/guest-search/guest-search.service";

export const dynamic = "force-dynamic";

/**
 * Replace private CRM tags on a guest. Organizer/admin only.
 * Tags never appear on guest-facing invitation surfaces.
 */

const bodySchema = z.object({
  tagIds: z.array(z.string().min(1)).max(20),
});

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: guestId } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const guest = await prisma.guest.findFirst({
    where: { id: guestId },
    select: { id: true, eventId: true, invitationId: true },
  });
  if (!guest) {
    return NextResponse.json({ error: "Guest not found" }, { status: 404 });
  }

  const auth = await authorizeGuestWrite(guest.eventId);
  if (auth.error) return auth.error;

  const limited = await guardRate(req, auth.ctx.userId, "guest-tag-set", 90, 60);
  if (limited) return limited;

  try {
    const tags = await setGuestTags({
      eventId: guest.eventId,
      guestId: guest.id,
      tagIds: parsed.data.tagIds,
    });

    const card = guest.invitationId
      ? await getResultCard(guest.eventId, guest.invitationId)
      : null;

    return NextResponse.json({ success: true, data: { tags, card } });
  } catch (error) {
    if (error instanceof Error && /not found|do not belong/i.test(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return errorResponse(error, 500);
  }
}
