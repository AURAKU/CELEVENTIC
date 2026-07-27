import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { EventPermissionKey } from "@/lib/workspace/permission-keys";
import { listConflicts, resolveConflict } from "@/services/admission/offline-admission.service";
import { clientIp, isFailure, limit, requireActor, requireGate } from "../_guard";

export const dynamic = "force-dynamic";

/** Passes flagged for organiser review after an offline sync disagreement. */
export async function GET(req: Request) {
  const actor = await requireActor();
  if (isFailure(actor)) {
    return NextResponse.json({ success: false, error: actor.error }, { status: actor.status });
  }

  const eventId = new URL(req.url).searchParams.get("eventId");
  if (!eventId) {
    return NextResponse.json({ success: false, error: "eventId is required" }, { status: 400 });
  }

  const denied = await requireGate(eventId, actor, EventPermissionKey.MANAGE_GUESTS);
  if (denied) {
    return NextResponse.json({ success: false, error: denied.error }, { status: denied.status });
  }

  return NextResponse.json({ success: true, data: await listConflicts(eventId) });
}

const resolveSchema = z.object({
  passId: z.string().min(1),
  resolution: z.enum(["accept", "reject"]),
  reason: z.string().trim().min(3).max(500),
});

export async function POST(req: Request) {
  const actor = await requireActor();
  if (isFailure(actor)) {
    return NextResponse.json({ success: false, error: actor.error }, { status: actor.status });
  }

  let payload: z.infer<typeof resolveSchema>;
  try {
    payload = resolveSchema.parse(await req.json());
  } catch (error) {
    const message = error instanceof z.ZodError ? error.errors[0].message : "Invalid request";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }

  const pass = await prisma.guestPass.findUnique({
    where: { id: payload.passId },
    select: { eventId: true },
  });
  if (!pass) {
    return NextResponse.json({ success: false, error: "Pass not found" }, { status: 404 });
  }

  const denied = await requireGate(pass.eventId, actor, EventPermissionKey.MANAGE_GUESTS);
  if (denied) {
    return NextResponse.json({ success: false, error: denied.error }, { status: denied.status });
  }

  const throttled = await limit(`admission-conflict:${actor.userId}:${clientIp(req)}`, 60, 60);
  if (throttled) {
    return NextResponse.json({ success: false, error: throttled.error }, { status: throttled.status });
  }

  try {
    const updated = await resolveConflict(
      payload.passId,
      actor.userId,
      payload.resolution,
      payload.reason
    );
    return NextResponse.json({ success: true, data: { status: updated.status } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not resolve conflict";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
