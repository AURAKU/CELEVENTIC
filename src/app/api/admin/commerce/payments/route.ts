import { NextResponse } from "next/server";
import { getSession, isAdminRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [payments, logs] = await Promise.all([
    prisma.payment.findMany({
      where: { purpose: "INVITATION_ORDER" },
      include: {
        currencyLogs: true,
        invitationOrder: { select: { id: true, eventTitle: true, packageSlug: true } },
        user: { select: { name: true, email: true } },
        logs: { orderBy: { createdAt: "desc" }, take: 5 },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.paymentLog.findMany({
      where: { action: { in: ["INITIALIZED", "STATUS_UPDATE", "WEBHOOK"] } },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { payment: { select: { reference: true, status: true } } },
    }),
  ]);

  return NextResponse.json({ success: true, data: { payments, webhookLogs: logs } });
}
