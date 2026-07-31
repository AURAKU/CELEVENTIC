import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { seatingService } from "@/services/seating/seating.service";
import { requireEventPermission } from "@/lib/event-access";
import { EventPermissionKey } from "@/lib/workspace/permission-keys";
import type { UserRole } from "@prisma/client";
import { z } from "zod";

const assignSchema = z.object({
  assignments: z
    .array(
      z.object({
        guestId: z.string().min(1),
        tableNumber: z.string().trim().min(1).max(80),
        seatLabel: z.string().trim().max(20).optional(),
        zone: z.string().trim().max(80).optional(),
        notes: z.string().trim().max(500).optional(),
      })
    )
    .max(10_000),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: eventId } = await params;
  try {
    await requireEventPermission(
      eventId,
      session.user.id,
      session.user.role as UserRole,
      EventPermissionKey.EDIT_SEATING
    );
  } catch {
    return NextResponse.json({ error: "You do not have permission to edit seating" }, { status: 403 });
  }

  const plan = await seatingService.getPlanForEvent(eventId);
  if (!plan) return NextResponse.json({ error: "Create a seating plan first" }, { status: 400 });

  try {
    const body = assignSchema.parse(await req.json());
    const results = await seatingService.replaceAssignments(plan.id, eventId, body.assignments);
    return NextResponse.json({ success: true, data: results });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 400 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: eventId } = await params;
  try {
    await requireEventPermission(
      eventId,
      session.user.id,
      session.user.role as UserRole,
      EventPermissionKey.EDIT_SEATING
    );
  } catch {
    return NextResponse.json({ error: "You do not have permission to edit seating" }, { status: 403 });
  }

  const { guestId } = (await req.json()) as { guestId?: string };
  if (!guestId) return NextResponse.json({ error: "guestId required" }, { status: 400 });

  await seatingService.removeAssignment(guestId);
  return NextResponse.json({ success: true });
}
