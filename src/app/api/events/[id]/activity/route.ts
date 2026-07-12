import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { activityService } from "@/services/workspace/activity.service";
import { requireEventPermission } from "@/lib/workspace/event-access";
import { EventPermissionKey } from "@/lib/workspace/permission-keys";
import { parsePaginationFromUrl } from "@/lib/pagination";
import type { UserRole } from "@prisma/client";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    await requireEventPermission(id, session.user.id, session.user.role as UserRole, EventPermissionKey.VIEW_ACTIVITY);
    const pagination = parsePaginationFromUrl(req.url);
    const result = await activityService.list(id, pagination);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 400 }
    );
  }
}
