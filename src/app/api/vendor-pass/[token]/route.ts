import { NextResponse } from "next/server";
import { getVendorTeamPassByPublicToken } from "@/services/vendor-pass/vendor-team-pass.service";

export const dynamic = "force-dynamic";

/** Public vendor/team pass view — no guest data, no other passes. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const result = await getVendorTeamPassByPublicToken(token);
  if (!result) {
    return NextResponse.json({ error: "Pass not found" }, { status: 404 });
  }
  if (result.invalid) {
    return NextResponse.json({
      success: false,
      data: {
        invalid: true,
        status: result.status,
        title: result.title,
        vendorName: result.vendorName,
        eventTitle: result.eventTitle,
      },
    });
  }
  return NextResponse.json({ success: true, data: result.pass });
}
