import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeGuestWrite, guardRate } from "@/lib/guest-search/api-auth";
import { completeAllIncompleteIdentities } from "@/services/admission-identity/admission-identity-audit.service";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  eventId: z.string().min(1),
  confirm: z.literal(true),
});

/**
 * POST /api/guests/admission-identity/complete-event
 * Completes missing QR/code identity for every incomplete invitation party on the event.
 */
export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Confirm complete-event to generate missing identities for all incomplete parties." },
      { status: 400 }
    );
  }

  const auth = await authorizeGuestWrite(parsed.data.eventId);
  if (auth.error) return auth.error;

  const limited = await guardRate(req, auth.ctx!.userId, "admission-identity-complete-event", 5, 60);
  if (limited) return limited;

  const result = await completeAllIncompleteIdentities({
    eventId: parsed.data.eventId,
    actorUserId: auth.ctx!.userId,
  });

  return NextResponse.json({ success: true, data: result });
}
