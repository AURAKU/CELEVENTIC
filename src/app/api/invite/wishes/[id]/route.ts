import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import type { UserRole } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import {
  resolveWishCapabilities,
  roleCanModerateWishes,
} from "@/lib/invitation/guest-wish-permissions";
import {
  guestWishService,
  isWishEventModerator,
} from "@/services/invitations/guest-wish.service";
import {
  deletePreviewWish,
  previewWishesEnabled,
  updatePreviewWish,
} from "@/lib/invitation/preview-wish-wall";

const updateSchema = z
  .object({
    authorName: z.string().min(1).max(80).optional(),
    message: z.string().min(2).max(1000).optional(),
  })
  .refine((value) => value.authorName !== undefined || value.message !== undefined, {
    message: "Nothing to update",
  });

const FORBIDDEN =
  "Forbidden — only the event organizer or a platform admin can change guest wishes";

async function resolveModeratorForWish(eventId: string): Promise<boolean> {
  const session = await getServerSession(authOptions);
  return isWishEventModerator(
    eventId,
    session?.user?.id,
    session?.user?.role as UserRole | undefined
  );
}

async function resolvePreviewModerator(): Promise<boolean> {
  if (!previewWishesEnabled()) return false;
  try {
    const session = await getServerSession(authOptions);
    return roleCanModerateWishes(session?.user?.role);
  } catch {
    return false;
  }
}

function isPreviewWishId(id: string): boolean {
  return id.startsWith("preview-wish-");
}

/**
 * Hard-delete a guest wish.
 *
 * Allowed for platform ADMIN / SUPER_ADMIN and the event organizer only.
 * Guests (including authors) cannot delete wishes.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Wish id required" }, { status: 400 });
  }

  if (isPreviewWishId(id)) {
    if (!(await resolvePreviewModerator())) {
      return NextResponse.json({ error: FORBIDDEN }, { status: 403 });
    }
    if (!deletePreviewWish(id)) {
      return NextResponse.json({ error: "Wish not found" }, { status: 404 });
    }
    return NextResponse.json({
      success: true,
      data: { id, deletedBy: "moderator" },
    });
  }

  const wish = await guestWishService.getById(id);
  if (!wish) {
    return NextResponse.json({ error: "Wish not found" }, { status: 404 });
  }

  const allowedAsModerator = await resolveModeratorForWish(wish.eventId);
  const caps = resolveWishCapabilities({
    isModerator: allowedAsModerator,
  });

  if (!caps.canDelete) {
    return NextResponse.json({ error: FORBIDDEN }, { status: 403 });
  }

  try {
    await guestWishService.hardDelete(id);
    return NextResponse.json({
      success: true,
      data: { id, deletedBy: "moderator" },
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
 * Guests cannot edit.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Wish id required" }, { status: 400 });
  }

  if (isPreviewWishId(id)) {
    if (!(await resolvePreviewModerator())) {
      return NextResponse.json({ error: FORBIDDEN }, { status: 403 });
    }
    try {
      const body = updateSchema.parse(await req.json());
      const updated = updatePreviewWish(id, body);
      if (!updated) {
        return NextResponse.json({ error: "Wish not found" }, { status: 404 });
      }
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

  const wish = await guestWishService.getById(id);
  if (!wish) {
    return NextResponse.json({ error: "Wish not found" }, { status: 404 });
  }

  const isModerator = await resolveModeratorForWish(wish.eventId);
  const caps = resolveWishCapabilities({
    isModerator,
  });

  if (!caps.canEdit) {
    return NextResponse.json({ error: FORBIDDEN }, { status: 403 });
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
