import { NextResponse } from "next/server";
import { z } from "zod";
import {
  authorizeInvitationWrite,
  errorResponse,
  guardRate,
} from "@/lib/guest-search/api-auth";
import { MAX_PARTY_SIZE, MIN_PARTY_SIZE } from "@/lib/guest-search/party-allowance";
import {
  DuplicateGuestError,
  updateInvitationPersonalisation,
} from "@/services/guest-search/quick-invite.service";
import { getResultCard } from "@/services/guest-search/guest-search.service";

/**
 * Edit a personalised invitation in place.
 *
 * The URL is never regenerated. A guest who already has the link in a WhatsApp
 * thread keeps a working link after the host fixes a spelling or widens the
 * party, which is the whole reason this is a separate endpoint from create.
 */

export const dynamic = "force-dynamic";

const bodySchema = z
  .object({
    name: z.string().min(2).max(200).optional(),
    partySize: z.number().int().min(MIN_PARTY_SIZE).max(MAX_PARTY_SIZE).optional(),
    phone: z.string().max(40).nullish(),
    email: z.string().max(200).nullish(),
    notes: z.string().max(2000).nullish(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Nothing to update",
  });

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
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

  const limited = await guardRate(req, auth.ctx.userId, "edit", 90, 60);
  if (limited) return limited;

  try {
    await updateInvitationPersonalisation({
      eventId: auth.ctx.eventId,
      invitationId: id,
      actorUserId: auth.ctx.userId,
      ...parsed.data,
    });

    const card = await getResultCard(auth.ctx.eventId, id);
    return NextResponse.json({ success: true, data: { card } });
  } catch (error) {
    if (error instanceof DuplicateGuestError) {
      return NextResponse.json(
        { error: error.message, duplicates: error.duplicates, code: "DUPLICATE" },
        { status: 409 }
      );
    }
    return errorResponse(error, 500);
  }
}
