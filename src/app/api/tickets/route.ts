import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ticketService } from "@/services/tickets/ticket.service";
import { verifyEventAccess } from "@/lib/event-access";

const createSchema = z.object({
  eventId: z.string(),
  name: z.string().min(2),
  type: z.string(),
  description: z.string().optional(),
  price: z.number().min(0),
  maxQuantity: z.number().optional(),
});

const purchaseSchema = z.object({
  ticketId: z.string(),
  buyerName: z.string().min(2),
  buyerEmail: z.string().email().optional(),
  buyerPhone: z.string().optional(),
  quantity: z.number().min(1),
  promoCode: z.string().optional(),
});

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const eventId = new URL(req.url).searchParams.get("eventId");
  if (!eventId) {
    return NextResponse.json({ error: "eventId required" }, { status: 400 });
  }

  try {
    await verifyEventAccess(eventId, session.user.id, session.user.role);
    const tickets = await ticketService.getEventTickets(eventId);
    return NextResponse.json({ success: true, data: tickets });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Access denied" },
      { status: 403 }
    );
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const body = await req.json();

  if (body.action === "purchase") {
    try {
      const data = purchaseSchema.parse(body);
      const result = await ticketService.purchaseTicket({
        ...data,
        userId: session?.user?.id,
      });
      return NextResponse.json({ success: true, data: result }, { status: 201 });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
      }
      return NextResponse.json({ error: error instanceof Error ? error.message : "Purchase failed" }, { status: 500 });
    }
  }

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = createSchema.parse(body);
    await verifyEventAccess(data.eventId, session.user.id, session.user.role);
    const ticket = await ticketService.createTicket({
      ...data,
      type: data.type as never,
      description: data.description,
    });
    return NextResponse.json({ success: true, data: ticket }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create ticket" }, { status: 500 });
  }
}
