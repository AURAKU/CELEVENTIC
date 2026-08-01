import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import type { UserRole } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { verifyEventAccess } from "@/lib/event-access";
import {
  guestWishService,
  isWishEventModerator,
} from "@/services/invitations/guest-wish.service";
import { parsePaginationFromUrl } from "@/lib/pagination";
import { createAuditLog } from "@/lib/audit";

const moderateSchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "HIDDEN", "REJECTED", "REMOVED"]).optional(),
  isPinned: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  authorName: z.string().min(1).max(80).optional(),
  message: z.string().min(2).max(1000).optional(),
  title: z.string().max(120).nullable().optional(),
  avatarUrl: z.string().max(500).nullable().optional(),
  moderationReason: z.string().max(300).nullable().optional(),
  hardDelete: z.boolean().optional(),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: eventId } = await params;
  try {
    await verifyEventAccess(eventId, session.user.id, session.user.role);
  } catch {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const url = new URL(req.url);
  const { page, limit } = parsePaginationFromUrl(req.url);
  const data = await guestWishService.listForEvent(eventId, page, Math.min(limit, 100), {
    includeHidden: true,
    status: (url.searchParams.get("status") as never) || "ALL",
    source: (url.searchParams.get("source") as never) || "ALL",
    query: url.searchParams.get("q") || undefined,
  });

  const canModerate = await isWishEventModerator(
    eventId,
    session.user.id,
    session.user.role as UserRole
  );

  return NextResponse.json({ success: true, data: { ...data, canModerate } });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: eventId } = await params;

  try {
    await verifyEventAccess(eventId, session.user.id, session.user.role);
  } catch {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const canModerate = await isWishEventModerator(
    eventId,
    session.user.id,
    session.user.role as UserRole
  );
  if (!canModerate) {
    return NextResponse.json({ error: "Only organizers can moderate messages" }, { status: 403 });
  }

  try {
    const body = moderateSchema.extend({ messageId: z.string().min(1) }).parse(await req.json());
    const wish = await guestWishService.getById(body.messageId);
    if (!wish || wish.eventId !== eventId) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    if (body.hardDelete) {
      await guestWishService.hardDelete(body.messageId);
      await createAuditLog({
        userId: session.user.id,
        action: "DELETE",
        entity: "InvitationGuestWish",
        entityId: body.messageId,
        details: { eventId },
      });
      return NextResponse.json({ success: true, data: { id: body.messageId, deleted: true } });
    }

    const updated = await guestWishService.moderate(body.messageId, {
      status: body.status,
      isPinned: body.isPinned,
      isFeatured: body.isFeatured,
      authorName: body.authorName,
      message: body.message,
      title: body.title,
      avatarUrl: body.avatarUrl,
      moderationReason: body.moderationReason,
      moderatedById: session.user.id,
    });

    await createAuditLog({
      userId: session.user.id,
      action: "UPDATE",
      entity: "InvitationGuestWish",
      entityId: body.messageId,
      details: { eventId, status: body.status, isPinned: body.isPinned, isFeatured: body.isFeatured },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0]?.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to moderate" },
      { status: 400 }
    );
  }
}
