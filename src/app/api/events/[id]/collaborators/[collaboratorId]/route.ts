import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { collaboratorService } from "@/services/workspace/collaborator.service";
import type { UserRole } from "@prisma/client";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; collaboratorId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id, collaboratorId } = await params;
    const body = await req.json();
    const updated = await collaboratorService.update(
      id,
      collaboratorId,
      session.user.id,
      session.user.role as UserRole,
      body
    );
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Update failed" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; collaboratorId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id, collaboratorId } = await params;
    const updated = await collaboratorService.remove(
      id,
      collaboratorId,
      session.user.id,
      session.user.role as UserRole
    );
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Remove failed" },
      { status: 400 }
    );
  }
}
