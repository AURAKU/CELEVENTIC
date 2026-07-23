import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { UserRole } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isPlatformAdmin } from "@/lib/rbac";
import { guestWishService } from "@/services/invitations/guest-wish.service";

/**
 * Hard-delete a guest wish. Allowed for platform ADMIN / SUPER_ADMIN
 * or the event organizer only.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Wish id required" }, { status: 400 });
  }

  const wish = await guestWishService.getById(id);
  if (!wish) {
    return NextResponse.json({ error: "Wish not found" }, { status: 404 });
  }

  const role = session.user.role as UserRole;
  if (!isPlatformAdmin(role)) {
    const event = await prisma.event.findUnique({
      where: { id: wish.eventId },
      select: { organizerId: true },
    });
    if (!event || event.organizerId !== session.user.id) {
      return NextResponse.json(
        { error: "Forbidden — only admins or the event organizer can delete wishes" },
        { status: 403 }
      );
    }
  }

  try {
    await guestWishService.hardDelete(id);
    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete wish" },
      { status: 500 }
    );
  }
}
