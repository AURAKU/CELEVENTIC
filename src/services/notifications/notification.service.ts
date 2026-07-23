import { prisma } from "@/lib/prisma";
import { parsePaginationInput, paginatedResult, FEED_LIMIT } from "@/lib/pagination";

export interface NotifyInput {
  title: string;
  message: string;
  type: string;
  link?: string;
}

export class NotificationService {
  async notify(userId: string, input: NotifyInput) {
    return prisma.notification.create({
      data: {
        userId,
        title: input.title,
        message: input.message,
        type: input.type,
        link: input.link,
      },
    });
  }

  async listForUser(userId: string, page = 1, limit = FEED_LIMIT) {
    const { page: p, limit: take, skip } = parsePaginationInput(
      { page, limit },
      { limit: FEED_LIMIT }
    );
    const [items, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      prisma.notification.count({ where: { userId } }),
      prisma.notification.count({ where: { userId, isRead: false } }),
    ]);
    return { ...paginatedResult(items, total, p, take), unreadCount };
  }

  async markRead(userId: string, id: string) {
    return prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
  }

  async markAllRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  async unreadCount(userId: string) {
    return prisma.notification.count({ where: { userId, isRead: false } });
  }
}

export const notificationService = new NotificationService();
