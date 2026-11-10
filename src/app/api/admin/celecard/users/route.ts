import { NextRequest, NextResponse } from "next/server";
import { Permission } from "@/lib/rbac/types";
import { requireCeleCardPermission } from "@/lib/require-admin";
import { searchAdminUsers } from "@/services/digital-business-card/admin-command.service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await requireCeleCardPermission(Permission.CELECARD_CREATE);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const url = new URL(req.url);
  const data = await searchAdminUsers({
    search: url.searchParams.get("search"),
    page: url.searchParams.get("page"),
    limit: url.searchParams.get("limit"),
  });
  return NextResponse.json({ success: true, data });
}
