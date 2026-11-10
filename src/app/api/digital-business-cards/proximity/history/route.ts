import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listProximityHistory } from "@/services/digital-business-card/proximity.service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const take = Number(new URL(req.url).searchParams.get("take") || "20");
  const rows = await listProximityHistory(session.user.id, take);
  return NextResponse.json({
    success: true,
    data: rows.map((row) => ({
      id: row.id,
      outcome: row.outcome,
      createdAt: row.createdAt,
      otherName:
        row.hostUserId === session.user.id
          ? row.session.peerCard?.displayName || "Nearby guest"
          : row.session.hostCard.displayName,
      otherSlug:
        row.hostUserId === session.user.id
          ? row.session.peerCard?.slug || null
          : row.session.hostCard.slug,
    })),
  });
}
