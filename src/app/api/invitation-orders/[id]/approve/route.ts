import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { productionWorkflowService } from "@/services/invitations/production-workflow.service";

const schema = z.object({
  notes: z.string().optional(),
  revisionId: z.string().optional(),
});

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
    const body = schema.parse(await req.json().catch(() => ({})));
    const approval = await productionWorkflowService.approveDesign(
      id,
      session.user.id,
      body.notes,
      body.revisionId
    );
    return NextResponse.json({ success: true, data: approval });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Approval failed" },
      { status: 400 }
    );
  }
}
