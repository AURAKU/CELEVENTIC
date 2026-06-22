import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { invitationOrderService } from "@/services/invitations/invitation-order.service";
import { invitationBlockService } from "@/services/invitations/invitation-block.service";

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
    await invitationOrderService.getOrderForUser(id, session.user.id);
    await invitationBlockService.ensureBlocksForOrder(id);
    const blocks = await invitationBlockService.getBlocksForOrder(id);
    const order = await invitationOrderService.getOrderForUser(id, session.user.id);
    const available = await invitationBlockService.getAvailableBlockTypes(order.eventType);
    return NextResponse.json({ success: true, data: { blocks, available } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 404 }
    );
  }
}

const createSchema = z.object({
  blockType: z.string(),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  contentJson: z.record(z.unknown()).optional(),
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
    await invitationOrderService.getOrderForUser(id, session.user.id);
    const body = createSchema.parse(await req.json());
    const block = await invitationBlockService.createBlock(id, body);
    return NextResponse.json({ success: true, data: block }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Create failed" }, { status: 500 });
  }
}
