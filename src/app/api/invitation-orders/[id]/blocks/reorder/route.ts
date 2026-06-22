import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { invitationOrderService } from "@/services/invitations/invitation-order.service";
import { invitationBlockService } from "@/services/invitations/invitation-block.service";

const schema = z.object({ blockIds: z.array(z.string()) });

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
    await invitationOrderService.getOrderForUser(id, session.user.id);
    const { blockIds } = schema.parse(await req.json());
    const blocks = await invitationBlockService.reorderBlocks(id, blockIds);
    return NextResponse.json({ success: true, data: blocks });
  } catch {
    return NextResponse.json({ error: "Reorder failed" }, { status: 400 });
  }
}
