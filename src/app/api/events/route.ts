import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { eventService } from "@/services/events/event.service";
import { createAuditLog } from "@/lib/audit";

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
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const events = await eventService.getOrganizerEvents(session.user.id);
  return NextResponse.json({ success: true, data: events });
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

    const event = await eventService.createEvent({
      ...data,
      eventType: data.eventType as never,
      startDate: new Date(data.startDate),
      endDate: data.endDate ? new Date(data.endDate) : undefined,
      packageId: data.packageId || undefined,
      themeId: data.themeId || undefined,
      organizerId: session.user.id,
    });

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
