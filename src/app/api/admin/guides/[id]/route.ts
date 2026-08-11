import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/require-admin";
import {
  deleteAdminGuide,
  getAdminGuide,
  updateAdminGuide,
} from "@/services/celeventic-guide/guide.service";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const guide = await getAdminGuide(id);
  if (!guide) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ guide });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const guide = await updateAdminGuide(id, body, {
    editorId: session.user?.id ?? null,
    editorLabel: session.user?.email ?? session.user?.name ?? null,
  });
  if (!guide) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ guide });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  await deleteAdminGuide(id);
  return NextResponse.json({ success: true });
}
