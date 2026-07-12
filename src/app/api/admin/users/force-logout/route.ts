import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/require-admin";
import { forceLogoutUser } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { assertUserModificationAllowed } from "@/lib/admin-permissions";
import { hasPermission, Permission } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@prisma/client";

const schema = z.object({ userId: z.string().min(1) });

export async function POST(req: Request) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!hasPermission({ role: session.user.role as UserRole }, Permission.FORCE_USER_LOGOUT)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { userId } = schema.parse(await req.json());
    if (userId === session.user.id) {
      return NextResponse.json({ error: "Cannot force-logout yourself" }, { status: 400 });
    }

    const target = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

    assertUserModificationAllowed(session.user.role as UserRole, target.role);
    await forceLogoutUser(userId);

    await createAuditLog({
      userId: session.user.id,
      action: "UPDATE",
      entity: "user",
      entityId: userId,
      details: { action: "force_logout" },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Force logout failed" },
      { status: 400 }
    );
  }
}
