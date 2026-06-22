import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isAdminRole } from "@/lib/auth";
import { adminService } from "@/services/admin/admin.service";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const stats = await adminService.getStats();
  return NextResponse.json({ success: true, data: stats });
}
