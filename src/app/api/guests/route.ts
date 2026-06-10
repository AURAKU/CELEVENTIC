import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { invitationService } from "@/services/invitations/invitation.service";
import { verifyEventAccess } from "@/lib/event-access";

const addGuestSchema = z.object({
  eventId: z.string(),
  invitationId: z.string().optional(),
  name: z.string().min(2),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  plusOnes: z.number().optional(),
});

const bulkSchema = z.object({
  eventId: z.string(),
  invitationId: z.string().optional(),
  guests: z.array(addGuestSchema.omit({ eventId: true, invitationId: true })),
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
    const guests = await invitationService.getEventGuests(eventId);
    return NextResponse.json({ success: true, data: guests });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Access denied" }, { status: 403 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    if (body.guests) {
      const data = bulkSchema.parse(body);
      await verifyEventAccess(data.eventId, session.user.id, session.user.role);
      const results = await invitationService.addGuestsBulk(data.eventId, data.invitationId, data.guests);
      return NextResponse.json({ success: true, data: results }, { status: 201 });
    }

    const data = addGuestSchema.parse(body);
    await verifyEventAccess(data.eventId, session.user.id, session.user.role);
    const result = await invitationService.addGuest(data);
    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to add guest" }, { status: 500 });
  }
}
