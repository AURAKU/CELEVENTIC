import { NextResponse } from "next/server";
import { getSession, isAdminRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parsePaginationFromUrl, ADMIN_TABLE_LIMIT, paginatedResult } from "@/lib/pagination";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { page, limit, skip } = parsePaginationFromUrl(req.url, { limit: ADMIN_TABLE_LIMIT });
  const where = { purpose: "INVITATION_ORDER" as const };

  const [payments, total, logs] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        currencyLogs: true,
        invitationOrder: { select: { id: true, eventTitle: true, packageSlug: true } },
        user: { select: { name: true, email: true } },
        logs: { orderBy: { createdAt: "desc" }, take: 5 },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.payment.count({ where }),
    prisma.paymentLog.findMany({
      where: { action: { in: ["INITIALIZED", "STATUS_UPDATE", "WEBHOOK"] } },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { payment: { select: { reference: true, status: true } } },
    }),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      ...paginatedResult(payments, total, page, limit),
      payments,
      webhookLogs: logs,
    },
  });
}
