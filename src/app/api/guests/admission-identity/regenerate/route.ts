import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeInvitationWrite, guardRate } from "@/lib/guest-search/api-auth";
import { generateAdmissionIdentity } from "@/services/admission-identity/admission-identity-audit.service";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  invitationId: z.string().min(1),
  target: z.enum(["qr", "code", "link"]),
  reason: z.string().min(3).max(500),
  confirmRegenerate: z.literal(true),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          "Regeneration requires confirmation. Previously shared QR codes or links may stop working.",
      },
      { status: 400 }
    );
  }

  const auth = await authorizeInvitationWrite(parsed.data.invitationId);
  if (auth.error) return auth.error;

  const limited = await guardRate(req, auth.ctx!.userId, "admission-identity-regenerate", 30, 60);
  if (limited) return limited;

  const mode =
    parsed.data.target === "qr"
      ? "regenerate_qr"
      : parsed.data.target === "code"
        ? "regenerate_code"
        : "regenerate_link";

  try {
    const result = await generateAdmissionIdentity({
      invitationId: parsed.data.invitationId,
      actorUserId: auth.ctx!.userId,
      mode,
      reason: parsed.data.reason,
      confirmRegenerate: true,
    });
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Regeneration failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
