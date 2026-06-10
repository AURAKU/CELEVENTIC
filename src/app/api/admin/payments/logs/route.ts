import { NextResponse } from "next/server";
import { getSession, isAdminRole } from "@/lib/auth";
import { invitationAdminService } from "@/services/admin/invitation-admin.service";

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const logs = await invitationAdminService.getPaymentLogs();
  return NextResponse.json({ success: true, data: logs });
}
