import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/require-admin";
import { listGuideVersions } from "@/services/celeventic-guide/versioning.service";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const versions = await listGuideVersions(id);
  return NextResponse.json({ versions });
}
