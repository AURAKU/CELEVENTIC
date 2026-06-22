import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { seatingService } from "@/services/seating/seating.service";
import { z } from "zod";

const assignSchema = z.object({
  assignments: z.array(z.object({
    guestId: z.string(),
    tableNumber: z.string(),
    seatLabel: z.string().optional(),
    zone: z.string().optional(),
    notes: z.string().optional(),
  })),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: eventId } = await params;
  const event = await prisma.event.findFirst({
    where: { id: eventId, organizerId: session.user.id },
    select: { id: true },
  });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const plan = await seatingService.getPlanForEvent(eventId);
  if (!plan) return NextResponse.json({ error: "Create a seating plan first" }, { status: 400 });

  try {
    const body = assignSchema.parse(await req.json());
    const results = await seatingService.bulkAssign(plan.id, body.assignments);
    return NextResponse.json({ success: true, data: results });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 400 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: eventId } = await params;
  const event = await prisma.event.findFirst({
    where: { id: eventId, organizerId: session.user.id },
    select: { id: true },
  });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { guestId } = (await req.json()) as { guestId?: string };
  if (!guestId) return NextResponse.json({ error: "guestId required" }, { status: 400 });

  await seatingService.removeAssignment(guestId);
  return NextResponse.json({ success: true });
}
