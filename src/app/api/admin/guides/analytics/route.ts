import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/require-admin";
import { getGuideAnalyticsSummary } from "@/services/celeventic-guide/guide.service";

export async function GET() {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const summary = await getGuideAnalyticsSummary();
  return NextResponse.json(summary);
}
