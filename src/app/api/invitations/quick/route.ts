import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeGuestWrite, errorResponse, guardRate } from "@/lib/guest-search/api-auth";
import { MAX_PARTY_SIZE, MIN_PARTY_SIZE } from "@/lib/guest-search/party-allowance";
import {
  createQuickInvitation,
  DuplicateGuestError,
} from "@/services/guest-search/quick-invite.service";
import { getResultCard } from "@/services/guest-search/guest-search.service";

/**
 * Quick Invitation Generator — create.
 *
 * Name is the only required field. Everything else has a defensible default,
 * because the whole point of this endpoint is that an organiser standing in a
 * venue with a phone can add "Mr Kofi Obuah, admits 2" in about four seconds.
 */

const bodySchema = z.object({
  eventId: z.string().min(1),
  name: z.string().min(2, "Enter the guest or invitation name.").max(200),
  partySize: z.number().int().min(MIN_PARTY_SIZE).max(MAX_PARTY_SIZE).optional(),
  phone: z.string().max(40).nullish(),
  email: z.string().max(200).nullish(),
  notes: z.string().max(2000).nullish(),
  groupName: z.string().max(120).nullish(),
  templateId: z.string().nullish(),
  message: z.string().max(2000).nullish(),
  publishImmediately: z.boolean().optional(),
  issueEntryPass: z.boolean().optional(),
  enablePlaceCard: z.boolean().optional(),
  acknowledgeDuplicates: z.boolean().optional(),
});

export async function POST(req: Request) {
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

  const auth = await authorizeGuestWrite(parsed.data.eventId);
  if (auth.error) return auth.error;

  // Each create mints a credential and consumes an admission code, so this is
  // far tighter than search — but still comfortably above human typing speed.
  const limited = await guardRate(req, auth.ctx.userId, "create", 60, 60);
  if (limited) return limited;

  try {
    const result = await createQuickInvitation({
      ...parsed.data,
      actorUserId: auth.ctx.userId,
    });

    // Return the search card too, so the new invitation can slot straight into
    // the results list without a follow-up round trip.
    const card = await getResultCard(parsed.data.eventId, result.invitationId);

    return NextResponse.json({ success: true, data: { invitation: result, card } }, { status: 201 });
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
