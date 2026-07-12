import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { workspaceProvisionService } from "@/services/entitlements/workspace-provision.service";
import { verifyEventAccess } from "@/lib/event-access";
import type { UserRole } from "@prisma/client";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    await verifyEventAccess(id, session.user.id, session.user.role as UserRole);
    const context = await workspaceProvisionService.getWorkspaceContext(
      id,
      session.user.id,
      session.user.role as UserRole
    );
    return NextResponse.json({ success: true, data: context });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load workspace" },
      { status: 400 }
    );
  }
}
