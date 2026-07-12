import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/require-admin";
import { getSystemHealthReport } from "@/lib/startup/system-health";

export async function GET() {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const report = await getSystemHealthReport();
  return NextResponse.json({ success: true, data: report });
}
