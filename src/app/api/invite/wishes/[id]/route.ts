import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import type { UserRole } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { resolveWishCapabilities } from "@/lib/invitation/guest-wish-permissions";
import {
  authorTokenMatches,
  guestWishService,
  isWishEventModerator,
} from "@/services/invitations/guest-wish.service";

const updateSchema = z
  .object({
    authorName: z.string().min(1).max(80).optional(),
    message: z.string().min(2).max(1000).optional(),
  })
  .refine((value) => value.authorName !== undefined || value.message !== undefined, {
    message: "Nothing to update",
  });

async function readDeleteToken(req: Request): Promise<string | undefined> {
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
  return deleteToken;
}

async function resolveModeratorForWish(eventId: string): Promise<boolean> {
  const session = await getServerSession(authOptions);
  return isWishEventModerator(
    eventId,
    session?.user?.id,
    session?.user?.role as UserRole | undefined
  );
}

/**
 * Hard-delete a guest wish.
 *
 * Allowed for:
 * - Platform ADMIN / SUPER_ADMIN
 * - The event organizer
 * - The wish author, proving ownership with the one-time `deleteToken`
 *   issued when the wish was created (no account required)
 *
 * Authors may not edit; edit is moderator-only via PATCH.
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

  const allowedAsModerator = await resolveModeratorForWish(wish.eventId);
  const deleteToken = await readDeleteToken(req);
  const allowedAsAuthor = authorTokenMatches(wish.authorTokenHash, deleteToken ?? "");
  const caps = resolveWishCapabilities({
    isModerator: allowedAsModerator,
    hasValidAuthorToken: allowedAsAuthor,
  });

  if (!caps.canDelete) {
    return NextResponse.json(
      {
        error:
          "Forbidden — only the person who wrote this wish, or an organizer/admin, can delete it",
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

/**
 * Edit a guest wish. Organizer / platform admin only.
 * Guests (including authors with a deleteToken) cannot edit.
 */
export async function PATCH(
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

  const isModerator = await resolveModeratorForWish(wish.eventId);
  const caps = resolveWishCapabilities({
    isModerator,
    hasValidAuthorToken: false,
  });

  if (!caps.canEdit) {
    return NextResponse.json(
      { error: "Forbidden — only the event organizer or a platform admin can edit wishes" },
      { status: 403 }
    );
  }

  try {
    const body = updateSchema.parse(await req.json());
    const updated = await guestWishService.update(id, body);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update wish" },
      { status: 400 }
    );
  }
}
