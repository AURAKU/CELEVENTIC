import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { complianceService } from "@/services/legal/compliance.service";

export async function GET() {
  const session = await getSession();
  const versions = await complianceService.getCurrentVersions();

  if (!session?.user?.id) {
    return NextResponse.json({
      success: true,
      data: { authenticated: false, versions },
    });
  }

  const status = await complianceService.getComplianceStatus(session.user.id);
  return NextResponse.json({
    success: true,
    data: { authenticated: true, ...status, versions },
  });
}
