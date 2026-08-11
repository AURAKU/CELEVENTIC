import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/require-admin";
import { rollbackGuideToVersion } from "@/services/celeventic-guide/versioning.service";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const versionId = String(body.versionId ?? "");
  if (!versionId) return NextResponse.json({ error: "versionId required" }, { status: 400 });
  try {
    const guide = await rollbackGuideToVersion(id, versionId, {
      editorId: session.user?.id ?? null,
      editorLabel: session.user?.email ?? session.user?.name ?? null,
    });
    if (!guide) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ guide });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Rollback failed" }, { status: 400 });
  }
}
