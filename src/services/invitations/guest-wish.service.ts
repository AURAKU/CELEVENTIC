import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { paginatedResult, parsePaginationInput } from "@/lib/pagination";

export type CreateGuestWishInput = {
  eventId: string;
  invitationId?: string;
  guestId?: string;
  authorName: string;
  message: string;
};

export type GuestWishPublic = {
  id: string;
  authorName: string;
  message: string;
  createdAt: Date;
  guestId: string | null;
};

function hashAuthorToken(token: string): string {
  return createHash("sha256").update(token.trim()).digest("hex");
}

function mintAuthorToken(): { token: string; hash: string } {
  const token = randomBytes(24).toString("base64url");
  return { token, hash: hashAuthorToken(token) };
}

export function authorTokenMatches(storedHash: string | null | undefined, token: string): boolean {
  if (!storedHash || !token.trim()) return false;
  const incoming = Buffer.from(hashAuthorToken(token), "utf8");
  const expected = Buffer.from(storedHash, "utf8");
  if (incoming.length !== expected.length) return false;
  return timingSafeEqual(incoming, expected);
}

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

  async create(input: CreateGuestWishInput): Promise<GuestWishPublic & { deleteToken: string }> {
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

    const { token, hash } = mintAuthorToken();

    const wish = await prisma.invitationGuestWish.create({
      data: {
        eventId: input.eventId,
        invitationId: input.invitationId,
        guestId: input.guestId,
        authorName,
        message,
        authorTokenHash: hash,
      },
      select: {
        id: true,
        authorName: true,
        message: true,
        createdAt: true,
        guestId: true,
      },
    });

    return { ...wish, deleteToken: token };
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

  /** Permanently remove a wish (author or moderator hard-delete). */
  async hardDelete(id: string) {
    return prisma.invitationGuestWish.delete({
      where: { id },
      select: { id: true, eventId: true },
    });
  }
}

export const guestWishService = new GuestWishService();
