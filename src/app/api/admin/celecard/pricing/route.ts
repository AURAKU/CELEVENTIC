import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Permission } from "@/lib/rbac/types";
import { requireCeleCardPermission } from "@/lib/require-admin";
import { createAuditLog } from "@/lib/audit";
import {
  getCeleCardCatalog,
  isMaterialCeleCardPricingChange,
  listCeleCardPricingHistory,
  upsertCeleCardCatalog,
} from "@/services/digital-business-card/catalog.service";

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
  confirm: z.boolean().optional(),
});

export async function GET() {
  const session = await requireCeleCardPermission(Permission.CELECARD_VIEW);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const [catalog, history] = await Promise.all([getCeleCardCatalog(), listCeleCardPricingHistory()]);
  return NextResponse.json({ success: true, data: { ...catalog, history } });
}

export async function PATCH(req: NextRequest) {
  const session = await requireCeleCardPermission(Permission.CELECARD_PRICING_MANAGE);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid catalog" }, { status: 400 });
  const previous = await getCeleCardCatalog();
  const proposed = {
    planPrices: { ...previous.planPrices, ...parsed.data.planPrices },
    conciergePriceGhs: parsed.data.conciergePriceGhs ?? previous.conciergePriceGhs,
    conciergeBundledPlanId: parsed.data.conciergeBundledPlanId ?? previous.conciergeBundledPlanId,
  };
  if (isMaterialCeleCardPricingChange(previous, proposed) && parsed.data.confirm !== true) {
    return NextResponse.json(
      {
        error: "Confirm this catalog change. Settled payments will not be rewritten.",
        code: "CONFIRM_PRICING",
      },
      { status: 409 }
    );
  }
  const catalog = await upsertCeleCardCatalog(parsed.data, session.user.id);
  await createAuditLog({
    userId: session.user.id,
    action: "UPDATE",
    entity: "celecard_catalog",
    entityId: "default",
    details: {
      kind: "pricing_update",
      previous: {
        planPrices: previous.planPrices,
        conciergePriceGhs: previous.conciergePriceGhs,
      },
      next: {
        planPrices: catalog.planPrices,
        conciergePriceGhs: catalog.conciergePriceGhs,
      },
    },
  });
  const history = await listCeleCardPricingHistory();
  return NextResponse.json({ success: true, data: { ...catalog, history } });
}
