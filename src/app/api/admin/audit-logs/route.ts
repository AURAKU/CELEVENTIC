import { NextResponse } from "next/server";
import { adminService } from "@/services/admin/admin.service";
import { requireAdminSession } from "@/lib/require-admin";
import { parsePaginationFromUrl, ADMIN_TABLE_LIMIT } from "@/lib/pagination";

export async function GET(req: Request) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const { page, limit } = parsePaginationFromUrl(req.url, { limit: ADMIN_TABLE_LIMIT * 2 });
  const action = url.searchParams.get("action") ?? undefined;
  const data = await adminService.getAuditLogs(page, limit, action);
  return NextResponse.json({
    success: true,
    data: {
      ...data,
      logs: data.logs.map((l) => ({
        ...l,
        createdAt: l.createdAt.toISOString(),
      })),
    },
  });
}
