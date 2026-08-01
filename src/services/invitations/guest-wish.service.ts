import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
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
import type { GuestWishSource, GuestWishStatus } from "@/lib/thank-you/types";

export type CreateGuestWishInput = {
  eventId: string;
  invitationId?: string;
  guestId?: string;
  authorName: string;
  message: string;
  title?: string | null;
  avatarUrl?: string | null;
  source?: GuestWishSource;
  isAnonymous?: boolean;
  /** When true, create as PENDING instead of APPROVED. */
  requireApproval?: boolean;
  /** Issue a one-time author management token (hashed at rest). */
  issueAuthorToken?: boolean;
};

export type UpdateGuestWishInput = {
  authorName?: string;
  message?: string;
  title?: string | null;
  avatarUrl?: string | null;
  isAnonymous?: boolean;
};

export type ModerateGuestWishInput = {
  status?: GuestWishStatus;
  isPinned?: boolean;
  isFeatured?: boolean;
  isVisible?: boolean;
  moderationReason?: string | null;
  moderatedById?: string;
  authorName?: string;
  message?: string;
  title?: string | null;
  avatarUrl?: string | null;
};

export type GuestWishPublic = {
  id: string;
  authorName: string;
  message: string;
  title: string | null;
  avatarUrl: string | null;
  status: string;
  source: string;
  isPinned: boolean;
  isFeatured: boolean;
  isAnonymous: boolean;
  editedAt: Date | null;
  createdAt: Date;
  guestId: string | null;
};

const publicSelect = {
  id: true,
  authorName: true,
  message: true,
  title: true,
  avatarUrl: true,
  status: true,
  source: true,
  isPinned: true,
  isFeatured: true,
  isAnonymous: true,
  editedAt: true,
  createdAt: true,
  guestId: true,
} as const;

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

export function hashAuthorToken(token: string): string {
  return createHash("sha256").update(token.trim()).digest("hex");
}

export function generateAuthorToken(): string {
  return randomBytes(24).toString("base64url");
}

export function authorTokenMatches(storedHash: string | null | undefined, token: string): boolean {
  if (!storedHash || !token.trim()) return false;
  const incoming = Buffer.from(hashAuthorToken(token), "utf8");
  const expected = Buffer.from(storedHash, "utf8");
  if (incoming.length !== expected.length) return false;
  return timingSafeEqual(incoming, expected);
}

function sanitizeMessage(message: string, maxLength: number): string {
  return message
    .replace(/<[^>]*>/g, "")
    .replace(/javascript:/gi, "")
    .trim()
    .slice(0, maxLength);
}

function toPublic(row: GuestWishPublic): GuestWishPublic {
  return {
    ...row,
    authorName: row.isAnonymous ? "A guest" : row.authorName,
  };
}

export class GuestWishService {
  async listForEvent(
    eventId: string,
    page = 1,
    limit = 50,
    options?: {
      includeHidden?: boolean;
      status?: GuestWishStatus | "ALL";
      source?: GuestWishSource | "ALL";
      query?: string;
      publicOnly?: boolean;
    }
  ) {
    const { page: p, limit: take, skip } = parsePaginationInput(
      { page, limit },
      { limit: 50, maxLimit: 100 }
    );

    const where: Record<string, unknown> = { eventId };
    if (options?.publicOnly) {
      where.isVisible = true;
      where.status = "APPROVED";
    } else if (!options?.includeHidden) {
      where.isVisible = true;
    }
    if (options?.status && options.status !== "ALL") {
      where.status = options.status;
    }
    if (options?.source && options.source !== "ALL") {
      where.source = options.source;
    }
    if (options?.query?.trim()) {
      const q = options.query.trim();
      where.AND = [
        {
          OR: [
            { authorName: { contains: q } },
            { message: { contains: q } },
            { title: { contains: q } },
          ],
        },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.invitationGuestWish.findMany({
        where,
        orderBy: [{ isPinned: "desc" }, { isFeatured: "desc" }, { createdAt: "desc" }],
        skip,
        take,
        select: publicSelect,
      }),
      prisma.invitationGuestWish.count({ where }),
    ]);

    const mapped = options?.publicOnly ? items.map((item) => toPublic(item as GuestWishPublic)) : items;
    return paginatedResult(mapped, total, p, take);
  }

  async create(
    input: CreateGuestWishInput
  ): Promise<GuestWishPublic & { authorToken?: string }> {
    const maxLen = 1000;
    const authorName = input.isAnonymous
      ? "A guest"
      : input.authorName.trim().slice(0, 80);
    const message = sanitizeMessage(input.message, maxLen);
    const title = input.title?.trim().slice(0, 120) || null;
    if (!input.isAnonymous && !authorName) throw new Error("Please enter your name");
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
        select: { id: true },
      });
      if (!guest) throw new Error("Guest not found for this event");
    }

    if (input.avatarUrl) {
      const url = input.avatarUrl.trim();
      if (!url.startsWith("/") && !url.startsWith("https://")) {
        throw new Error("Invalid profile photo");
      }
    }

    const status: GuestWishStatus = input.requireApproval ? "PENDING" : "APPROVED";
    const authorToken = input.issueAuthorToken === false ? null : generateAuthorToken();
    const authorTokenHash = authorToken ? hashAuthorToken(authorToken) : null;

    const created = await prisma.invitationGuestWish.create({
      data: {
        eventId: input.eventId,
        invitationId: input.invitationId,
        guestId: input.guestId,
        authorName: input.isAnonymous ? "A guest" : authorName,
        message,
        title,
        avatarUrl: input.avatarUrl?.trim() || null,
        status,
        source: input.source ?? "INVITATION",
        isAnonymous: Boolean(input.isAnonymous),
        isVisible: status === "APPROVED",
        authorTokenHash,
      },
      select: publicSelect,
    });

    return {
      ...toPublic(created as GuestWishPublic),
      ...(authorToken ? { authorToken } : {}),
    };
  }

  async update(
    id: string,
    input: UpdateGuestWishInput,
    options?: { markEdited?: boolean }
  ): Promise<GuestWishPublic> {
    const authorName =
      input.authorName !== undefined ? input.authorName.trim().slice(0, 80) : undefined;
    const message =
      input.message !== undefined ? sanitizeMessage(input.message, 1000) : undefined;
    const title =
      input.title !== undefined ? input.title?.trim().slice(0, 120) || null : undefined;

    if (authorName !== undefined && !authorName && !input.isAnonymous) {
      throw new Error("Please enter a name");
    }
    if (message !== undefined && message.length < 2) {
      throw new Error("Please write a short wish");
    }
    if (
      authorName === undefined &&
      message === undefined &&
      title === undefined &&
      input.avatarUrl === undefined &&
      input.isAnonymous === undefined
    ) {
      throw new Error("Nothing to update");
    }

    if (input.avatarUrl) {
      const url = input.avatarUrl.trim();
      if (url && !url.startsWith("/") && !url.startsWith("https://")) {
        throw new Error("Invalid profile photo");
      }
    }

    const updated = await prisma.invitationGuestWish.update({
      where: { id },
      data: {
        ...(authorName !== undefined ? { authorName } : {}),
        ...(message !== undefined ? { message } : {}),
        ...(title !== undefined ? { title } : {}),
        ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl || null } : {}),
        ...(input.isAnonymous !== undefined ? { isAnonymous: input.isAnonymous } : {}),
        ...(options?.markEdited ? { editedAt: new Date() } : {}),
      },
      select: publicSelect,
    });
    return toPublic(updated as GuestWishPublic);
  }

  async moderate(id: string, input: ModerateGuestWishInput): Promise<GuestWishPublic> {
    const status = input.status;
    const isVisible =
      input.isVisible !== undefined
        ? input.isVisible
        : status
          ? status === "APPROVED"
          : undefined;

    const updated = await prisma.invitationGuestWish.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(isVisible !== undefined ? { isVisible } : {}),
        ...(input.isPinned !== undefined ? { isPinned: input.isPinned } : {}),
        ...(input.isFeatured !== undefined ? { isFeatured: input.isFeatured } : {}),
        ...(input.authorName !== undefined
          ? { authorName: input.authorName.trim().slice(0, 80) }
          : {}),
        ...(input.message !== undefined
          ? { message: sanitizeMessage(input.message, 1000) }
          : {}),
        ...(input.title !== undefined ? { title: input.title?.trim().slice(0, 120) || null } : {}),
        ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl || null } : {}),
        moderatedAt: new Date(),
        moderatedById: input.moderatedById,
        moderationReason: input.moderationReason ?? null,
      },
      select: publicSelect,
    });
    return updated as GuestWishPublic;
  }

  async getById(id: string) {
    return prisma.invitationGuestWish.findUnique({
      where: { id },
      select: {
        id: true,
        eventId: true,
        authorName: true,
        message: true,
        title: true,
        avatarUrl: true,
        status: true,
        source: true,
        isPinned: true,
        isFeatured: true,
        isAnonymous: true,
        isVisible: true,
        editedAt: true,
        createdAt: true,
        guestId: true,
        authorTokenHash: true,
      },
    });
  }

  async assertAuthorToken(id: string, token: string) {
    const row = await this.getById(id);
    if (!row) throw new Error("Message not found");
    if (!authorTokenMatches(row.authorTokenHash, token)) {
      throw new Error("You can only manage your own message");
    }
    return row;
  }

  /** Soft-remove for audit-friendly moderation. */
  async softRemove(id: string, moderatedById?: string) {
    return this.moderate(id, {
      status: "REMOVED",
      isVisible: false,
      moderatedById,
      moderationReason: "Removed",
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
