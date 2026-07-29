import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { seatingService } from "@/services/seating/seating.service";
import type { SeatingLayout } from "@/services/seating/seating.service";
import { verifyEventAccess } from "@/lib/event-access";
import { z } from "zod";
import { SEATING_GUEST_LIMIT } from "@/lib/pagination";

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
      prisma.guest.findMany({
        where: { eventId, archivedAt: null },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          qrToken: true,
          status: true,
          tagAssignments: {
            orderBy: { tag: { sortOrder: "asc" } },
            select: { tag: { select: { id: true, label: true } } },
          },
        },
        orderBy: { name: "asc" },
        take: SEATING_GUEST_LIMIT,
      }),
      prisma.guest.count({ where: { eventId, archivedAt: null } }),
    ]);
    return NextResponse.json({
      success: true,
      data: {
        plan,
        guests: guests.map((guest) => ({
          id: guest.id,
          name: guest.name,
          email: guest.email,
          phone: guest.phone,
          qrToken: guest.qrToken,
          status: guest.status,
          tags: guest.tagAssignments.map((row) => ({
            id: row.tag.id,
            label: row.tag.label,
          })),
        })),
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
