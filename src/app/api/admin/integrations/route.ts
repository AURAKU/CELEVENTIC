import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/require-admin";
import { createAuditLog } from "@/lib/audit";
import { integrationService } from "@/services/admin/integration.service";
import { INTEGRATION_CATALOG } from "@/lib/integrations/integration-catalog";

export async function GET() {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [integrations, catalog] = await Promise.all([
    integrationService.list(),
    Promise.resolve(INTEGRATION_CATALOG),
  ]);

  return NextResponse.json({ success: true, data: { integrations, catalog } });
}

const createSchema = z.object({
  label: z.string().min(1),
  category: z.enum([
    "payments", "communications", "ai", "maps", "storage",
    "auth", "analytics", "infrastructure", "custom",
  ]),
  description: z.string().optional(),
  secret: z.string().optional(),
  publicKey: z.string().optional(),
  webhookUrl: z.string().url().optional().or(z.literal("")),
  config: z.record(z.unknown()).optional(),
  isEnabled: z.boolean().optional(),
  fromCatalog: z.string().optional(),
  provider: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = createSchema.parse(await req.json());
    const integration = await integrationService.create({
      ...body,
      webhookUrl: body.webhookUrl || undefined,
    });

    await createAuditLog({
      userId: session.user.id,
      action: "CREATE",
      entity: "integration",
      entityId: integration.id,
      details: { provider: integration.provider },
    });

    return NextResponse.json({ success: true, data: integration });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Create failed" },
      { status: 400 }
    );
  }
}
