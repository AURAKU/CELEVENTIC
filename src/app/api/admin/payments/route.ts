import { NextResponse } from "next/server";
import { adminService } from "@/services/admin/admin.service";
import { requireAdminSession } from "@/lib/require-admin";
import { parsePaginationFromUrl, ADMIN_TABLE_LIMIT } from "@/lib/pagination";

export async function GET(req: Request) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const { page, limit } = parsePaginationFromUrl(req.url, { limit: ADMIN_TABLE_LIMIT });
  const status = url.searchParams.get("status") ?? undefined;
  const data = await adminService.getPayments(page, limit, status);
  return NextResponse.json({
    success: true,
    data: {
      ...data,
      payments: data.payments.map((p) => ({
        ...p,
        amount: p.amount.toString(),
        createdAt: p.createdAt.toISOString(),
      })),
    },
  });
}
