import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { qrAnalyticsService } from "@/services/qr/qr-analytics.service";
import { qrService } from "@/services/qr/qr.service";
import { verifyEventAccess } from "@/lib/event-access";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("eventId");
  const includeFailed = searchParams.get("failed") === "1";

  if (!eventId) {
    return NextResponse.json({ error: "eventId required" }, { status: 400 });
  }

  await verifyEventAccess(eventId, session.user.id, session.user.role);

  const [analytics, legacy] = await Promise.all([
    qrAnalyticsService.getEventStats(eventId),
    qrService.getAdmissionStats(eventId),
  ]);

  const failedScans = includeFailed
    ? await qrAnalyticsService.getFailedScans(eventId, req.url)
    : undefined;

  return NextResponse.json({
    success: true,
    data: {
      ...legacy,
      ...analytics,
      failedScans,
    },
  });
}
