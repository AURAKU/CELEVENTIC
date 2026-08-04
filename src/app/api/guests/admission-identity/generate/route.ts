import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeInvitationWrite, guardRate } from "@/lib/guest-search/api-auth";
import { generateAdmissionIdentity } from "@/services/admission-identity/admission-identity-audit.service";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  invitationId: z.string().min(1),
  mode: z.enum([
    "complete",
    "qr",
    "code",
    "link",
    "regenerate_qr",
    "regenerate_code",
    "regenerate_link",
  ]),
  reason: z.string().max(500).optional(),
  confirmRegenerate: z.boolean().optional(),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const auth = await authorizeInvitationWrite(parsed.data.invitationId);
  if (auth.error) return auth.error;

  const limited = await guardRate(req, auth.ctx!.userId, "admission-identity-generate", 60, 60);
  if (limited) return limited;

  try {
    const result = await generateAdmissionIdentity({
      invitationId: parsed.data.invitationId,
      actorUserId: auth.ctx!.userId,
      mode: parsed.data.mode,
      reason: parsed.data.reason,
      confirmRegenerate: parsed.data.confirmRegenerate,
    });
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Generation failed";
    const status = message.includes("confirmation") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
