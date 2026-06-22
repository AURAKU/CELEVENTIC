import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, isAdminRole } from "@/lib/auth";
import { productionWorkflowService } from "@/services/invitations/production-workflow.service";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const summary = await productionWorkflowService.getProductionSummary(id);
  return NextResponse.json({ success: true, data: summary });
}

const patchSchema = z.object({
  action: z.enum([
    "assign_designer",
    "missing_info",
    "upload_preview",
    "send_approval",
    "deliver",
    "archive",
    "update_revision",
  ]),
  designerId: z.string().optional(),
  notes: z.string().optional(),
  previewUrl: z.string().optional(),
  previewVideoUrl: z.string().optional(),
  shareUrl: z.string().optional(),
  revisionId: z.string().optional(),
  revisionStatus: z.string().optional(),
  adminNotes: z.string().optional(),
  adminResponse: z.string().optional(),
  chargeAmount: z.number().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  try {
    const body = patchSchema.parse(await req.json());

    switch (body.action) {
      case "assign_designer":
        if (!body.designerId) throw new Error("designerId required");
        await productionWorkflowService.assignDesigner(id, body.designerId, session.user.id, body.notes);
        break;
      case "missing_info":
        if (!body.notes) throw new Error("Message required");
        await productionWorkflowService.requestMissingInfo(id, body.notes, session.user.id);
        break;
      case "upload_preview":
        if (!body.previewUrl) throw new Error("previewUrl required");
        await productionWorkflowService.uploadPreview(id, body.previewUrl, body.previewVideoUrl);
        break;
      case "send_approval":
        await productionWorkflowService.sendForApproval(id, session.user.id);
        break;
      case "deliver":
        await productionWorkflowService.deliverOrder(id, session.user.id, body.shareUrl);
        break;
      case "archive":
        await productionWorkflowService.archiveOrder(id);
        break;
      case "update_revision":
        if (!body.revisionId) throw new Error("revisionId required");
        await productionWorkflowService.adminUpdateRevision(body.revisionId, session.user.id, {
          status: body.revisionStatus,
          adminNotes: body.adminNotes,
          adminResponse: body.adminResponse,
          chargeAmount: body.chargeAmount,
        });
        break;
    }

    const summary = await productionWorkflowService.getProductionSummary(id);
    return NextResponse.json({ success: true, data: summary });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Action failed" },
      { status: 400 }
    );
  }
}
