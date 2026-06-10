import { NextResponse } from "next/server";
import { getSession, isAdminRole } from "@/lib/auth";
import { invitationAdminService } from "@/services/admin/invitation-admin.service";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const orders = await invitationAdminService.listOrders({
    status: searchParams.get("status") ?? undefined,
    productionStatus: searchParams.get("productionStatus") ?? undefined,
    search: searchParams.get("search") ?? undefined,
    includeArchived: searchParams.get("archived") === "true",
  });
  const designers = await invitationAdminService.getDesigners();
  return NextResponse.json({ success: true, data: orders, designers });
}