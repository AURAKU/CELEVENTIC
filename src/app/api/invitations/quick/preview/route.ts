import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeGuestWrite, errorResponse, guardRate } from "@/lib/guest-search/api-auth";
import { MAX_PARTY_SIZE, MIN_PARTY_SIZE } from "@/lib/guest-search/party-allowance";
import { previewQuickInvitation } from "@/services/guest-search/quick-invite.service";

/**
 * Quick Invitation Generator — preview.
 *
 * Writes nothing. Shows the organiser what the name was read as, what the
 * allowance will be, and whether this person may already be on the list —
 * before anything guest-facing exists.
 */

const bodySchema = z.object({
  eventId: z.string().min(1),
  name: z.string().max(200),
  partySize: z.number().int().min(MIN_PARTY_SIZE).max(MAX_PARTY_SIZE).optional(),
  phone: z.string().max(40).nullish(),
  email: z.string().max(200).nullish(),
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

  // Fires on a debounce while the organiser types, so it sits between search
  // and create: cheap, but it does hit the duplicate index.
  const limited = await guardRate(req, auth.ctx.userId, "preview", 120, 60);
  if (limited) return limited;

  try {
    const preview = await previewQuickInvitation(parsed.data);
    return NextResponse.json({ success: true, data: preview });
  } catch (error) {
    return errorResponse(error, 500);
  }
}
