import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canAccessAdminPanel } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import {
  CELEYOU_CONNECT_FLAGS_KEY,
  getCeleYouConnectFlags,
  mergeCeleYouConnectFlags,
} from "@/lib/celeyou-connect/flags";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  tap_mode_enabled: z.boolean().optional(),
  tap_guest_exchange: z.boolean().optional(),
  connect_two_way_exchange: z.boolean().optional(),
  tap_session_ttl_seconds: z.number().int().min(60).max(900).optional(),
  tap_session_create_limit: z.number().int().min(1).max(40).optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !canAccessAdminPanel(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const flags = await getCeleYouConnectFlags();
  return NextResponse.json({
    success: true,
    data: {
      tap_mode_enabled: flags.tap_mode_enabled,
      tap_guest_exchange: flags.tap_guest_exchange,
      connect_two_way_exchange: flags.connect_two_way_exchange,
      tap_session_ttl_seconds: flags.tap_session_ttl_seconds,
      tap_session_create_limit: flags.tap_session_create_limit,
    },
  });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !canAccessAdminPanel(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid Tap Mode policy" }, { status: 400 });
  const current = await getCeleYouConnectFlags();
  const next = mergeCeleYouConnectFlags({ ...current, ...parsed.data });
  await prisma.adminSetting.upsert({
    where: { key: CELEYOU_CONNECT_FLAGS_KEY },
    create: { key: CELEYOU_CONNECT_FLAGS_KEY, value: next, category: "celeyou" },
    update: { value: next, category: "celeyou" },
  });
  await createAuditLog({
    userId: session.user.id,
    action: "UPDATE",
    entity: "CeleYouTapFlags",
    entityId: CELEYOU_CONNECT_FLAGS_KEY,
  });
  return NextResponse.json({
    success: true,
    data: {
      tap_mode_enabled: next.tap_mode_enabled,
      tap_guest_exchange: next.tap_guest_exchange,
      connect_two_way_exchange: next.connect_two_way_exchange,
      tap_session_ttl_seconds: next.tap_session_ttl_seconds,
      tap_session_create_limit: next.tap_session_create_limit,
    },
  });
}
