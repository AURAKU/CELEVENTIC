import { createHash, timingSafeEqual } from "node:crypto";
import type { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { paginatedResult, parsePaginationInput } from "@/lib/pagination";
import { isPlatformAdmin } from "@/lib/rbac";
export {
  resolveWishCapabilities,
  viewerCanDeleteWish,
  viewerCanEditWish,
  type WishCapabilities,
} from "@/lib/invitation/guest-wish-permissions";

export type CreateGuestWishInput = {
  eventId: string;
  invitationId?: string;
  guestId?: string;
  authorName: string;
  message: string;
};

export type UpdateGuestWishInput = {
  authorName?: string;
  message?: string;
};

export type GuestWishPublic = {
  id: string;
  authorName: string;
  message: string;
  createdAt: Date;
  guestId: string | null;
};

/** True when the signed-in user may moderate (edit/delete-any) wishes for this event. */
export async function isWishEventModerator(
  eventId: string,
  userId: string | undefined,
  role: UserRole | undefined
): Promise<boolean> {
  if (!userId || !role) return false;
  if (isPlatformAdmin(role)) return true;
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { organizerId: true },
  });
  return event?.organizerId === userId;
}

function hashAuthorToken(token: string): string {
  return createHash("sha256").update(token.trim()).digest("hex");
}

/** Legacy helper — author tokens no longer authorize delete; kept for tests. */
export function authorTokenMatches(storedHash: string | null | undefined, token: string): boolean {
  if (!storedHash || !token.trim()) return false;
  const incoming = Buffer.from(hashAuthorToken(token), "utf8");
  const expected = Buffer.from(storedHash, "utf8");
  if (incoming.length !== expected.length) return false;
  return timingSafeEqual(incoming, expected);
}

const publicSelect = {
  id: true,
  authorName: true,
  message: true,
  createdAt: true,
  guestId: true,
} as const;

export class GuestWishService {
  async listForEvent(eventId: string, page = 1, limit = 50) {
    const { page: p, limit: take, skip } = parsePaginationInput(
      { page, limit },
      { limit: 50, maxLimit: 100 }
    );
    const where = { eventId, isVisible: true };
    const [items, total] = await Promise.all([
      prisma.invitationGuestWish.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
        select: publicSelect,
      }),
      prisma.invitationGuestWish.count({ where }),
    ]);
    return paginatedResult(items, total, p, take);
  }

  async create(input: CreateGuestWishInput): Promise<GuestWishPublic> {
    const authorName = input.authorName.trim().slice(0, 80);
    const message = input.message.trim().slice(0, 1000);
    if (!authorName) throw new Error("Please enter your name");
    if (message.length < 2) throw new Error("Please write a short wish");

    const event = await prisma.event.findUnique({
      where: { id: input.eventId },
      select: { id: true },
    });
    if (!event) throw new Error("Event not found");

    if (input.invitationId) {
      const inv = await prisma.invitation.findFirst({
        where: { id: input.invitationId, eventId: input.eventId },
        select: { id: true },
      });
      if (!inv) throw new Error("Invitation not found for this event");
    }

    if (input.guestId) {
      const guest = await prisma.guest.findFirst({
        where: { id: input.guestId, eventId: input.eventId },
        select: { id: true, name: true },
      });
      if (!guest) throw new Error("Guest not found for this event");
    }

    return prisma.invitationGuestWish.create({
      data: {
        eventId: input.eventId,
        invitationId: input.invitationId,
        guestId: input.guestId,
        authorName,
        message,
      },
      select: publicSelect,
    });
  }

  async update(id: string, input: UpdateGuestWishInput): Promise<GuestWishPublic> {
    const authorName =
      input.authorName !== undefined ? input.authorName.trim().slice(0, 80) : undefined;
    const message = input.message !== undefined ? input.message.trim().slice(0, 1000) : undefined;

    if (authorName !== undefined && !authorName) {
      throw new Error("Please enter a name");
    }
    if (message !== undefined && message.length < 2) {
      throw new Error("Please write a short wish");
    }
    if (authorName === undefined && message === undefined) {
      throw new Error("Nothing to update");
    }

    return prisma.invitationGuestWish.update({
      where: { id },
      data: {
        ...(authorName !== undefined ? { authorName } : {}),
        ...(message !== undefined ? { message } : {}),
      },
      select: publicSelect,
    });
  }

  async getById(id: string) {
    return prisma.invitationGuestWish.findUnique({
      where: { id },
      select: {
        id: true,
        eventId: true,
        authorName: true,
        message: true,
        createdAt: true,
        guestId: true,
        authorTokenHash: true,
      },
    });
  }

  /** Permanently remove a wish (organizer / admin hard-delete). */
  async hardDelete(id: string) {
    return prisma.invitationGuestWish.delete({
      where: { id },
      select: { id: true, eventId: true },
    });
  }
}

export const guestWishService = new GuestWishService();
