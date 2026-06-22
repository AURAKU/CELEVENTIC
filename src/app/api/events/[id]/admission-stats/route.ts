import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { qrService } from "@/services/qr/qr.service";
import { verifyEventAccess } from "@/lib/event-access";
import { isAdminRole } from "@/lib/roles";
import type { UserRole } from "@prisma/client";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized", status: "unauthorized" }, { status: 401 });
  }

  const { id: eventId } = await params;
  await verifyEventAccess(eventId, session.user.id, session.user.role);

  const stats = await qrService.getAdmissionStats(eventId);

  return NextResponse.json({
    success: true,
    data: {
      ...stats,
      isAdmin: isAdminRole(session.user.role as UserRole),
    },
  });
}

/** CSV export for admin/organizer admission reports */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId } = await params;
  await verifyEventAccess(eventId, session.user.id, session.user.role);

  const stats = await qrService.getAdmissionStats(eventId);
  const scans = await qrService.getRecentScans(eventId, 500);

  const rows = [
    ["Metric", "Value"],
    ["Total Passes", String(stats.totalPasses)],
    ["Checked In", String(stats.checkedIn)],
    ["Pending", String(stats.pending)],
    ["Invalid Attempts", String(stats.invalidAttempts)],
    ["Check-in Rate %", String(stats.checkInRate)],
    [],
    ["Scan ID", "Result", "Name", "Gate", "Time"],
    ...scans.map((s) => [
      s.id,
      s.result,
      s.guest?.name ?? s.ticket?.name ?? "",
      s.gate ?? "",
      s.createdAt.toISOString(),
    ]),
  ];

  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="admission-${eventId}.csv"`,
    },
  });
}
