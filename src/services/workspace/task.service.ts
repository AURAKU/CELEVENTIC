import { prisma } from "@/lib/prisma";
import { paginatedResult, parsePaginationInput } from "@/lib/pagination";
import type { EventTaskPriority, EventTaskStatus, Prisma, UserRole } from "@prisma/client";
import { requireEventPermission } from "@/lib/workspace/event-access";
import { EventPermissionKey } from "@/lib/workspace/permission-keys";
import { activityService } from "./activity.service";
import { notificationService } from "@/services/notifications/notification.service";

export class TaskService {
  async list(eventId: string, userId: string, role: UserRole, pagination?: { page?: number; limit?: number }) {
    await requireEventPermission(eventId, userId, role, EventPermissionKey.VIEW_EVENT);
    const { page, limit, skip } = parsePaginationInput(pagination);

    const [items, total] = await Promise.all([
      prisma.eventTask.findMany({
        where: { eventId },
        include: {
          assignedTo: { select: { id: true, name: true, avatarUrl: true } },
          createdBy: { select: { id: true, name: true } },
          _count: { select: { comments: true } },
        },
        orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
        skip,
        take: limit,
      }),
      prisma.eventTask.count({ where: { eventId } }),
    ]);

    return paginatedResult(items, total, page, limit);
  }

  async create(
    eventId: string,
    userId: string,
    role: UserRole,
    input: {
      title: string;
      description?: string;
      priority?: EventTaskPriority;
      dueDate?: Date;
      assignedToId?: string;
      checklist?: unknown;
    }
  ) {
    await requireEventPermission(eventId, userId, role, EventPermissionKey.CREATE_TASKS);

    const task = await prisma.eventTask.create({
      data: {
        eventId,
        title: input.title,
        description: input.description,
        priority: input.priority ?? "MEDIUM",
        dueDate: input.dueDate,
        assignedToId: input.assignedToId,
        checklist: input.checklist as Prisma.InputJsonValue | undefined,
        createdById: userId,
      },
      include: {
        assignedTo: { select: { id: true, name: true } },
      },
    });

    if (input.assignedToId && input.assignedToId !== userId) {
      await notificationService.notify(input.assignedToId, {
        title: "Task assigned",
        message: `You were assigned: ${input.title}`,
        type: "TASK_ASSIGNED",
        link: `/dashboard/events/${eventId}/workspace?tab=tasks`,
      });
    }

    await activityService.log({
      eventId,
      userId,
      action: "task.created",
      entity: "EventTask",
      entityId: task.id,
      details: { title: input.title },
    });

    return task;
  }

  async update(
    eventId: string,
    taskId: string,
    userId: string,
    role: UserRole,
    data: {
      title?: string;
      description?: string;
      status?: EventTaskStatus;
      priority?: EventTaskPriority;
      dueDate?: Date | null;
      assignedToId?: string | null;
      checklist?: unknown;
    }
  ) {
    await requireEventPermission(eventId, userId, role, EventPermissionKey.MANAGE_TASKS);

    const task = await prisma.eventTask.update({
      where: { id: taskId, eventId },
      data: {
        ...data,
        checklist: data.checklist as Prisma.InputJsonValue | undefined,
      },
      include: { assignedTo: { select: { id: true, name: true } } },
    });

    await activityService.log({
      eventId,
      userId,
      action: "task.updated",
      entity: "EventTask",
      entityId: taskId,
      details: data,
    });

    return task;
  }

  async addComment(eventId: string, taskId: string, userId: string, role: UserRole, body: string) {
    await requireEventPermission(eventId, userId, role, EventPermissionKey.VIEW_EVENT);
    return prisma.eventTaskComment.create({
      data: { taskId, userId, body },
    });
  }
}

export const taskService = new TaskService();
