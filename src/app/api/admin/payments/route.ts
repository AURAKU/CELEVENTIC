import { NextResponse } from "next/server";
import { adminService } from "@/services/admin/admin.service";
import { requireAdminSession } from "@/lib/require-admin";

export async function GET(req: Request) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get("page") ?? "1");
  const status = url.searchParams.get("status") ?? undefined;
  const data = await adminService.getPayments(page, 50, status);
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
