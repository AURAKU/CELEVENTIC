import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { REACH_VISIBILITY } from "@/lib/digital-business-card/privacy-preview";
import { persistReachVisibilityForUser } from "@/services/digital-business-card/celecard-access.service";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  visibility: z.record(z.enum(REACH_VISIBILITY)).default({}),
});

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Choose which details stay public or need a code" }, { status: 400 });
  }
  const updated = await persistReachVisibilityForUser(session.user.id, id, parsed.data.visibility);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
