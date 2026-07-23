import { prisma } from "@/lib/prisma";
import { paginatedResult, parsePaginationInput } from "@/lib/pagination";

export type CreateGuestWishInput = {
  eventId: string;
  invitationId?: string;
  guestId?: string;
  authorName: string;
  message: string;
};

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
        select: {
          id: true,
          authorName: true,
          message: true,
          createdAt: true,
          guestId: true,
        },
      }),
      prisma.invitationGuestWish.count({ where }),
    ]);
    return paginatedResult(items, total, p, take);
  }

  async create(input: CreateGuestWishInput) {
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
      select: {
        id: true,
        authorName: true,
        message: true,
        createdAt: true,
        guestId: true,
      },
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
      },
    });
  }

  /** Permanently remove a wish (moderation hard-delete). */
  async hardDelete(id: string) {
    return prisma.invitationGuestWish.delete({
      where: { id },
      select: { id: true, eventId: true },
    });
  }
}

export const guestWishService = new GuestWishService();
