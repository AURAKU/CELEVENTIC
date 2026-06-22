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

  if (legacyLimit && !searchParams.get("page")) {
    const { qrService } = await import("@/services/qr/qr.service");
    const limit = Math.min(parseInt(legacyLimit, 10) || 20, 100);
    const scans = await qrService.getRecentScans(eventId, limit);
    return NextResponse.json({
      success: true,
      data: scans.map((s) => ({
        id: s.id,
        result: s.result,
        status:
          s.result === "VALID"
            ? "valid"
            : s.result === "ALREADY_USED"
              ? "already_checked_in"
              : s.result === "EXPIRED"
                ? "expired"
                : s.result === "WRONG_EVENT"
                  ? "wrong_event"
                  : "invalid",
        guestName: s.guest?.name,
        ticketName: s.ticket?.name,
        scannerName: s.scanner?.name,
        gate: s.gate,
        createdAt: s.createdAt,
      })),
    });
  }

  const history = await qrAnalyticsService.getScanHistory(eventId, req.url);

  return NextResponse.json({ success: true, data: history.items, pagination: history });
}
