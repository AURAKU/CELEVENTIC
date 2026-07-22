import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { qrAnalyticsService } from "@/services/qr/qr-analytics.service";
import { verifyEventAccess } from "@/lib/event-access";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("eventId");
  const legacyLimit = searchParams.get("limit");

  if (!eventId) {
    return NextResponse.json({ error: "eventId required" }, { status: 400 });
  }

  await verifyEventAccess(eventId, session.user.id, session.user.role);

  // Prefer analytics history (names, seats, search) even for legacy callers
  if (legacyLimit && !searchParams.get("page")) {
    const limit = Math.min(parseInt(legacyLimit, 10) || 20, 100);
    const historyUrl = new URL(req.url);
    historyUrl.searchParams.set("page", "1");
    historyUrl.searchParams.set("limit", String(limit));
    const history = await qrAnalyticsService.getScanHistory(eventId, historyUrl.toString());
    return NextResponse.json({ success: true, data: history.items });
  }

  const history = await qrAnalyticsService.getScanHistory(eventId, req.url);

  return NextResponse.json({ success: true, data: history.items, pagination: history });
}
