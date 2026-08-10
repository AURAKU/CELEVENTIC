import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/require-admin";
import { duplicateAdminGuide } from "@/services/celeventic-guide/guide.service";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const guide = await duplicateAdminGuide(id);
  if (!guide) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ guide }, { status: 201 });
}
