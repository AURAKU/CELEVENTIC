import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { templateEngineService } from "@/services/template-engine/template-engine.service";
import { isAdminRole } from "@/lib/roles";
import type { UserRole } from "@prisma/client";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const template = await templateEngineService.getById(id);
  if (!template) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true, data: template });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const isAdmin = isAdminRole(session.user.role as UserRole);

  const template = await templateEngineService.getById(id);
  if (!template) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!isAdmin && template.createdById !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const allowedFields = isAdmin
    ? body
    : {
        name: body.name,
        blocks: body.blocks,
        canvas: body.canvas,
        colorPalette: body.colorPalette,
        fontPairing: body.fontPairing,
      };

  const updated = await templateEngineService.update(id, allowedFields);
  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const isAdmin = isAdminRole(session.user.role as UserRole);
  const template = await templateEngineService.getById(id);
  if (!template) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!isAdmin && template.createdById !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await templateEngineService.delete(id);
  return NextResponse.json({ success: true });
}
