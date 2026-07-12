import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isPlatformAdmin } from "@/lib/rbac";
import { listPermissionDefinitions } from "@/lib/workspace/permission-store";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@prisma/client";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !isPlatformAdmin(session.user.role as UserRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [permissions, roleMappings] = await Promise.all([
    listPermissionDefinitions(),
    prisma.workspaceRolePermission.findMany({ include: { permission: true } }),
  ]);

  return NextResponse.json({ success: true, data: { permissions, roleMappings } });
}
