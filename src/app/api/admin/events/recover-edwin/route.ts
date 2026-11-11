import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperAdminSession } from "@/lib/require-admin";
import { createAuditLog } from "@/lib/audit";
import {
  inspectEdwinLordina,
  restoreEdwinLordina,
  EDWIN_ORIGINAL_EVENT_ID,
} from "@/lib/invitation/recover-edwin-lordina";
import { EDWIN_PUBLIC_INVITE_PATH } from "@/lib/invitation/public-invite-alias";

const bodySchema = z.object({
  confirm: z.literal("edwin-and-lordina"),
  apply: z.boolean().optional(),
});

export async function GET() {
  const session = await requireSuperAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const before = await inspectEdwinLordina();
  return NextResponse.json({
    success: true,
    data: {
      originalEventId: EDWIN_ORIGINAL_EVENT_ID,
      publicPath: EDWIN_PUBLIC_INVITE_PATH,
      events: before.events,
      invitations: before.invitations.map((row) => ({
        id: row.id,
        slug: row.slug,
        status: row.status,
        eventId: row.eventId,
        name: row.name,
      })),
      matchingOrders: before.orders,
      recentDeletes: before.deletes,
    },
  });
}

export async function POST(req: Request) {
  const session = await requireSuperAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = bodySchema.parse(await req.json().catch(() => ({})));
    if (body.apply === false) {
      const before = await inspectEdwinLordina();
      return NextResponse.json({ success: true, data: { mode: "dry-run", ...before } });
    }
    const result = await restoreEdwinLordina();
    await createAuditLog({
      userId: session.user.id,
      action: "CREATE",
      entity: "event",
      entityId: result.eventId,
      details: {
        kind: "edwin_event_recovery",
        invitationId: result.invitationId,
        publicPath: EDWIN_PUBLIC_INVITE_PATH,
        reusedExistingEvent: result.reusedExistingEvent,
      },
    });
    return NextResponse.json({
      success: true,
      data: {
        ...result,
        inviteUrl: `/invite/${EDWIN_PUBLIC_INVITE_PATH}`,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Confirm edwin-and-lordina to restore." }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Restore failed" },
      { status: 500 }
    );
  }
}
