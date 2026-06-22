import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/require-admin";
import { createAuditLog } from "@/lib/audit";
import { integrationService } from "@/services/admin/integration.service";

const updateSchema = z.object({
  label: z.string().min(1).optional(),
  category: z
    .enum([
      "payments", "communications", "ai", "maps", "storage",
      "auth", "analytics", "infrastructure", "custom",
    ])
    .optional(),
  description: z.string().optional(),
  secret: z.string().optional(),
  publicKey: z.string().optional(),
  webhookUrl: z.string().url().optional().or(z.literal("")),
  config: z.record(z.unknown()).optional(),
  isEnabled: z.boolean().optional(),
  clearSecret: z.boolean().optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const integration = await integrationService.getById(id);
  if (!integration) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ success: true, data: integration });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  try {
    const body = updateSchema.parse(await req.json());

    if (body.clearSecret) {
      const integration = await integrationService.clearSecret(id);
      await createAuditLog({
        userId: session.user.id,
        action: "UPDATE",
        entity: "integration",
        entityId: id,
        details: { action: "clear_secret" },
      });
      return NextResponse.json({ success: true, data: integration });
    }

    const integration = await integrationService.update(id, {
      ...body,
      webhookUrl: body.webhookUrl === "" ? "" : body.webhookUrl,
    });

    await createAuditLog({
      userId: session.user.id,
      action: "UPDATE",
      entity: "integration",
      entityId: id,
      details: { provider: integration.provider, isEnabled: integration.isEnabled },
    });

    return NextResponse.json({ success: true, data: integration });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Update failed" },
      { status: 400 }
    );
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  try {
    const removed = await integrationService.remove(id);
    await createAuditLog({
      userId: session.user.id,
      action: "DELETE",
      entity: "integration",
      entityId: id,
      details: removed,
    });
    return NextResponse.json({ success: true, data: removed });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Delete failed" },
      { status: 400 }
    );
  }
}
