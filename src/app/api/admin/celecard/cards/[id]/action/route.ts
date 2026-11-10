import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { requireCeleCardPermission } from "@/lib/require-admin";
import { CELECARD_ACTION_PERMISSION, type CeleCardAdminAction } from "@/lib/digital-business-card/admin-permissions";
import {
  applyCeleCardAdminAction,
  CeleCardAdminError,
} from "@/services/digital-business-card/admin-command.service";

export const dynamic = "force-dynamic";

const actionSchema = z.object({
  action: z.enum([
    "activate",
    "deactivate",
    "reactivate",
    "suspend",
    "unsuspend",
    "extend",
    "change_plan",
    "complimentary",
    "promotional",
    "manual",
    "duplicate_design",
    "send_invitation",
    "save_draft",
    "remind_renewal",
  ]),
  reason: z.string().max(500).optional(),
  planId: z.string().max(40).optional(),
  months: z.number().int().min(1).max(36).optional(),
  approvalRef: z.string().max(120).nullable().optional(),
});

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const parsed = actionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  const permission = CELECARD_ACTION_PERMISSION[parsed.data.action as CeleCardAdminAction];
  const session = await requireCeleCardPermission(permission);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const correlationId = req.headers.get("x-correlation-id") || randomUUID();
  try {
    const result = await applyCeleCardAdminAction(
      { id: session.user.id, role: session.user.role },
      {
        cardId: id,
        action: parsed.data.action,
        reason: parsed.data.reason,
        planId: parsed.data.planId,
        months: parsed.data.months,
        approvalRef: parsed.data.approvalRef,
        correlationId,
      }
    );
    return NextResponse.json({ success: true, data: result, correlationId });
  } catch (error) {
    if (error instanceof CeleCardAdminError) {
      return NextResponse.json(
        { error: error.message, code: error.code, correlationId },
        { status: error.status }
      );
    }
    console.error("[celecard.admin.action]", error);
    return NextResponse.json({ error: "Action failed", correlationId }, { status: 500 });
  }
}
