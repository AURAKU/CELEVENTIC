import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { UserRole } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isPlatformAdmin } from "@/lib/rbac";
import {
  authorTokenMatches,
  guestWishService,
} from "@/services/invitations/guest-wish.service";

/**
 * Hard-delete a guest wish.
 *
 * Allowed for:
 * - Platform ADMIN / SUPER_ADMIN
 * - The event organizer
 * - The wish author, proving ownership with the one-time `deleteToken`
 *   issued when the wish was created (no account required)
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Wish id required" }, { status: 400 });
  }

  const wish = await guestWishService.getById(id);
  if (!wish) {
    return NextResponse.json({ error: "Wish not found" }, { status: 404 });
  }

  const session = await getServerSession(authOptions);
  const role = session?.user?.role as UserRole | undefined;
  let allowedAsModerator = false;

  if (session?.user?.id && role) {
    if (isPlatformAdmin(role)) {
      allowedAsModerator = true;
    } else {
      const event = await prisma.event.findUnique({
        where: { id: wish.eventId },
        select: { organizerId: true },
      });
      allowedAsModerator = event?.organizerId === session.user.id;
    }
  }

  let deleteToken: string | undefined;
  try {
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const body = (await req.json().catch(() => null)) as { deleteToken?: string } | null;
      deleteToken = body?.deleteToken?.trim() || undefined;
    }
  } catch {
    deleteToken = undefined;
  }
  if (!deleteToken) {
    const url = new URL(req.url);
    deleteToken = url.searchParams.get("deleteToken")?.trim() || undefined;
  }

  const allowedAsAuthor = authorTokenMatches(wish.authorTokenHash, deleteToken ?? "");

  if (!allowedAsModerator && !allowedAsAuthor) {
    return NextResponse.json(
      {
        error: "Forbidden, only the person who wrote this wish, or an admin, can delete it",
      },
      { status: 403 }
    );
  }

  try {
    await guestWishService.hardDelete(id);
    return NextResponse.json({
      success: true,
      data: { id, deletedBy: allowedAsModerator ? "moderator" : "author" },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete wish" },
      { status: 500 }
    );
  }
}
