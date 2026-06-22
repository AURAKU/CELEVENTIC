import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/require-admin";
import { createAuditLog } from "@/lib/audit";
import { integrationService } from "@/services/admin/integration.service";

/** @deprecated Use /api/admin/integrations — kept for backward compatibility */
export async function GET() {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const integrations = await integrationService.list();
  const data = integrations.map((i) => ({
    provider: i.provider,
    isEnabled: i.isEnabled,
    envConfigured: i.hasEnvFallback,
    updatedAt: i.updatedAt,
  }));

  return NextResponse.json({ success: true, data });
}

export async function PATCH(req: Request) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { provider, isEnabled } = z.object({
      provider: z.string(),
      isEnabled: z.boolean(),
    }).parse(await req.json());

    const integrations = await integrationService.list();
    const row = integrations.find((i) => i.provider === provider);
    if (!row) {
      return NextResponse.json({ error: "Provider not found" }, { status: 404 });
    }

    const updated = await integrationService.update(row.id, { isEnabled });

    await createAuditLog({
      userId: session.user.id,
      action: "UPDATE",
      entity: "api_setting",
      entityId: provider,
      details: { isEnabled },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
