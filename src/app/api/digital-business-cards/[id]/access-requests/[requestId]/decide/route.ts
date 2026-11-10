import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { getDigitalCardForUser } from "@/services/digital-business-card/digital-business-card.service";
import { decideCeleCardAccessRequest } from "@/services/digital-business-card/celecard-access.service";
import { digitalCardPublicUrl } from "@/lib/digital-business-card/types";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  decision: z.enum(["approve", "decline", "revoke"]),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string; requestId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, requestId } = await ctx.params;
  const card = await getDigitalCardForUser(session.user.id, id);
  if (!card) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose approve, decline, or revoke" }, { status: 400 });

  const result = await decideCeleCardAccessRequest({
    cardId: card.id,
    requestId,
    decision: parsed.data.decision,
  });
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (parsed.data.decision === "approve" && "token" in result) {
    const path = `${digitalCardPublicUrl(card.slug)}/grant?token=${encodeURIComponent(result.token)}`;
    return NextResponse.json({
      success: true,
      data: { status: "APPROVED", grantPath: path },
    });
  }
  return NextResponse.json({ success: true, data: { status: parsed.data.decision === "decline" ? "DECLINED" : "REVOKED" } });
}
