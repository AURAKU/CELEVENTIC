import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeGuestWrite, guardRate } from "@/lib/guest-search/api-auth";
import { archiveDuplicateInvitation } from "@/services/admission-identity/admission-identity-audit.service";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  eventId: z.string().min(1),
  invitationId: z.string().min(1),
  canonicalInvitationId: z.string().min(1),
  reason: z.string().min(3).max(500),
  confirm: z.literal(true),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Archive requires confirmation and a canonical invitation to keep." },
      { status: 400 }
    );
  }

  const auth = await authorizeGuestWrite(parsed.data.eventId);
  if (auth.error) return auth.error;

  const limited = await guardRate(req, auth.ctx!.userId, "duplicates-archive", 30, 60);
  if (limited) return limited;

  try {
    const result = await archiveDuplicateInvitation({
      invitationId: parsed.data.invitationId,
      canonicalInvitationId: parsed.data.canonicalInvitationId,
      actorUserId: auth.ctx!.userId,
      reason: parsed.data.reason,
    });
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Archive failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
