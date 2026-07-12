import { prisma } from "@/lib/prisma";
import { paginatedResult, parsePaginationInput } from "@/lib/pagination";
import type { Prisma } from "@prisma/client";

export class ActivityService {
  async log(input: {
    eventId: string;
    userId?: string;
    action: string;
    entity?: string;
    entityId?: string;
    details?: Record<string, unknown>;
  }) {
    return prisma.eventActivityLog.create({
      data: {
        eventId: input.eventId,
        userId: input.userId,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        details: input.details as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async list(eventId: string, pagination?: { page?: number; limit?: number }) {
    const { page, limit, skip } = parsePaginationInput(pagination);

    const [items, total] = await Promise.all([
      prisma.eventActivityLog.findMany({
        where: { eventId },
        include: {
          user: { select: { id: true, name: true, avatarUrl: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.eventActivityLog.count({ where: { eventId } }),
    ]);

    return paginatedResult(items, total, page, limit);
  }
}

export const activityService = new ActivityService();
