import { NextResponse } from "next/server";
import { adminService } from "@/services/admin/admin.service";
import { requireAdminSession } from "@/lib/require-admin";

export async function GET(req: Request) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get("page") ?? "1");
  const action = url.searchParams.get("action") ?? undefined;
  const data = await adminService.getAuditLogs(page, 100, action);
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
