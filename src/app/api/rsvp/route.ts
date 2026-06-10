import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { invitationService } from "@/services/invitations/invitation.service";

const rsvpByGuestSchema = z.object({
  guestId: z.string(),
  response: z.enum(["ACCEPTED", "DECLINED", "MAYBE"]),
  message: z.string().optional(),
});

const rsvpByInvitationSchema = z.object({
  invitationId: z.string(),
  guestName: z.string().min(2),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  response: z.enum(["ACCEPTED", "DECLINED", "MAYBE"]),
  message: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (body.invitationId) {
      const data = rsvpByInvitationSchema.parse(body);
      const invitation = await prisma.invitation.findUnique({
        where: { id: data.invitationId },
        include: { event: true },
      });
      if (!invitation) {
        return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
      }

      let guest = await prisma.guest.findFirst({
        where: { invitationId: data.invitationId, name: data.guestName },
      });

      if (!guest) {
        const created = await invitationService.addGuest({
          eventId: invitation.eventId,
          invitationId: invitation.id,
          name: data.guestName,
          email: data.email,
          phone: data.phone,
        });
        guest = created.guest;
      }

      const rsvp = await invitationService.submitRsvp(guest.id, data.response, data.message);
      const { invitationAnalyticsService } = await import("@/services/invitation-os/invitation-analytics.service");
      await invitationAnalyticsService.track({
        eventType: "RSVP_SUBMIT",
        invitationId: invitation.id,
        guestId: guest.id,
      });
      return NextResponse.json({ success: true, data: { rsvp, guestId: guest.id } });
    }

    const data = rsvpByGuestSchema.parse(body);
    const rsvp = await invitationService.submitRsvp(data.guestId, data.response, data.message);
    const guest = await prisma.guest.findUnique({ where: { id: data.guestId } });
    if (guest?.invitationId) {
      const { invitationAnalyticsService } = await import("@/services/invitation-os/invitation-analytics.service");
      await invitationAnalyticsService.track({
        eventType: "RSVP_SUBMIT",
        invitationId: guest.invitationId,
        guestId: guest.id,
      });
    }
    return NextResponse.json({ success: true, data: rsvp });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "RSVP failed" }, { status: 500 });
  }
}
