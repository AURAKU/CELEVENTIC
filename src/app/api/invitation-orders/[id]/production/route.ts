import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { productionWorkflowService } from "@/services/invitations/production-workflow.service";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  try {
    const summary = await productionWorkflowService.getProductionSummary(id);
    if (summary.order.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ success: true, data: summary });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
