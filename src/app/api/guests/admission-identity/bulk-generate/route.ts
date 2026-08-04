import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeGuestWrite, guardRate } from "@/lib/guest-search/api-auth";
import { prisma } from "@/lib/prisma";
import { bulkGenerateAdmissionIdentities } from "@/services/admission-identity/admission-identity-audit.service";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  eventId: z.string().min(1),
  invitationIds: z.array(z.string().min(1)).min(1).max(200),
  mode: z.enum(["complete", "qr", "code"]).default("complete"),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const auth = await authorizeGuestWrite(parsed.data.eventId);
  if (auth.error) return auth.error;

  const limited = await guardRate(req, auth.ctx!.userId, "admission-identity-bulk", 20, 60);
  if (limited) return limited;

  const owned = await prisma.invitation.findMany({
    where: {
      id: { in: parsed.data.invitationIds },
      eventId: parsed.data.eventId,
      archivedAt: null,
    },
    select: { id: true },
  });
  const ownedIds = owned.map((o) => o.id);
  if (ownedIds.length === 0) {
    return NextResponse.json({ error: "No matching invitations on this event." }, { status: 404 });
  }

  const result = await bulkGenerateAdmissionIdentities({
    invitationIds: ownedIds,
    actorUserId: auth.ctx!.userId,
    mode: parsed.data.mode,
  });

  return NextResponse.json({
    success: true,
    data: {
      ...result,
      skippedForeign: parsed.data.invitationIds.length - ownedIds.length,
    },
  });
}
