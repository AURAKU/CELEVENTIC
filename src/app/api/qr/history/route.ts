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
  if (!eventId) {
    return NextResponse.json({ error: "eventId required" }, { status: 400 });
  }

  await verifyEventAccess(eventId, session.user.id, session.user.role);

  const history = await qrAnalyticsService.getScanHistory(eventId, req.url);

  return NextResponse.json({ success: true, data: history });
}
