import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Permission } from "@/lib/rbac/types";
import { requireCeleCardPermission } from "@/lib/require-admin";
import { createAuditLog } from "@/lib/audit";
import { getCeleCardCatalog, upsertCeleCardCatalog } from "@/services/digital-business-card/catalog.service";

export const dynamic = "force-dynamic";

const schema = z.object({
  planPrices: z
    .object({
      monthly: z.number().int().min(1).max(20000).optional(),
      quarter: z.number().int().min(1).max(20000).optional(),
      half: z.number().int().min(1).max(20000).optional(),
      yearly: z.number().int().min(1).max(20000).optional(),
    })
    .optional(),
  conciergePriceGhs: z.number().int().min(1).max(20000).optional(),
  conciergeBundledPlanId: z.enum(["monthly", "quarter", "half", "yearly"]).optional(),
});

export async function GET() {
  const session = await requireCeleCardPermission(Permission.CELECARD_VIEW);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const catalog = await getCeleCardCatalog();
  return NextResponse.json({ success: true, data: catalog });
}

export async function PATCH(req: NextRequest) {
  const session = await requireCeleCardPermission(Permission.CELECARD_PRICING_MANAGE);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid catalog" }, { status: 400 });
  const previous = await getCeleCardCatalog();
  const catalog = await upsertCeleCardCatalog(parsed.data, session.user.id);
  await createAuditLog({
    userId: session.user.id,
    action: "UPDATE",
    entity: "celecard_catalog",
    entityId: "default",
    details: { kind: "pricing_update", previous: previous.planPrices, next: catalog.planPrices },
  });
  return NextResponse.json({ success: true, data: catalog });
}
