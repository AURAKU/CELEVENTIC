import { NextResponse } from "next/server";
import { Permission } from "@/lib/rbac/types";
import { requireCeleCardPermission } from "@/lib/require-admin";
import { getCeleYouAdminServicesSnapshot } from "@/services/digital-business-card/admin-services.service";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireCeleCardPermission(Permission.CELECARD_VIEW);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const data = await getCeleYouAdminServicesSnapshot();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[celecard.admin.services]", error);
    return NextResponse.json({ error: "Could not load CeleYou services" }, { status: 500 });
  }
}
