import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isPlatformAdmin } from "@/lib/rbac";
import { getAllBlueprints } from "@/lib/blueprints";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@prisma/client";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !isPlatformAdmin(session.user.role as UserRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [codeBlueprints, dbOverrides] = await Promise.all([
    Promise.resolve(getAllBlueprints()),
    prisma.eventBlueprintConfig.findMany({ where: { isActive: true } }),
  ]);

  return NextResponse.json({
    success: true,
    data: { codeBlueprints, dbOverrides },
  });
}
