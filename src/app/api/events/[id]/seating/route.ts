import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { seatingService } from "@/services/seating/seating.service";
import type { SeatingLayout } from "@/services/seating/seating.service";
import { verifyEventAccess } from "@/lib/event-access";
import { z } from "zod";
import { SEATING_GUEST_BATCH, SEATING_GUEST_LIMIT } from "@/lib/pagination";

const seatingGuestSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  qrToken: true,
  status: true,
  plusOnes: true,
  invitationId: true,
  invitation: {
    select: {
      admittedCount: true,
      admissionAllowance: true,
      admissionState: true,
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
        orderBy: { tokenVersion: "desc" as const },
        take: 1,
        select: {
          partySize: true,
          admittedCount: true,
          status: true,
        },
      },
    },
  },
  tagAssignments: {
    orderBy: { tag: { sortOrder: "asc" as const } },
    select: { tag: { select: { id: true, label: true } } },
  },
} as const;

/** Load every active guest for the event — organizers must not lose roster rows to a silent cap. */
async function loadAllSeatingGuests(eventId: string) {
  type SeatingGuest = Awaited<
    ReturnType<
      typeof prisma.guest.findMany<{ select: typeof seatingGuestSelect }>
    >
  >[number];
  const guests: SeatingGuest[] = [];
  let cursor: string | undefined;
  while (guests.length < SEATING_GUEST_LIMIT) {
    const batch = await prisma.guest.findMany({
      where: { eventId, archivedAt: null },
      select: seatingGuestSelect,
      orderBy: [{ name: "asc" }, { id: "asc" }],
      take: Math.min(SEATING_GUEST_BATCH, SEATING_GUEST_LIMIT - guests.length),
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });
    if (batch.length === 0) break;
    guests.push(...batch);
    cursor = batch[batch.length - 1]?.id;
    if (batch.length < SEATING_GUEST_BATCH) break;
  }
  return guests;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: eventId } = await params;
  try {
    await verifyEventAccess(eventId, session.user.id, session.user.role);
    const plan = await seatingService.getPlanForEvent(eventId);
    const [guests, guestTotal] = await Promise.all([
      loadAllSeatingGuests(eventId),
      prisma.guest.count({ where: { eventId, archivedAt: null } }),
    ]);
    return NextResponse.json({
      success: true,
      data: {
        plan,
        guests: guests.map((guest) => {
          const pass = guest.invitation?.guestPasses[0];
          const allowance = guest.invitation
            ? Math.max(
                1,
                pass?.partySize ??
                  guest.invitation.admissionAllowance ??
                  1 + Math.max(0, guest.plusOnes)
              )
            : 1 + Math.max(0, guest.plusOnes);
          const admittedCount = Math.min(
            allowance,
            Math.max(0, pass?.admittedCount ?? guest.invitation?.admittedCount ?? 0)
          );
          const admissionState =
            admittedCount <= 0
              ? "NOT_ADMITTED"
              : admittedCount >= allowance
                ? "ADMITTED"
                : "PARTIALLY_ADMITTED";

          return {
            id: guest.id,
            name: guest.name,
            email: guest.email,
            phone: guest.phone,
            qrToken: guest.qrToken,
            status: guest.status,
            plusOnes: guest.plusOnes,
            invitationId: guest.invitationId,
            admission: guest.invitation
              ? {
                  allowance,
                  admittedCount,
                  remainingCount: Math.max(0, allowance - admittedCount),
                  state: admissionState,
                }
              : null,
            tags: guest.tagAssignments.map((row) => ({
              id: row.tag.id,
              label: row.tag.label,
            })),
          };
        }),
        guestTotal,
        guestsTruncated: guestTotal > guests.length,
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

const upsertSchema = z.object({
  name: z.string().min(1),
  layout: z.object({
    tables: z.array(
      z.object({
        id: z.string(),
        label: z.string(),
        zone: z.string().optional(),
        capacity: z.number().optional(),
        shape: z.enum(["round", "square", "rectangle"]).optional(),
        seatCount: z.number().min(2).max(20).optional(),
        x: z.number().optional(),
        y: z.number().optional(),
      })
    ),
    notes: z.string().optional(),
    expectedGuests: z.number().optional(),
  }),
});

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: eventId } = await params;
  try {
    await verifyEventAccess(eventId, session.user.id, session.user.role);
    const body = upsertSchema.parse(await req.json());
    const plan = await seatingService.upsertPlan(eventId, body.name, body.layout as SeatingLayout);
    return NextResponse.json({ success: true, data: plan });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 400 });
  }
}
