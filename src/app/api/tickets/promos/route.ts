import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireEventPermission } from "@/lib/workspace/event-access";
import { EventPermissionKey } from "@/lib/workspace/permission-keys";
import { rateLimit } from "@/lib/rate-limit";
import type { UserRole } from "@prisma/client";
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
    await requireEventPermission(
      eventId,
      session.user.id,
      session.user.role as UserRole,
      EventPermissionKey.MANAGE_TICKETS
    );
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
    const limited = await rateLimit(`ticket-promo:${session.user.id}`, 30, 60);
    if (!limited.success) {
      return NextResponse.json({ error: "Too many promo changes. Please wait a moment." }, { status: 429 });
    }
    const data = createSchema.parse(await req.json());
    await requireEventPermission(
      data.eventId,
      session.user.id,
      session.user.role as UserRole,
      EventPermissionKey.MANAGE_TICKETS
    );
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
    await requireEventPermission(
      eventId,
      session.user.id,
      session.user.role as UserRole,
      EventPermissionKey.MANAGE_TICKETS
    );
    await deleteTicketPromo(eventId, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Delete failed" },
      { status: 500 }
    );
  }
}
