import { NextResponse } from "next/server";
import { getSession, isAdminRole } from "@/lib/auth";
import { vendorAdminService } from "@/services/vendor-os/vendor-admin.service";
import { parsePaginationFromUrl, ADMIN_TABLE_LIMIT } from "@/lib/pagination";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const p = new URL(req.url).searchParams;
  const { page, limit } = parsePaginationFromUrl(req.url, { limit: ADMIN_TABLE_LIMIT });
  const [vendors, stats] = await Promise.all([
    vendorAdminService.listVendors({
      search: p.get("search") ?? undefined,
      status: p.get("status") ?? undefined,
      verification: p.get("verification") ?? undefined,
      featured: p.get("featured") === "true" ? true : undefined,
      page,
      limit,
    }),
    vendorAdminService.getStats(),
  ]);
  return NextResponse.json({ success: true, data: { vendors, stats } });
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const vendor = await vendorAdminService.moderateVendor(
    body.vendorId,
    session.user.id,
    body.action,
    body.reason
  );
  return NextResponse.json({ success: true, data: vendor });
}
