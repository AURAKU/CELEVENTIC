import type { UserRole } from "@prisma/client";
import { isPlatformAdmin } from "@/lib/rbac";
import { liveAlbumKey } from "@/lib/memory/live-album";

export function resolveLiveAlbumDeleteAccess(input: {
  role?: UserRole | string | null;
  userId?: string | null;
  organizerId?: string | null;
  hasInvitation: boolean;
  isPreviewAlbum: boolean;
}): boolean {
  if (!input.userId || !input.role) return false;
  if (isPlatformAdmin(input.role as UserRole)) return true;
  if (input.role !== "ORGANIZER") return false;
  if (input.hasInvitation) return input.organizerId === input.userId;
  return input.isPreviewAlbum;
}

export function isLiveAlbumPreviewKey(key: string): boolean {
  return liveAlbumKey(key).startsWith("preview-");
}

/** Admin, or the organizer of this invitation's event. Guests never qualify. */
export async function canRemoveLiveAlbumMedia(
  albumKey: string,
  userId: string | undefined,
  role: UserRole | undefined
): Promise<boolean> {
  if (!userId || !role) return false;
  if (isPlatformAdmin(role)) return true;
  if (role !== "ORGANIZER") return false;

  const key = liveAlbumKey(albumKey);
  try {
    const { prisma } = await import("@/lib/prisma");
    const invitation = await prisma.invitation.findFirst({
      where: { OR: [{ id: key }, { uniqueLink: key }, { slug: key }] },
      select: { event: { select: { organizerId: true } } },
    });
    return resolveLiveAlbumDeleteAccess({
      role,
      userId,
      organizerId: invitation?.event?.organizerId ?? null,
      hasInvitation: Boolean(invitation),
      isPreviewAlbum: isLiveAlbumPreviewKey(key),
    });
  } catch {
    return resolveLiveAlbumDeleteAccess({
      role,
      userId,
      organizerId: null,
      hasInvitation: false,
      isPreviewAlbum: isLiveAlbumPreviewKey(key),
    });
  }
}
