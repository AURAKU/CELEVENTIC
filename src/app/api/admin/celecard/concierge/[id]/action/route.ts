import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Permission } from "@/lib/rbac/types";
import { requireCeleCardPermission } from "@/lib/require-admin";
import {
  applyConciergeAdminAction,
  CeleCardAdminError,
} from "@/services/digital-business-card/concierge.service";

export const dynamic = "force-dynamic";

const schema = z.object({
  action: z.enum(["assign", "start", "fulfill", "deliver", "cancel", "waive"]),
  reason: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
  cardId: z.string().optional(),
});

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireCeleCardPermission(Permission.CELECARD_CREATE);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  const { id } = await ctx.params;
  try {
    const data = await applyConciergeAdminAction(
      { id: session.user.id, role: session.user.role },
      { orderId: id, ...parsed.data }
    );
    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (error instanceof CeleCardAdminError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error("[celecard.concierge.action]", error);
    return NextResponse.json({ error: "Concierge action failed" }, { status: 500 });
  }
}
