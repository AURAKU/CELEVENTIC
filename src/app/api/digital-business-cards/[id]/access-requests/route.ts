import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDigitalCardForUser } from "@/services/digital-business-card/digital-business-card.service";
import { listCeleCardAccessRequests } from "@/services/digital-business-card/celecard-access.service";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const card = await getDigitalCardForUser(session.user.id, id);
  if (!card) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const requests = await listCeleCardAccessRequests(card.id);
  return NextResponse.json({ success: true, data: requests });
}
