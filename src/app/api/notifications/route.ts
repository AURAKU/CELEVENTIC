import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { notificationService } from "@/services/notifications/notification.service";
import { parsePaginationFromUrl, FEED_LIMIT } from "@/lib/pagination";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { page, limit } = parsePaginationFromUrl(req.url, { limit: FEED_LIMIT });
  const data = await notificationService.listForUser(session.user.id, page, limit);
  return NextResponse.json({
    success: true,
    data: {
      items: data.items.map((n) => ({
        ...n,
        createdAt: n.createdAt.toISOString(),
      })),
      total: data.total,
      page: data.page,
      limit: data.limit,
      pages: data.pages,
      hasMore: data.hasMore,
      unreadCount: data.unreadCount,
    },
  });
}

const patchSchema = z.object({
  id: z.string().optional(),
  markAll: z.boolean().optional(),
});

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = patchSchema.parse(await req.json());

  if (body.markAll) {
    await notificationService.markAllRead(session.user.id);
    return NextResponse.json({ success: true });
  }

  if (body.id) {
    await notificationService.markRead(session.user.id, body.id);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "id or markAll required" }, { status: 400 });
}
