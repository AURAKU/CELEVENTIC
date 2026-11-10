import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canAccessAdminPanel } from "@/lib/rbac";
import {
  getCeleCardLifecyclePolicy,
  setCardAdminSuspension,
  upsertCeleCardLifecyclePolicy,
} from "@/services/digital-business-card/lifecycle-policy.service";
import { getCeleCardCommandOverview } from "@/services/digital-business-card/admin-command.service";
import { createAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

const policySchema = z.object({
  gracePeriodDays: z.number().int().min(0).max(30).optional(),
  expiringSoonDays: z.number().int().min(1).max(60).optional(),
  reminderOffsetsDays: z.array(z.number().int().min(-90).max(60)).optional(),
  reconnectBatchHours: z.number().int().min(1).max(72).optional(),
  designVaultMax: z.number().int().min(5).max(200).optional(),
});

const suspendSchema = z.object({
  cardId: z.string().min(1),
  suspend: z.boolean(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !canAccessAdminPanel(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const [policy, overview] = await Promise.all([getCeleCardLifecyclePolicy(), getCeleCardCommandOverview()]);
  return NextResponse.json({ success: true, data: { policy, overview } });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !canAccessAdminPanel(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const parsed = policySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid policy" }, { status: 400 });
  const row = await upsertCeleCardLifecyclePolicy(parsed.data, session.user.id);
  return NextResponse.json({ success: true, data: row });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !canAccessAdminPanel(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const parsed = suspendSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const card = await setCardAdminSuspension(parsed.data.cardId, parsed.data.suspend);
  if (!card) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await createAuditLog({
    userId: session.user.id,
    action: parsed.data.suspend ? "SUSPEND" : "REACTIVATE",
    entity: "celecard",
    entityId: parsed.data.cardId,
    details: { kind: parsed.data.suspend ? "suspend" : "unsuspend", legacyEndpoint: true },
  });
  return NextResponse.json({ success: true, data: { id: card.id, adminSuspendedAt: card.adminSuspendedAt } });
}
