import { prisma } from "@/lib/prisma";

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

  async listForUser(userId: string, limit = 30) {
    const [items, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      prisma.notification.count({ where: { userId, isRead: false } }),
    ]);
    return { items, unreadCount };
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
