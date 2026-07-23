import { NextResponse } from "next/server";
import { getSession, isAdminRole } from "@/lib/auth";
import { invitationAdminService } from "@/services/admin/invitation-admin.service";
import { parsePaginationFromUrl, ADMIN_TABLE_LIMIT, paginatedResult } from "@/lib/pagination";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { page, limit } = parsePaginationFromUrl(req.url, { limit: ADMIN_TABLE_LIMIT });
  const result = await invitationAdminService.getPaymentLogs(page, limit);
  return NextResponse.json({
    success: true,
    data: paginatedResult(result.items, result.total, result.page, result.limit),
  });
}
