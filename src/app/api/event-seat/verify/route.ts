import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { eventQrLinkService } from "@/services/qr-hub/event-qr-link.service";
import { normalizeAdmissionCode } from "@/lib/admission/pass-code";
import { pickSeatingAssignment } from "@/lib/seating/assignment-pick";

export const dynamic = "force-dynamic";

/**
 * Privacy-safe seating lookup: requires event seating QR token + personal pass code.
 * Never returns other guests or a seating list.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const publicToken = typeof body?.publicToken === "string" ? body.publicToken : null;
  const codeRaw = typeof body?.code === "string" ? body.code : "";
  const code = normalizeAdmissionCode(codeRaw);

  if (!publicToken || code.length < 4) {
    return NextResponse.json({ error: "Pass code is required" }, { status: 400 });
  }

  const link = await eventQrLinkService.getByToken(publicToken);
  if (!link || link.type !== "SEATING_LOOKUP" || link.status !== "ACTIVE") {
    return NextResponse.json({ error: "Seating lookup is not available" }, { status: 404 });
  }

  const pass = await prisma.guestPass.findFirst({
    where: { eventId: link.eventId, code },
    select: {
      id: true,
      displayName: true,
      invitationId: true,
      invitation: {
        select: {
          name: true,
          guests: {
            where: { archivedAt: null },
            select: {
              id: true,
              name: true,
              invitationId: true,
              seatingAssignments: {
                select: {
                  tableNumber: true,
                  seatLabel: true,
                  zone: true,
                  seatingPlan: { select: { planType: true, name: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!pass) {
    return NextResponse.json({ error: "We could not match that pass code for this event" }, { status: 404 });
  }

  // Prefer the invitation party label — never a foreign GuestPass.displayName
  // that may have been polluted by a cross-party mislink.
  const partyGuests = pass.invitation.guests.filter(
    (g) => !g.invitationId || g.invitationId === pass.invitationId
  );
  const primaryGuest = partyGuests[0];
  const assignments = primaryGuest?.seatingAssignments ?? [];
  const reception = pickSeatingAssignment(assignments, "RECEPTION");
  const ceremony = pickSeatingAssignment(assignments, "CEREMONY");

  return NextResponse.json({
    success: true,
    data: {
      guestName:
        pass.invitation.name?.trim() ||
        primaryGuest?.name?.trim() ||
        pass.displayName?.trim() ||
        "Guest",
      eventTitle: link.event.title,
      tableNumber: reception?.tableNumber ?? null,
      seatLabel: reception?.seatLabel ?? null,
      zone: reception?.zone ?? null,
      ceremonyRowLabel: ceremony?.tableNumber ?? null,
      ceremonySeatLabel: ceremony?.seatLabel ?? null,
    },
  });
}
