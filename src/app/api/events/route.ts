import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { coupleNamesLegacyAlias, resolveCoupleName } from "@/lib/blueprints";
import { workspaceProvisionService } from "@/services/entitlements/workspace-provision.service";
import { createAuditLog } from "@/lib/audit";
import { parsePaginationFromUrl, PICKER_LIMIT, PUBLIC_GRID_LIMIT } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import { eventService } from "@/services/events/event.service";
import { isAdminRole } from "@/lib/roles";
import type { UserRole } from "@prisma/client";

const createEventSchema = z.object({
  title: z.string().min(3),
  eventType: z.string(),
  /** Canonical couple / host display name. */
  hostName: z.string().optional(),
  /** Legacy alias — folded into hostName when present. */
  coupleNames: z.string().optional(),
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
    const admin = isAdminRole(session.user.role as UserRole);
    const where = admin ? undefined : { organizerId: session.user.id };
    const take = PICKER_LIMIT;
    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
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
        take,
      }),
      prisma.event.count({ where }),
    ]);
    // Keep array shape for event-switcher / useEventContext compatibility.
    return NextResponse.json({
      success: true,
      data: events.map((e) => ({ ...e, startDate: e.startDate.toISOString() })),
      meta: { total, limit: take, truncated: total > take },
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

    const typeSpecificCouple =
      typeof data.typeSpecific?.coupleNames === "string"
        ? data.typeSpecific.coupleNames
        : undefined;
    const hostName = resolveCoupleName({
      hostName: data.hostName,
      coupleNames: data.coupleNames ?? typeSpecificCouple,
    });
    if (hostName.length < 2) {
      return NextResponse.json({ error: "Host / couple name is required" }, { status: 400 });
    }

    const typeSpecific: Record<string, unknown> = {
      ...(data.typeSpecific ?? {}),
    };
    if (data.eventType === "WEDDING") {
      typeSpecific.coupleNames = coupleNamesLegacyAlias(hostName);
    }

    const event = await workspaceProvisionService.createEventWithWorkspace(
      {
        title: data.title,
        eventType: data.eventType as never,
        hostName,
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
        typeSpecific: Object.keys(typeSpecific).length ? typeSpecific : undefined,
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
