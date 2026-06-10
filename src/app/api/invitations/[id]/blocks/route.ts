import { NextResponse } from "next/server";
import { invitationBlockService } from "@/services/invitations/invitation-block.service";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const blocks = await invitationBlockService.getBlocksForInvitation(id);
  return NextResponse.json({ success: true, data: blocks });
}
