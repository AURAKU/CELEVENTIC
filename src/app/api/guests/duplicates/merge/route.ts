import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeGuestWrite, guardRate } from "@/lib/guest-search/api-auth";
import { archiveDuplicateInvitation } from "@/services/admission-identity/admission-identity-audit.service";
import { createAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  eventId: z.string().min(1),
  canonicalInvitationId: z.string().min(1),
  duplicateInvitationId: z.string().min(1),
  reason: z.string().min(3).max(500),
  confirm: z.literal(true),
});

/**
 * POST /api/guests/duplicates/merge
 *
 * Safe merge = keep canonical invitation party, archive the duplicate.
 * Never merges unrelated parties by name resemblance alone.
 * History on the archived party is preserved (soft archive + revoked pass).
 */
export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          "Merge requires confirmation. Choose a canonical invitation; the other party is archived, not deleted.",
      },
      { status: 400 }
    );
  }

  const auth = await authorizeGuestWrite(parsed.data.eventId);
  if (auth.error) return auth.error;

  const limited = await guardRate(req, auth.ctx!.userId, "duplicates-merge", 20, 60);
  if (limited) return limited;

  try {
    const result = await archiveDuplicateInvitation({
      invitationId: parsed.data.duplicateInvitationId,
      canonicalInvitationId: parsed.data.canonicalInvitationId,
      actorUserId: auth.ctx!.userId,
      reason: parsed.data.reason,
    });

    await createAuditLog({
      userId: auth.ctx!.userId,
      action: "UPDATE",
      entity: "admission_identity",
      entityId: parsed.data.canonicalInvitationId,
      details: {
        kind: "duplicate_merge_archive",
        eventId: parsed.data.eventId,
        canonicalInvitationId: parsed.data.canonicalInvitationId,
        duplicateInvitationId: parsed.data.duplicateInvitationId,
        reason: parsed.data.reason,
      },
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Merge failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
