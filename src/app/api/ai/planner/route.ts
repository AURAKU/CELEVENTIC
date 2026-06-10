import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { eventPlanService } from "@/services/ai/event-plan.service";
import { verifyEventAccess } from "@/lib/event-access";

const plannerSchema = z.object({
  eventType: z.string(),
  expectedGuests: z.number().positive(),
  budget: z.number().optional(),
  date: z.string(),
  eventId: z.string().optional(),
  eventTitle: z.string().optional(),
  location: z.string().optional(),
  venue: z.string().optional(),
  currency: z.string().optional(),
  eventGoal: z.string().optional(),
  style: z.string().optional(),
  culturalPref: z.string().optional(),
  isTicketed: z.boolean().optional(),
  isIndoor: z.boolean().optional(),
  hostDetails: z.string().optional(),
  regenerate: z.boolean().optional(),
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
    const plan = await eventPlanService.getPlanByEvent(eventId, session.user.id);
    return NextResponse.json({ success: true, data: plan });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Access denied" },
      { status: 403 }
    );
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = plannerSchema.parse(body);

    if (data.eventId) {
      await verifyEventAccess(data.eventId, session.user.id, session.user.role);
    }

    const plan = await eventPlanService.generateAndSave({
      ...data,
      userId: session.user.id,
    });

    return NextResponse.json({ success: true, data: plan });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "AI planner failed" }, { status: 500 });
  }
}

const patchSchema = z.discriminatedUnion("entity", [
  z.object({
    entity: z.literal("checklist"),
    itemId: z.string(),
    task: z.string().optional(),
    status: z.enum(["pending", "in_progress", "done"]).optional(),
    priority: z.string().optional(),
  }),
  z.object({
    entity: z.literal("budget"),
    itemId: z.string(),
    category: z.string().optional(),
    estimatedAmount: z.number().optional(),
    notes: z.string().optional(),
    priority: z.string().optional(),
  }),
  z.object({
    entity: z.literal("timeline"),
    itemId: z.string(),
    title: z.string().optional(),
    dueDate: z.string().optional(),
    status: z.string().optional(),
    priority: z.string().optional(),
  }),
]);

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = patchSchema.parse(body);

    if (data.entity === "checklist") {
      const updated = await eventPlanService.updateChecklistItem(
        data.itemId,
        { task: data.task, status: data.status, priority: data.priority },
        session.user.id,
        session.user.role
      );
      return NextResponse.json({ success: true, data: updated });
    }

    if (data.entity === "budget") {
      const updated = await eventPlanService.updateBudgetItem(
        data.itemId,
        { category: data.category, estimatedAmount: data.estimatedAmount, notes: data.notes, priority: data.priority },
        session.user.id,
        session.user.role
      );
      return NextResponse.json({ success: true, data: updated });
    }

    const updated = await eventPlanService.updateTimelineItem(
      data.itemId,
      { title: data.title, dueDate: data.dueDate, status: data.status, priority: data.priority },
      session.user.id,
      session.user.role
    );
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
