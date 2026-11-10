import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  CeleCardAdminError,
  claimCeleCardWithToken,
} from "@/services/digital-business-card/admin-command.service";

export const dynamic = "force-dynamic";

const claimSchema = z.object({
  token: z.string().min(16).max(200),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in with the invited email to claim this card." }, { status: 401 });
  }
  const parsed = claimSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid claim token" }, { status: 400 });
  try {
    const card = await claimCeleCardWithToken({ token: parsed.data.token, userId: session.user.id });
    return NextResponse.json({
      success: true,
      data: { id: card.id, slug: card.slug, claimedAt: card.claimedAt },
    });
  } catch (error) {
    if (error instanceof CeleCardAdminError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error("[celecard.claim]", error);
    return NextResponse.json({ error: "Could not claim this card" }, { status: 500 });
  }
}
