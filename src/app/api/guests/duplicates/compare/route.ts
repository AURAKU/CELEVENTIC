import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeGuestWrite, guardRate } from "@/lib/guest-search/api-auth";
import {
  getAdmissionIdentityDetail,
  markNotDuplicate,
} from "@/services/admission-identity/admission-identity-audit.service";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  eventId: z.string().min(1),
  leftInvitationId: z.string().min(1),
  rightInvitationId: z.string().min(1),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const auth = await authorizeGuestWrite(parsed.data.eventId);
  if (auth.error) return auth.error;

  const limited = await guardRate(req, auth.ctx!.userId, "duplicates-compare", 60, 60);
  if (limited) return limited;

  const [left, right] = await Promise.all([
    getAdmissionIdentityDetail(parsed.data.leftInvitationId),
    getAdmissionIdentityDetail(parsed.data.rightInvitationId),
  ]);

  if (!left || !right || left.eventId !== parsed.data.eventId || right.eventId !== parsed.data.eventId) {
    return NextResponse.json({ error: "Invitations not found on this event" }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: { left, right } });
}

export async function PUT(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const auth = await authorizeGuestWrite(parsed.data.eventId);
  if (auth.error) return auth.error;

  const limited = await guardRate(req, auth.ctx!.userId, "duplicates-not", 60, 60);
  if (limited) return limited;

  await markNotDuplicate({
    leftInvitationId: parsed.data.leftInvitationId,
    rightInvitationId: parsed.data.rightInvitationId,
    actorUserId: auth.ctx!.userId,
    eventId: parsed.data.eventId,
  });

  return NextResponse.json({ success: true });
}
