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
 * Archive, restore, revoke or reissue a single invitation.
 *
 * There is no delete. An invitation that has already been handed out cannot be
 * made never to have existed, and a guest arriving with an old QR deserves a
 * "this pass was withdrawn" rather than a blank "unknown code".
 */

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  action: z.enum(["ARCHIVE", "RESTORE", "REVOKE_PASS", "REISSUE_PASS"]),
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
    await setInvitationLifecycle({
      eventId: auth.ctx.eventId,
      invitationId: id,
      action: parsed.data.action,
      reason: parsed.data.reason,
      actorUserId: auth.ctx.userId,
    });

    // Archived rows are excluded from search by default, so ask for them
    // explicitly — the UI needs the updated card to render the undo state.
    const card = await getResultCard(auth.ctx.eventId, id);
    return NextResponse.json({ success: true, data: { card } });
  } catch (error) {
    return errorResponse(error, 500);
  }
}
