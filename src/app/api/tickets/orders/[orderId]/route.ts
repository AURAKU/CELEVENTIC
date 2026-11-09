import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ticketService } from "@/services/tickets/ticket.service";
import { requireEventPermission } from "@/lib/workspace/event-access";
import { EventPermissionKey } from "@/lib/workspace/permission-keys";
import { createAuditLog } from "@/lib/audit";
import type { UserRole } from "@prisma/client";

const orderActionSchema = z.object({
  action: z.enum(["cancel", "refund", "transfer"]),
  buyerName: z.string().min(2).optional(),
  buyerEmail: z.string().email().optional(),
  buyerPhone: z.string().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orderId } = await params;
  const existing = await prisma.ticketOrder.findUnique({
    where: { id: orderId },
    select: { id: true, eventId: true, status: true, buyerName: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  try {
    await requireEventPermission(
      existing.eventId,
      session.user.id,
      session.user.role as UserRole,
      EventPermissionKey.MANAGE_TICKETS
    );
    const body = orderActionSchema.parse(await req.json());

    let order;
    if (body.action === "cancel") {
      order = await ticketService.cancelOrder(orderId);
    } else if (body.action === "refund") {
      order = await ticketService.refundOrder(orderId);
    } else {
      if (!body.buyerName) {
        return NextResponse.json({ error: "New ticket holder name is required" }, { status: 400 });
      }
      order = await ticketService.transferOrder(orderId, {
        buyerName: body.buyerName,
        buyerEmail: body.buyerEmail,
        buyerPhone: body.buyerPhone,
      });
    }

    await createAuditLog({
      userId: session.user.id,
      action: "UPDATE",
      entity: "ticket_order",
      entityId: orderId,
      details: { action: body.action, previousStatus: existing.status },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...order,
        totalAmount: Number(order.totalAmount),
        providerRefundPending: body.action === "refund",
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Order update failed" },
      { status: 400 }
    );
  }
}
