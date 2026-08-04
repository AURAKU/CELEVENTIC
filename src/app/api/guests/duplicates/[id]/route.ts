import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeInvitationWrite, guardRate } from "@/lib/guest-search/api-auth";
import { setInvitationLifecycle } from "@/services/guest-search/quick-invite.service";
import { createAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  confirm: z.literal(true),
  reason: z.string().min(3).max(500),
  hardDelete: z.boolean().optional().default(false),
});

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          "Deletion is not the default. Confirm archive/delete with a reason. Prefer Archive Duplicate.",
      },
      { status: 400 }
    );
  }

  const auth = await authorizeInvitationWrite(id);
  if (auth.error) return auth.error;

  const limited = await guardRate(req, auth.ctx!.userId, "duplicates-delete", 20, 60);
  if (limited) return limited;

  try {
    const result = await setInvitationLifecycle({
      eventId: auth.invitationEventId!,
      invitationId: id,
      actorUserId: auth.ctx!.userId,
      action: parsed.data.hardDelete ? "DELETE" : "ARCHIVE",
      reason: parsed.data.reason,
    });

    await createAuditLog({
      userId: auth.ctx!.userId,
      action: "DELETE",
      entity: "admission_identity",
      entityId: id,
      details: {
        kind: parsed.data.hardDelete ? "duplicate_hard_deleted" : "duplicate_archived_via_delete",
        eventId: auth.invitationEventId,
        invitationId: id,
        partyId: id,
        reason: parsed.data.reason,
      },
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not remove duplicate";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
