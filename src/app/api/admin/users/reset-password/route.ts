import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/require-admin";
import { adminService } from "@/services/admin/admin.service";
import { createAuditLog } from "@/lib/audit";
import { assertUserModificationAllowed } from "@/lib/admin-permissions";
import { hasPermission, Permission } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@prisma/client";

const schema = z.object({
  userId: z.string().min(1),
  password: z.string().min(8),
});

export async function POST(req: Request) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!hasPermission({ role: session.user.role as UserRole }, Permission.RESET_USER_PASSWORD)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { userId, password } = schema.parse(await req.json());

    const target = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

    assertUserModificationAllowed(session.user.role as UserRole, target.role);
    await adminService.resetUserPassword(userId, password);

    await createAuditLog({
      userId: session.user.id,
      action: "UPDATE",
      entity: "user",
      entityId: userId,
      details: { action: "password_reset_by_admin" },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Password reset failed" },
      { status: 400 }
    );
  }
}
