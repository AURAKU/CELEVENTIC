import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveInvitationAllowance } from "@/lib/admission/admission-logic";
import { invitationService } from "@/services/invitations/invitation.service";
import {
  isOpenHostInvitation,
  notifyOrganizersOfDuplicateGuest,
  registerOpenHostRsvp,
} from "@/services/guest-search/rsvp-self-registration.service";
import { DuplicateGuestError } from "@/lib/guest-search/duplicate-guests";

const rsvpByGuestSchema = z.object({
  guestId: z.string(),
  response: z.enum(["ACCEPTED", "DECLINED", "MAYBE"]),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  message: z.string().optional(),
  /** Heads attending, capped to the organiser admission allowance. */
  attendingCount: z.number().int().positive().optional(),
});

const rsvpByInvitationSchema = z.object({
  invitationId: z.string(),
  guestName: z.string().min(2),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  response: z.enum(["ACCEPTED", "DECLINED", "MAYBE"]),
  message: z.string().optional(),
  attendingCount: z.number().int().positive().optional(),
});

async function loadInvitationAllowance(invitationId: string) {
  const invitation = await prisma.invitation.findUnique({
    where: { id: invitationId },
    select: {
      id: true,
      admissionAllowance: true,
      guests: { select: { id: true, name: true, plusOnes: true } },
      guestPasses: {
        where: {
          status: {
            in: [
              "ACTIVE",
              "PARTIALLY_ADMITTED",
              "ADMITTED",
              "PENDING_SYNC",
              "CONFLICT",
              "MANUAL_REVIEW",
            ],
          },
        },
        orderBy: { tokenVersion: "desc" },
        take: 1,
        select: { partySize: true },
      },
    },
  });
  if (!invitation) return null;
  const allowance = resolveInvitationAllowance(
    invitation.guests,
    invitation.admissionAllowance,
    invitation.guestPasses[0]?.partySize
  );
  return { invitation, allowance };
}

/**
 * Persist an attending head-count within the organiser allowance without
 * raising Invitation.admissionAllowance (gate capacity stays organiser-owned).
 */
async function applyAttendingCount(input: {
  invitationId: string;
  guestId: string;
  attendingCount: number;
  allowance: number;
  response: "ACCEPTED" | "DECLINED" | "MAYBE";
}) {
  if (input.response !== "ACCEPTED") return;
  const attending = Math.max(1, Math.min(input.attendingCount, input.allowance));
  const members = await prisma.guest.findMany({
    where: { invitationId: input.invitationId, archivedAt: null },
    select: { id: true, plusOnes: true },
    orderBy: { createdAt: "asc" },
  });
  if (!members.length) return;

  const primaryId = members[0]!.id;
  const targetId = members.some((m) => m.id === input.guestId) ? input.guestId : primaryId;
  const otherNamed = Math.max(0, members.length - 1);
  const plusOnes = Math.max(0, attending - 1 - otherNamed);

  await prisma.$transaction(
    members.map((member) =>
      prisma.guest.update({
        where: { id: member.id },
        data: { plusOnes: member.id === targetId ? plusOnes : 0 },
      })
    )
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (body.invitationId) {
      const data = rsvpByInvitationSchema.parse(body);
      const invitation = await prisma.invitation.findUnique({
        where: { id: data.invitationId },
        select: {
          id: true,
          name: true,
          isGeneralPass: true,
          eventId: true,
          event: { select: { title: true } },
          guests: {
            where: { archivedAt: null },
            select: { id: true, name: true },
          },
        },
      });
      if (!invitation) {
        return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
      }

      const openHost = isOpenHostInvitation({
        name: invitation.name,
        isGeneralPass: invitation.isGeneralPass,
        eventTitle: invitation.event.title,
        guests: invitation.guests,
      });

      // General / template RSVP → mint a personalised invitation + guest card.
      if (openHost) {
        const registered = await registerOpenHostRsvp({
          sourceInvitationId: invitation.id,
          guestName: data.guestName,
          email: data.email,
          phone: data.phone,
          partySize: data.attendingCount ?? 1,
        });

        if (data.attendingCount != null) {
          await applyAttendingCount({
            invitationId: registered.invitationId,
            guestId: registered.guestId,
            attendingCount: data.attendingCount,
            allowance: registered.allowance,
            response: data.response,
          });
        }

        const rsvp = await invitationService.submitRsvp(
          registered.guestId,
          data.response,
          data.message
        );

        if (registered.duplicates.length) {
          await notifyOrganizersOfDuplicateGuest({
            eventId: registered.eventId,
            eventTitle: registered.eventTitle,
            organizerId: registered.organizerId,
            organizerEmail: registered.organizerEmail,
            collaboratorUserIds: registered.collaboratorUserIds,
            collaboratorEmails: registered.collaboratorEmails,
            guestName: data.guestName,
            guestId: registered.guestId,
            invitationId: registered.invitationId,
            duplicates: registered.duplicates,
          }).catch((error) => {
            console.error("[rsvp] duplicate notify failed", error);
          });
        }

        const { invitationAnalyticsService } = await import(
          "@/services/invitation-os/invitation-analytics.service"
        );
        await invitationAnalyticsService.track({
          eventType: "RSVP_SUBMIT",
          invitationId: registered.invitationId,
          guestId: registered.guestId,
        });

        return NextResponse.json({
          success: true,
          data: {
            rsvp,
            guestId: registered.guestId,
            invitationId: registered.invitationId,
            inviteUrl: registered.inviteUrl,
            invitePath: registered.invitePath,
            allowance: registered.allowance,
            duplicateWarning: registered.duplicates.length > 0,
          },
        });
      }

      // Personalised party RSVP by invitation id (rare): stay within allowance.
      const allowanceInfo = await loadInvitationAllowance(invitation.id);
      if (!allowanceInfo) {
        return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
      }
      const { allowance } = allowanceInfo;
      const normalizedName = data.guestName.trim().toLocaleLowerCase();

      const members = await prisma.guest.findMany({
        where: { invitationId: data.invitationId, archivedAt: null },
        select: { id: true, name: true, email: true, phone: true },
      });
      const matched =
        members.find((m) => m.name.trim().toLocaleLowerCase() === normalizedName) ?? null;

      let guest = matched
        ? await prisma.guest.findUnique({ where: { id: matched.id } })
        : null;

      if (!guest) {
        if (members.length >= allowance) {
          return NextResponse.json(
            {
              error:
                allowance === 1
                  ? "This invitation admits only the invited guest. Use the invited name to RSVP."
                  : `This invitation admits ${allowance} people and already has its full party. Use an invited name to RSVP.`,
            },
            { status: 400 }
          );
        }
        try {
          const created = await invitationService.addGuest({
            eventId: invitation.eventId,
            invitationId: invitation.id,
            name: data.guestName,
            email: data.email,
            phone: data.phone,
            plusOnes: 0,
          });
          guest = created.guest;
        } catch (error) {
          if (error instanceof DuplicateGuestError) {
            return NextResponse.json(
              {
                error: error.message,
                code: "DUPLICATE_GUEST",
                duplicates: error.duplicates,
              },
              { status: 409 }
            );
          }
          throw error;
        }
      } else if (data.email || data.phone) {
        guest = await prisma.guest.update({
          where: { id: guest.id },
          data: {
            ...(data.email ? { email: data.email } : {}),
            ...(data.phone ? { phone: data.phone } : {}),
          },
        });
      }

      if (data.attendingCount != null) {
        await applyAttendingCount({
          invitationId: invitation.id,
          guestId: guest.id,
          attendingCount: data.attendingCount,
          allowance,
          response: data.response,
        });
      }

      const rsvp = await invitationService.submitRsvp(guest.id, data.response, data.message);
      const { invitationAnalyticsService } = await import(
        "@/services/invitation-os/invitation-analytics.service"
      );
      await invitationAnalyticsService.track({
        eventType: "RSVP_SUBMIT",
        invitationId: invitation.id,
        guestId: guest.id,
      });
      return NextResponse.json({
        success: true,
        data: { rsvp, guestId: guest.id, allowance },
      });
    }

    const data = rsvpByGuestSchema.parse(body);
    const guestRow = await prisma.guest.findUnique({
      where: { id: data.guestId },
      select: { id: true, invitationId: true },
    });
    if (!guestRow) {
      return NextResponse.json({ error: "Guest not found" }, { status: 404 });
    }

    if (data.email || data.phone) {
      await prisma.guest.update({
        where: { id: data.guestId },
        data: {
          ...(data.email ? { email: data.email } : {}),
          ...(data.phone ? { phone: data.phone } : {}),
        },
      });
    }

    let allowance = 1;
    if (guestRow.invitationId && data.attendingCount != null) {
      const info = await loadInvitationAllowance(guestRow.invitationId);
      if (info) {
        allowance = info.allowance;
        await applyAttendingCount({
          invitationId: guestRow.invitationId,
          guestId: guestRow.id,
          attendingCount: data.attendingCount,
          allowance,
          response: data.response,
        });
      }
    } else if (guestRow.invitationId) {
      const info = await loadInvitationAllowance(guestRow.invitationId);
      if (info) allowance = info.allowance;
    }

    const rsvp = await invitationService.submitRsvp(data.guestId, data.response, data.message);
    if (guestRow.invitationId) {
      const { invitationAnalyticsService } = await import(
        "@/services/invitation-os/invitation-analytics.service"
      );
      await invitationAnalyticsService.track({
        eventType: "RSVP_SUBMIT",
        invitationId: guestRow.invitationId,
        guestId: guestRow.id,
      });
    }
    return NextResponse.json({ success: true, data: { rsvp, allowance } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    if (error instanceof DuplicateGuestError) {
      return NextResponse.json(
        {
          error: error.message,
          code: "DUPLICATE_GUEST",
          duplicates: error.duplicates,
        },
        { status: 409 }
      );
    }
    if (error instanceof Error && error.message === "NOT_OPEN_HOST") {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "RSVP failed" },
      { status: 500 }
    );
  }
}
