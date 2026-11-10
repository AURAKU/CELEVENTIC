import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { Permission } from "@/lib/rbac/types";
import { requireCeleCardPermission } from "@/lib/require-admin";
import { bulkActionIsEnabled } from "@/lib/digital-business-card/admin-permissions";
import { previewBulkCeleCardOperation } from "@/services/digital-business-card/admin-command.service";

export const dynamic = "force-dynamic";

const bulkSchema = z.object({
  action: z.enum(["preview", "invite", "notify", "assign_template", "complimentary", "activate", "deactivate"]),
  ids: z.array(z.string().min(1)).min(1).max(500),
  reason: z.string().max(500).optional(),
  confirm: z.boolean().optional(),
  idempotencyKey: z.string().max(80).optional(),
});

export async function POST(req: NextRequest) {
  const session = await requireCeleCardPermission(Permission.CELECARD_VIEW);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = bulkSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid bulk request" }, { status: 400 });
  const correlationId = req.headers.get("x-correlation-id") || parsed.data.idempotencyKey || randomUUID();

  if (parsed.data.action === "preview") {
    const preview = await previewBulkCeleCardOperation(parsed.data);
    return NextResponse.json({ success: true, data: preview, correlationId });
  }

  if (!bulkActionIsEnabled(parsed.data.action) || parsed.data.action === "complimentary" || parsed.data.action === "activate" || parsed.data.action === "deactivate") {
    return NextResponse.json(
      {
        error: "Unrestricted bulk activation and deactivation are not enabled.",
        code: "bulk_not_enabled",
        correlationId,
      },
      { status: 403 }
    );
  }

  if (!parsed.data.confirm) {
    return NextResponse.json({ error: "Confirmation is required.", correlationId }, { status: 400 });
  }
  if (!parsed.data.reason || parsed.data.reason.trim().length < 8) {
    return NextResponse.json({ error: "A reason is required.", correlationId }, { status: 400 });
  }

  return NextResponse.json(
    {
      error: "This bulk operation is prepared but not enabled in this release.",
      code: "bulk_queued_disabled",
      correlationId,
    },
    { status: 403 }
  );
}
