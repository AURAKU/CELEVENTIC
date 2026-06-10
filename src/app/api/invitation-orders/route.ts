import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { invitationOrderService } from "@/services/invitations/invitation-order.service";

const createSchema = z.object({
  templateSlug: z.string().min(1),
  packageSlug: z.string().min(1),
  eventType: z.string().min(1),
});

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orders = await invitationOrderService.listUserOrders(session.user.id);
  return NextResponse.json({ success: true, data: orders });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = createSchema.parse(body);
    const order = await invitationOrderService.createDraft({
      userId: session.user.id,
      ...data,
    });
    return NextResponse.json({ success: true, data: order }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create order" },
      { status: 500 }
    );
  }
}
