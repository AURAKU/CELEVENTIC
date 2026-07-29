import { NextResponse } from "next/server";
import { z } from "zod";
import {
  authorizeInvitationWrite,
  errorResponse,
  guardRate,
} from "@/lib/guest-search/api-auth";
import { setInvitationLifecycle } from "@/services/guest-search/quick-invite.service";
import { getResultCard } from "@/services/guest-search/guest-search.service";

/**
 * Archive, restore, revoke, reissue, or permanently delete a single invitation.
 *
 * Delete is organiser/admin-only cleanup. The published Studio invitation for
 * an event cannot be hard-deleted here — that would take down the live
 * production template for every guest.
 */

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  action: z.enum(["ARCHIVE", "RESTORE", "REVOKE_PASS", "REISSUE_PASS", "DELETE"]),
  reason: z.string().max(300).optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

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

  const auth = await authorizeInvitationWrite(id);
  if (auth.error) return auth.error;

  const limited = await guardRate(req, auth.ctx.userId, "lifecycle", 60, 60);
  if (limited) return limited;

  try {
    const result = await setInvitationLifecycle({
      eventId: auth.ctx.eventId,
      invitationId: id,
      action: parsed.data.action,
      reason: parsed.data.reason,
      actorUserId: auth.ctx.userId,
    });

    if (result.deleted) {
      return NextResponse.json({ success: true, data: { deleted: true, card: null } });
    }

    // Archived rows are excluded from search by default, so ask for them
    // explicitly, the UI needs the updated card to render the undo state.
    const card = await getResultCard(auth.ctx.eventId, id);
    return NextResponse.json({ success: true, data: { card } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lifecycle action failed";
    if (message.includes("published Studio invitation")) {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    return errorResponse(error, 500);
  }
}
