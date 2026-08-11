import type { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isPlatformAdmin } from "@/lib/rbac";
import {
  generateMemoryAuthorToken,
  hashMemoryAuthorToken,
  hashMemoryGuestKey,
  memoryAuthorTokenMatches,
} from "@/lib/memory/memory-guest-identity";
import {
  resolveMemoryCommentCapabilities,
  viewerCanDeleteMemoryComment,
  viewerCanDeleteMemoryMedia,
} from "@/lib/memory/memory-social-permissions";

export async function isMemoryEventModerator(
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
  if (event?.organizerId === userId) return true;
  const collab = await prisma.eventCollaborator.findFirst({
    where: { eventId, userId, status: "ACTIVE" },
    select: { id: true },
  });
  return Boolean(collab);
}

function sanitizeMessage(message: string, maxLength: number): string {
  return message
    .replace(/<[^>]*>/g, "")
    .replace(/javascript:/gi, "")
    .trim()
    .slice(0, maxLength);
}

export class EventMemorySocialService {
  resolveGuestKeyHash(rawGuestKey: string | undefined | null): string | null {
    const raw = rawGuestKey?.trim();
    if (!raw || raw.length < 8) return null;
    return hashMemoryGuestKey(raw);
  }

  async hasConsent(eventId: string, guestKeyHash: string): Promise<boolean> {
    const row = await prisma.eventMemoryConsent.findUnique({
      where: { eventId_guestKey: { eventId, guestKey: guestKeyHash } },
      select: { id: true },
    });
    return Boolean(row);
  }

  async recordConsent(input: {
    eventId: string;
    guestKeyHash: string;
    guestId?: string | null;
  }) {
    return prisma.eventMemoryConsent.upsert({
      where: {
        eventId_guestKey: { eventId: input.eventId, guestKey: input.guestKeyHash },
      },
      create: {
        eventId: input.eventId,
        guestKey: input.guestKeyHash,
        guestId: input.guestId ?? null,
      },
      update: {
        consentedAt: new Date(),
        ...(input.guestId ? { guestId: input.guestId } : {}),
      },
    });
  }

  async ensureConsentForUpload(input: {
    eventId: string;
    guestKeyHash: string | null;
    consentGiven: boolean;
    guestId?: string | null;
  }): Promise<{ ok: true } | { ok: false; error: string }> {
    if (input.guestKeyHash) {
      const prior = await this.hasConsent(input.eventId, input.guestKeyHash);
      if (prior) return { ok: true };
    }
    if (!input.consentGiven) {
      return { ok: false, error: "Please consent to sharing before uploading." };
    }
    if (input.guestKeyHash) {
      await this.recordConsent({
        eventId: input.eventId,
        guestKeyHash: input.guestKeyHash,
        guestId: input.guestId,
      });
    }
    return { ok: true };
  }

  async toggleLike(input: {
    eventId: string;
    memoryId: string;
    guestKeyHash: string;
  }): Promise<{ liked: boolean; likeCount: number }> {
    const memory = await prisma.eventMemoryUpload.findFirst({
      where: { id: input.memoryId, eventId: input.eventId, status: "APPROVED" },
      select: { id: true },
    });
    if (!memory) throw new Error("Memory not found");

    const existing = await prisma.eventMemoryLike.findUnique({
      where: {
        memoryId_guestKey: { memoryId: input.memoryId, guestKey: input.guestKeyHash },
      },
    });

    if (existing) {
      await prisma.eventMemoryLike.delete({ where: { id: existing.id } });
    } else {
      await prisma.eventMemoryLike.create({
        data: {
          eventId: input.eventId,
          memoryId: input.memoryId,
          guestKey: input.guestKeyHash,
        },
      });
    }

    const likeCount = await prisma.eventMemoryLike.count({ where: { memoryId: input.memoryId } });
    return { liked: !existing, likeCount };
  }

  async listComments(memoryId: string, eventId: string, page = 1, limit = 40) {
    const where = { memoryId, eventId };
    const skip = (Math.max(1, page) - 1) * limit;
    const [items, total] = await Promise.all([
      prisma.eventMemoryComment.findMany({
        where,
        orderBy: { createdAt: "asc" },
        skip,
        take: limit,
        select: {
          id: true,
          authorName: true,
          message: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.eventMemoryComment.count({ where }),
    ]);
    return { items, total, page, pages: Math.max(1, Math.ceil(total / limit)) };
  }

  async addComment(input: {
    eventId: string;
    memoryId: string;
    authorName: string;
    message: string;
    guestKeyHash?: string | null;
    guestId?: string | null;
  }): Promise<{
    id: string;
    authorName: string;
    message: string;
    createdAt: Date;
    authorToken: string;
  }> {
    const memory = await prisma.eventMemoryUpload.findFirst({
      where: { id: input.memoryId, eventId: input.eventId, status: "APPROVED" },
      select: { id: true },
    });
    if (!memory) throw new Error("Memory not found");

    const authorName = input.authorName.trim().slice(0, 80);
    const message = sanitizeMessage(input.message, 500);
    if (!authorName) throw new Error("Please enter your name");
    if (message.length < 1) throw new Error("Please write a comment");

    const authorToken = generateMemoryAuthorToken();
    const row = await prisma.eventMemoryComment.create({
      data: {
        eventId: input.eventId,
        memoryId: input.memoryId,
        guestId: input.guestId ?? null,
        authorName,
        message,
        authorTokenHash: hashMemoryAuthorToken(authorToken),
        guestKey: input.guestKeyHash ?? null,
      },
      select: { id: true, authorName: true, message: true, createdAt: true },
    });

    return { ...row, authorToken };
  }

  async deleteComment(input: {
    commentId: string;
    eventId: string;
    authorToken?: string | null;
    isModerator: boolean;
  }) {
    const comment = await prisma.eventMemoryComment.findFirst({
      where: { id: input.commentId, eventId: input.eventId },
      select: { id: true, authorTokenHash: true, memoryId: true },
    });
    if (!comment) throw new Error("Comment not found");

    const canDelete = viewerCanDeleteMemoryComment({
      canModerate: input.isModerator,
      ownedToken: input.authorToken,
    });
    // Re-check token against stored hash when not moderator
    if (!input.isModerator) {
      if (!memoryAuthorTokenMatches(comment.authorTokenHash, input.authorToken ?? "")) {
        throw new Error("You can only delete your own comments");
      }
    } else if (!canDelete) {
      throw new Error("Not allowed to delete this comment");
    }

    await prisma.eventMemoryComment.delete({ where: { id: comment.id } });
    return { memoryId: comment.memoryId };
  }

  async deleteMemory(input: {
    memoryId: string;
    eventId: string;
    isModerator: boolean;
    guestKeyHash?: string | null;
  }) {
    const memory = await prisma.eventMemoryUpload.findFirst({
      where: { id: input.memoryId, eventId: input.eventId },
      select: { id: true, uploaderGuestKey: true },
    });
    if (!memory) throw new Error("Memory not found");

    const isOwner = Boolean(
      input.guestKeyHash &&
        memory.uploaderGuestKey &&
        memory.uploaderGuestKey === input.guestKeyHash
    );
    if (!viewerCanDeleteMemoryMedia({ canModerate: input.isModerator, isOwner })) {
      throw new Error("You can only delete your own memories");
    }

    await prisma.eventMemoryUpload.delete({ where: { id: memory.id } });
    return { id: memory.id };
  }

  async enrichApprovedItems(
    items: Array<{
      id: string;
      mediaType: string;
      mediaUrl: string;
      thumbnailUrl: string | null;
      caption: string | null;
      uploaderName: string | null;
      isFeatured: boolean;
      createdAt: Date;
      uploaderGuestKey?: string | null;
    }>,
    guestKeyHash: string | null,
    options?: { canModerate?: boolean }
  ) {
    if (items.length === 0) return [];
    const ids = items.map((i) => i.id);
    const [likeGroups, commentGroups, likedRows] = await Promise.all([
      prisma.eventMemoryLike.groupBy({
        by: ["memoryId"],
        where: { memoryId: { in: ids } },
        _count: { _all: true },
      }),
      prisma.eventMemoryComment.groupBy({
        by: ["memoryId"],
        where: { memoryId: { in: ids } },
        _count: { _all: true },
      }),
      guestKeyHash
        ? prisma.eventMemoryLike.findMany({
            where: { memoryId: { in: ids }, guestKey: guestKeyHash },
            select: { memoryId: true },
          })
        : Promise.resolve([] as { memoryId: string }[]),
    ]);

    const likeMap = new Map(likeGroups.map((g) => [g.memoryId, g._count._all]));
    const commentMap = new Map(commentGroups.map((g) => [g.memoryId, g._count._all]));
    const likedSet = new Set(likedRows.map((r) => r.memoryId));
    const canModerate = Boolean(options?.canModerate);

    return items.map((item) => {
      const isOwner = Boolean(
        guestKeyHash && item.uploaderGuestKey && item.uploaderGuestKey === guestKeyHash
      );
      return {
        id: item.id,
        mediaType: item.mediaType,
        mediaUrl: item.mediaUrl,
        thumbnailUrl: item.thumbnailUrl,
        caption: item.caption,
        uploaderName: item.uploaderName,
        isFeatured: item.isFeatured,
        createdAt: item.createdAt,
        likeCount: likeMap.get(item.id) ?? 0,
        commentCount: commentMap.get(item.id) ?? 0,
        likedByViewer: likedSet.has(item.id),
        ownedByViewer: isOwner,
        canDelete: viewerCanDeleteMemoryMedia({ canModerate, isOwner }),
      };
    });
  }

  commentCapabilities(isModerator: boolean, hasValidAuthorToken?: boolean) {
    return resolveMemoryCommentCapabilities({ isModerator, hasValidAuthorToken });
  }
}

export const eventMemorySocialService = new EventMemorySocialService();
