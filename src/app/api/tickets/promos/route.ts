import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { verifyEventAccess } from "@/lib/event-access";
import {
  createTicketPromo,
  deleteTicketPromo,
  listTicketPromos,
} from "@/lib/tickets/promo-storage";

const createSchema = z.object({
  eventId: z.string(),
  code: z.string().min(2).max(32),
  discountPercent: z.number().min(0).max(100).optional(),
  discountFixed: z.number().min(0).optional(),
  maxUses: z.number().min(1).optional(),
  expiresAt: z.string().optional(),
});

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const eventId = new URL(req.url).searchParams.get("eventId");
  if (!eventId) return NextResponse.json({ error: "eventId required" }, { status: 400 });

  try {
    await verifyEventAccess(eventId, session.user.id, session.user.role);
    const promos = await listTicketPromos(eventId);
    return NextResponse.json({ success: true, data: promos });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Access denied" },
      { status: 403 }
    );
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const data = createSchema.parse(await req.json());
    await verifyEventAccess(data.eventId, session.user.id, session.user.role);
    const promo = await createTicketPromo(data.eventId, data);
    return NextResponse.json({ success: true, data: promo }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create promo" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const eventId = url.searchParams.get("eventId");
  const id = url.searchParams.get("id");
  if (!eventId || !id) return NextResponse.json({ error: "eventId and id required" }, { status: 400 });

  try {
    await verifyEventAccess(eventId, session.user.id, session.user.role);
    await deleteTicketPromo(eventId, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Delete failed" },
      { status: 500 }
    );
  }
}
