import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { eventService } from "@/services/events/event.service";
import { verifyEventAccess } from "@/lib/event-access";
import { isAdminRole } from "@/lib/roles";
import { createAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@prisma/client";

const updateEventSchema = z.object({
  action: z.enum(["update", "publish"]).optional(),
  title: z.string().min(3).optional(),
  eventType: z.string().optional(),
  hostName: z.string().min(2).optional(),
  description: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  venueName: z.string().optional(),
  landmark: z.string().optional(),
  mapsLink: z.string().optional(),
  contactPhone: z.string().optional(),
  dressCode: z.string().optional(),
  expectedGuests: z.number().optional(),
  pricingType: z.enum(["FREE", "PAID"]).optional(),
  coverImageUrl: z.string().optional(),
  qrCenterImageUrl: z.string().optional().nullable(),
  qrLogoSize: z.enum(["subtle", "balanced", "bold"]).optional().nullable(),
  themeId: z.string().optional(),
  packageId: z.string().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "CANCELLED", "COMPLETED"]).optional(),
  isPublic: z.boolean().optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    await verifyEventAccess(id, session.user.id, session.user.role);
    const event = await eventService.getEventById(id);
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: event });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Access denied" },
      { status: 403 }
    );
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const event = await verifyEventAccess(id, session.user.id, session.user.role);
    if (event.organizerId !== session.user.id && !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: "Only the event organizer can update this event" }, { status: 403 });
    }

    const body = await req.json();
    const data = updateEventSchema.parse(body);

    if (data.action === "publish" || data.status === "PUBLISHED") {
      const published = await eventService.publishEvent(id, event.organizerId);
      await createAuditLog({
        userId: session.user.id,
        action: "UPDATE",
        entity: "event",
        entityId: id,
        details: { action: "publish" },
      });
      return NextResponse.json({ success: true, data: published });
    }

    const { action: _action, startDate, endDate, eventType, ...rest } = data;
    const updated = await eventService.updateEvent(id, event.organizerId, {
      ...rest,
      ...(eventType ? { eventType: eventType as never } : {}),
      ...(startDate ? { startDate: new Date(startDate) } : {}),
      ...(endDate ? { endDate: new Date(endDate) } : {}),
    });

    await createAuditLog({
      userId: session.user.id,
      action: "UPDATE",
      entity: "event",
      entityId: id,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update event" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });
    const role = (dbUser?.role ?? session.user.role) as UserRole;

    const event = await verifyEventAccess(id, session.user.id, role);
    const isAdmin = isAdminRole(role);
    const isOwner = event.organizerId === session.user.id;

    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { error: "Only the event organizer or a platform admin can delete this event" },
        { status: 403 }
      );
    }

    const result = await eventService.deleteEvent(id, { hard: isAdmin });
    await createAuditLog({
      userId: session.user.id,
      action: "DELETE",
      entity: "event",
      entityId: id,
      details: { mode: result.mode },
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete event" },
      { status: 500 }
    );
  }
}
