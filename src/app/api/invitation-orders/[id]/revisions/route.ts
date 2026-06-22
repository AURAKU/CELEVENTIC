import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { productionWorkflowService } from "@/services/invitations/production-workflow.service";

const requestSchema = z.object({
  changeCategory: z.enum([
    "DATE_CHANGE", "TIME_CHANGE", "VENUE_CHANGE", "PHONE_CHANGE", "SPELLING",
    "THEME_CHANGE", "LAYOUT_CHANGE", "COLOR_OVERHAUL", "NEW_ANIMATION", "NEW_SECTION", "OTHER",
  ]),
  notes: z.string().min(3),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const summary = await productionWorkflowService.getProductionSummary(id);
  if (summary.order.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ success: true, data: summary.order.revisions });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  try {
    const body = requestSchema.parse(await req.json());
    const revision = await productionWorkflowService.requestRevision(id, session.user.id, body);
    return NextResponse.json({ success: true, data: revision }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Request failed" },
      { status: 400 }
    );
  }
}
