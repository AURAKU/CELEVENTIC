import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  archiveDesignVersion,
  duplicateDesignVersion,
  listDesignVersions,
  renameDesignVersion,
  restoreDesignVersion,
  saveDesignVersion,
} from "@/services/digital-business-card/design-vault.service";

export const dynamic = "force-dynamic";

const mutateSchema = z.object({
  action: z.enum(["save", "duplicate", "restore", "rename", "archive"]),
  versionId: z.string().optional(),
  label: z.string().max(80).optional(),
});

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const page = Number(req.nextUrl.searchParams.get("page") || "1");
  const data = await listDesignVersions(session.user.id, id, Number.isFinite(page) ? page : 1);
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true, data });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const parsed = mutateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { action, versionId, label } = parsed.data;
  if (action === "save") {
    const row = await saveDesignVersion(session.user.id, id, label);
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: row });
  }
  if (!versionId) return NextResponse.json({ error: "versionId required" }, { status: 400 });
  if (action === "duplicate") {
    const row = await duplicateDesignVersion(session.user.id, id, versionId);
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: row });
  }
  if (action === "restore") {
    const row = await restoreDesignVersion(session.user.id, id, versionId);
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: row });
  }
  if (action === "rename") {
    const ok = await renameDesignVersion(session.user.id, id, versionId, label || "");
    if (!ok) return NextResponse.json({ error: "Could not rename" }, { status: 400 });
    return NextResponse.json({ success: true });
  }
  const ok = await archiveDesignVersion(session.user.id, id, versionId);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
