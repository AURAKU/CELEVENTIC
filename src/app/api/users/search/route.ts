import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { searchUsers } from "@/services/workspace/onboarding.service";
import { parsePaginationFromUrl } from "@/lib/pagination";
import { requireEventPermission } from "@/lib/workspace/event-access";
import { EventPermissionKey } from "@/lib/workspace/permission-keys";
import type { UserRole } from "@prisma/client";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  const eventId = url.searchParams.get("eventId");
  if (!eventId) {
    return NextResponse.json({ error: "eventId required" }, { status: 400 });
  }

  try {
    await requireEventPermission(
      eventId,
      session.user.id,
      session.user.role as UserRole,
      EventPermissionKey.INVITE_COLLABORATORS
    );
  } catch {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const pagination = parsePaginationFromUrl(url);
  const result = await searchUsers(q, pagination);
  return NextResponse.json({
    success: true,
    data: {
      ...result,
      items: result.items.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        avatarUrl: user.avatarUrl,
      })),
    },
  });
}
