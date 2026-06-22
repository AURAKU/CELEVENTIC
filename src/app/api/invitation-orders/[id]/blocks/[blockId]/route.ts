import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { invitationOrderService } from "@/services/invitations/invitation-order.service";
import { invitationBlockService } from "@/services/invitations/invitation-block.service";

const patchSchema = z.object({
  title: z.string().optional(),
  subtitle: z.string().optional(),
  contentJson: z.record(z.unknown()).optional(),
  isVisible: z.boolean().optional(),
  styleVariant: z.string().optional(),
  language: z.string().optional(),
  galleryUrls: z.array(z.string()).optional(),
  mediaUrl: z.string().optional(),
  frTitle: z.string().optional(),
  frSubtitle: z.string().optional(),
  frContent: z.string().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; blockId: string }> }
) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, blockId } = await params;
  try {
    await invitationOrderService.getOrderForUser(id, session.user.id);
    const body = patchSchema.parse(await req.json());
    const block = await invitationBlockService.updateBlock(blockId, id, body);
    return NextResponse.json({ success: true, data: block });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; blockId: string }> }
) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, blockId } = await params;
  try {
    await invitationOrderService.getOrderForUser(id, session.user.id);
    await invitationBlockService.deleteBlock(blockId, id);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
