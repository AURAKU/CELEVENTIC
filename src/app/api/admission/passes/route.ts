import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { EventPermissionKey } from "@/lib/workspace/permission-keys";
import { createAuditLog } from "@/lib/audit";
import {
  ensureEventPasses,
  ensureInvitationPass,
  regenerateInvitationPass,
  revokeInvitationPass,
} from "@/services/admission/guest-pass.service";
import { clientIp, isFailure, limit, requireActor, requireGate } from "../_guard";

export const dynamic = "force-dynamic";

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("issue_event"), eventId: z.string().min(1) }),
  z.object({ action: z.literal("issue"), invitationId: z.string().min(1) }),
  z.object({
    action: z.literal("regenerate"),
    invitationId: z.string().min(1),
    reason: z.string().trim().min(3).max(500),
  }),
  z.object({
    action: z.literal("revoke"),
    invitationId: z.string().min(1),
    reason: z.string().trim().min(3).max(500),
  }),
]);

async function eventIdFor(payload: z.infer<typeof actionSchema>): Promise<string | null> {
  if (payload.action === "issue_event") return payload.eventId;
  const invitation = await prisma.invitation.findUnique({
    where: { id: payload.invitationId },
    select: { eventId: true },
  });
  return invitation?.eventId ?? null;
}

/** Organiser-side pass lifecycle: issue, regenerate, revoke. */
export async function POST(req: Request) {
  const actor = await requireActor();
  if (isFailure(actor)) {
    return NextResponse.json({ success: false, error: actor.error }, { status: actor.status });
  }

  let payload: z.infer<typeof actionSchema>;
  try {
    payload = actionSchema.parse(await req.json());
  } catch (error) {
    const message = error instanceof z.ZodError ? error.errors[0].message : "Invalid request";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }

  const eventId = await eventIdFor(payload);
  if (!eventId) {
    return NextResponse.json({ success: false, error: "Invitation not found" }, { status: 404 });
  }

  const denied = await requireGate(eventId, actor, EventPermissionKey.MANAGE_GUESTS);
  if (denied) {
    return NextResponse.json({ success: false, error: denied.error }, { status: denied.status });
  }

  const throttled = await limit(`admission-passes:${actor.userId}:${clientIp(req)}`, 60, 60);
  if (throttled) {
    return NextResponse.json({ success: false, error: throttled.error }, { status: throttled.status });
  }

  try {
    if (payload.action === "issue_event") {
      const result = await ensureEventPasses(eventId);
      await createAuditLog({
        userId: actor.userId,
        action: "CREATE",
        entity: "guest_pass",
        entityId: eventId,
        details: { kind: "bulk_issue", ...result },
      });
      return NextResponse.json({ success: true, data: result });
    }

    if (payload.action === "issue") {
      const issued = await ensureInvitationPass(payload.invitationId);
      if (!issued) {
        return NextResponse.json({ success: false, error: "Invitation not found" }, { status: 404 });
      }
      return NextResponse.json({
        success: true,
        data: { code: issued.pass.code, partySize: issued.pass.partySize, status: issued.pass.status },
      });
    }

    if (payload.action === "regenerate") {
      const issued = await regenerateInvitationPass(
        payload.invitationId,
        actor.userId,
        payload.reason
      );
      if (!issued) {
        return NextResponse.json({ success: false, error: "Invitation not found" }, { status: 404 });
      }
      return NextResponse.json({
        success: true,
        data: {
          code: issued.pass.code,
          tokenVersion: issued.pass.tokenVersion,
          status: issued.pass.status,
        },
      });
    }

    const revoked = await revokeInvitationPass(payload.invitationId, actor.userId, payload.reason);
    if (!revoked) {
      return NextResponse.json({ success: false, error: "No active pass to revoke" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: { status: revoked.status } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Pass operation failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
