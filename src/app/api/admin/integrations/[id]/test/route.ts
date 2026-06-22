import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/require-admin";
import { createAuditLog } from "@/lib/audit";
import { integrationService } from "@/services/admin/integration.service";
import { prisma } from "@/lib/prisma";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const result = await integrationService.testConnection(id);

  const existing = await prisma.apiSetting.findUnique({ where: { id } });
  const prevConfig = (existing?.config as Record<string, unknown>) ?? {};

  await prisma.apiSetting.update({
    where: { id },
    data: {
      config: {
        ...prevConfig,
        lastTestedAt: new Date().toISOString(),
        lastTestStatus: result.ok ? "ok" : "failed",
        lastTestMessage: result.message,
      },
    },
  });

  await createAuditLog({
    userId: session.user.id,
    action: "UPDATE",
    entity: "integration",
    entityId: id,
    details: { test: result },
  });

  return NextResponse.json({ success: true, data: result });
}
