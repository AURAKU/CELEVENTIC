import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { activityRangeBounds } from "@/lib/digital-business-card/activity-range";
import { getDigitalCardAnalyticsForUser } from "@/services/digital-business-card/digital-business-card.service";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const url = new URL(req.url);
  const cursor = url.searchParams.get("cursor");
  const take = Number(url.searchParams.get("take") || "20");
  const bounds = activityRangeBounds({
    preset: url.searchParams.get("from") ? "custom" : "all",
    from: url.searchParams.get("from"),
    to: url.searchParams.get("to") || url.searchParams.get("from"),
  });
  const data = await getDigitalCardAnalyticsForUser(session.user.id, id, {
    cursor,
    take: Number.isFinite(take) ? take : 20,
    from: bounds.from,
    to: bounds.to,
  });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true, data });
}
