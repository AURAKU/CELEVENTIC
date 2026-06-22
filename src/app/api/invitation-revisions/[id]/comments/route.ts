import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, isAdminRole } from "@/lib/auth";
import { productionWorkflowService } from "@/services/invitations/production-workflow.service";
import { prisma } from "@/lib/prisma";

const schema = z.object({ content: z.string().min(1) });

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const revision = await prisma.invitationRevision.findUnique({
    where: { id },
    include: { invitationOrder: { select: { userId: true } } },
  });
  if (!revision) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isAdmin = isAdminRole(session.user.role);
  if (!isAdmin && revision.invitationOrder.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { content } = schema.parse(await req.json());
    const comment = await productionWorkflowService.addComment(id, session.user.id, content, isAdmin);
    return NextResponse.json({ success: true, data: comment }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Comment failed" }, { status: 400 });
  }
}
