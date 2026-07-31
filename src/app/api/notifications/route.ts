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

  const url = new URL(req.url);
  const id = url.searchParams.get("id")?.trim();
  if (id) {
    const item = await notificationService.getForUser(session.user.id, id);
    if (!item) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }
    return NextResponse.json({
      success: true,
      data: { ...item, createdAt: item.createdAt.toISOString() },
    });
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

const deleteSchema = z
  .object({
    id: z.string().optional(),
    clearAll: z.boolean().optional(),
  })
  .refine((value) => Boolean(value.id) || value.clearAll === true, {
    message: "id or clearAll required",
  });

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = deleteSchema.parse(await req.json().catch(() => ({})));

    if (body.clearAll) {
      const result = await notificationService.clearAll(session.user.id);
      return NextResponse.json({ success: true, data: { deleted: result.count } });
    }

    const result = await notificationService.deleteOne(session.user.id, body.id!);
    if (result.count === 0) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: { deleted: 1 } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0]?.message ?? "Invalid request" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to delete notifications" }, { status: 500 });
  }
}
