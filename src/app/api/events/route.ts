import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { workspaceProvisionService } from "@/services/entitlements/workspace-provision.service";
import { createAuditLog } from "@/lib/audit";
import { parsePaginationFromUrl, PUBLIC_GRID_LIMIT } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import { eventService } from "@/services/events/event.service";
import type { UserRole } from "@prisma/client";

const createEventSchema = z.object({
  title: z.string().min(3),
  eventType: z.string(),
  hostName: z.string().min(2),
  description: z.string().optional(),
  startDate: z.string(),
  endDate: z.string().optional(),
  venueName: z.string().optional(),
  landmark: z.string().optional(),
  mapsLink: z.string().optional(),
  contactPhone: z.string().optional(),
  dressCode: z.string().optional(),
  expectedGuests: z.number().optional(),
  pricingType: z.enum(["FREE", "PAID"]).optional(),
  coverImageUrl: z.string().optional(),
  themeId: z.string().optional(),
  packageId: z.string().optional(),
  typeSpecific: z.record(z.unknown()).optional(),
});

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = new URL(req.url).searchParams;
  if (params.get("all") === "true") {
    const events = await prisma.event.findMany({
      where: { organizerId: session.user.id },
      select: {
        id: true,
        slug: true,
        title: true,
        eventType: true,
        startDate: true,
        status: true,
        expectedGuests: true,
        city: true,
        venueName: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({
      success: true,
      data: events.map((e) => ({ ...e, startDate: e.startDate.toISOString() })),
    });
  }

  const { page, limit } = parsePaginationFromUrl(req.url, { limit: PUBLIC_GRID_LIMIT });
  const result = await eventService.getOrganizerEvents(session.user.id, page, limit);
  return NextResponse.json({ success: true, data: result });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = createEventSchema.parse(body);

    if (!data.startDate) {
      return NextResponse.json({ error: "Start date is required" }, { status: 400 });
    }

    const event = await workspaceProvisionService.createEventWithWorkspace(
      {
        title: data.title,
        eventType: data.eventType as never,
        hostName: data.hostName,
        description: data.description,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        venueName: data.venueName,
        landmark: data.landmark,
        mapsLink: data.mapsLink,
        contactPhone: data.contactPhone,
        dressCode: data.dressCode,
        expectedGuests: data.expectedGuests,
        pricingType: data.pricingType,
        coverImageUrl: data.coverImageUrl,
        packageId: data.packageId,
        themeId: data.themeId,
        organizerId: session.user.id,
        typeSpecific: data.typeSpecific,
      },
      session.user.role as UserRole
    );

    await createAuditLog({
      userId: session.user.id,
      action: "CREATE",
      entity: "event",
      entityId: event.id,
    });

    return NextResponse.json({ success: true, data: event }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Create event error:", error);
    const message = error instanceof Error ? error.message : "Failed to create event";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
