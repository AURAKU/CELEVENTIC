import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { seatingService } from "@/services/seating/seating.service";
import { requireEventPermission } from "@/lib/event-access";
import { EventPermissionKey } from "@/lib/workspace/permission-keys";
import type { SeatingPlanType, UserRole } from "@prisma/client";
import { z } from "zod";

const assignmentItem = z.object({
  guestId: z.string().min(1),
  tableNumber: z.string().trim().min(1).max(80),
  seatLabel: z.string().trim().max(20).optional(),
  zone: z.string().trim().max(80).optional(),
  notes: z.string().trim().max(500).optional(),
});

const assignSchema = z.object({
  planType: z.enum(["RECEPTION", "CEREMONY"]).optional().default("RECEPTION"),
  /** When true, upsert a single assignment (auto-save) instead of full replace. */
  autoSave: z.boolean().optional().default(false),
  assignment: assignmentItem.optional(),
  assignments: z.array(assignmentItem).max(10_000).optional(),
});

async function resolvePlan(eventId: string, planType: SeatingPlanType) {
  const plan = await seatingService.getPlanByType(eventId, planType);
  if (plan) return plan;
  // Auto-create empty draft plan so assignment auto-save can proceed.
  return seatingService.upsertPlan(
    eventId,
    planType === "CEREMONY" ? "Main ceremony" : "Main reception",
    { tables: [], status: "draft", planKind: planType },
    planType
  );
}

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

  try {
    const body = assignSchema.parse(await req.json());
    const plan = await resolvePlan(eventId, body.planType);

    if (body.autoSave) {
      const single = body.assignment ?? body.assignments?.[0];
      if (!single) return NextResponse.json({ error: "assignment required for auto-save" }, { status: 400 });
      const result = await seatingService.upsertGuestAssignment(plan.id, eventId, single);
      return NextResponse.json({ success: true, data: result, autoSaved: true });
    }

    const assignments = body.assignments ?? (body.assignment ? [body.assignment] : []);
    const results = await seatingService.replaceAssignments(plan.id, eventId, assignments);
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

  const body = (await req.json()) as {
    guestId?: string;
    planType?: SeatingPlanType;
  };
  if (!body.guestId) return NextResponse.json({ error: "guestId required" }, { status: 400 });

  const planType = body.planType ?? "RECEPTION";
  const plan = await seatingService.getPlanByType(eventId, planType);
  await seatingService.removeAssignment(body.guestId, plan?.id);
  return NextResponse.json({ success: true });
}
