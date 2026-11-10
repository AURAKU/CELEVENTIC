import { NextResponse } from "next/server";
import { Permission } from "@/lib/rbac/types";
import { requireCeleCardPermission } from "@/lib/require-admin";
import { listAdminTemplates } from "@/services/digital-business-card/admin-command.service";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireCeleCardPermission(Permission.CELECARD_VIEW);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json({ success: true, data: listAdminTemplates() });
}
