import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { invitationBlockService } from "@/services/invitations/invitation-block.service";
import { requireEventPermission } from "@/lib/workspace/event-access";
import { EventPermissionKey } from "@/lib/workspace/permission-keys";
import type { UserRole } from "@prisma/client";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const uniqueLink = new URL(req.url).searchParams.get("uniqueLink");
  const invitation = await prisma.invitation.findUnique({
    where: { id },
    select: { id: true, uniqueLink: true, eventId: true },
  });
  if (!invitation) {
    return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
  }

  if (uniqueLink && uniqueLink === invitation.uniqueLink) {
    const blocks = await invitationBlockService.getBlocksForInvitation(id);
    return NextResponse.json({ success: true, data: blocks });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await requireEventPermission(
      invitation.eventId,
      session.user.id,
      session.user.role as UserRole,
      EventPermissionKey.VIEW_EVENT
    );
  } catch {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const blocks = await invitationBlockService.getBlocksForInvitation(id);
  return NextResponse.json({ success: true, data: blocks });
}
