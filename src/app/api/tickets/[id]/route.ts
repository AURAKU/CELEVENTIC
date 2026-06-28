import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ticketService } from "@/services/tickets/ticket.service";
import { verifyEventAccess } from "@/lib/event-access";

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  type: z.string().optional(),
  description: z.string().optional(),
  price: z.number().min(0).optional(),
  maxQuantity: z.number().nullable().optional(),
  status: z.enum(["PENDING", "PAID", "CANCELLED"]).optional(),
  action: z.enum(["publish", "unpublish"]).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.ticket.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    await verifyEventAccess(existing.eventId, session.user.id, session.user.role);
    const body = updateSchema.parse(await req.json());

    if (body.action === "publish") {
      const updated = await ticketService.publishTicket(id);
      return NextResponse.json({ success: true, data: updated });
    }
    if (body.action === "unpublish") {
      const updated = await ticketService.unpublishTicket(id);
      return NextResponse.json({ success: true, data: updated });
    }

    const { action: _action, ...rest } = body;
    const updated = await ticketService.updateTicket(id, {
      ...rest,
      type: rest.type as never,
    });
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Update failed" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.ticket.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    await verifyEventAccess(existing.eventId, session.user.id, session.user.role);
    const result = await ticketService.deleteTicket(id);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Delete failed" },
      { status: 500 }
    );
  }
}
