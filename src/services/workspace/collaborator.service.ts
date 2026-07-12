import { prisma } from "@/lib/prisma";
import { paginatedResult, parsePaginationInput } from "@/lib/pagination";
import { generateToken } from "@/lib/utils";
import type { EventCollaboratorRole } from "@prisma/client";
import { getRoleDefaultPermissions } from "@/lib/workspace/permission-store";
import { requireEventPermission } from "@/lib/workspace/event-access";
import { EventPermissionKey } from "@/lib/workspace/permission-keys";
import type { UserRole } from "@prisma/client";
import { activityService } from "./activity.service";
import { notificationService } from "@/services/notifications/notification.service";
import { createAuditLog } from "@/lib/audit";

export class CollaboratorService {
  async list(eventId: string, userId: string, role: UserRole, pagination?: { page?: number; limit?: number }) {
    await requireEventPermission(eventId, userId, role, EventPermissionKey.VIEW_EVENT);
    const { page, limit, skip } = parsePaginationInput(pagination);

    const [items, total] = await Promise.all([
      prisma.eventCollaborator.findMany({
        where: { eventId, isActive: true },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              username: true,
              avatarUrl: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
        skip,
        take: limit,
      }),
      prisma.eventCollaborator.count({ where: { eventId, isActive: true } }),
    ]);

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { organizerId: true, organizer: { select: { id: true, name: true, email: true, username: true, avatarUrl: true } } },
    });

    const withOwner = event
      ? [
          {
            id: `owner-${event.organizerId}`,
            eventId,
            userId: event.organizerId,
            role: "OWNER" as EventCollaboratorRole,
            permissions: null,
            title: "Event Owner",
            isActive: true,
            user: event.organizer,
          },
          ...items.filter((c) => c.userId !== event.organizerId),
        ]
      : items;

    return paginatedResult(withOwner, total + (event ? 1 : 0), page, limit);
  }

  async addDirect(
    eventId: string,
    actorId: string,
    platformRole: UserRole,
    input: {
      userId: string;
      role: EventCollaboratorRole;
      permissions?: string[];
      title?: string;
    }
  ) {
    await requireEventPermission(eventId, actorId, platformRole, EventPermissionKey.MANAGE_COLLABORATORS);

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new Error("Event not found");
    if (event.organizerId === input.userId) throw new Error("User is already the event owner");

    const defaults = await getRoleDefaultPermissions(input.role);
    const collaborator = await prisma.eventCollaborator.upsert({
      where: { eventId_userId: { eventId, userId: input.userId } },
      create: {
        eventId,
        userId: input.userId,
        role: input.role,
        permissions: input.permissions ?? defaults,
        title: input.title,
        invitedById: actorId,
        acceptedAt: new Date(),
        isActive: true,
      },
      update: {
        role: input.role,
        permissions: input.permissions ?? defaults,
        title: input.title,
        isActive: true,
        acceptedAt: new Date(),
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    await activityService.log({
      eventId,
      userId: actorId,
      action: "collaborator.added",
      entity: "EventCollaborator",
      entityId: collaborator.id,
      details: { role: input.role, userId: input.userId },
    });

    await notificationService.notify(input.userId, {
      title: "Added to event team",
      message: `You were added as ${input.role.replace(/_/g, " ").toLowerCase()} on ${event.title}`,
      type: "COLLABORATOR_ADDED",
      link: `/dashboard/events/${eventId}/workspace`,
    });

    await createAuditLog({
      userId: actorId,
      action: "CREATE",
      entity: "EventCollaborator",
      entityId: collaborator.id,
      details: { eventId, role: input.role },
    });

    return collaborator;
  }

  async update(
    eventId: string,
    collaboratorId: string,
    actorId: string,
    platformRole: UserRole,
    data: { role?: EventCollaboratorRole; permissions?: string[]; title?: string; isActive?: boolean }
  ) {
    await requireEventPermission(eventId, actorId, platformRole, EventPermissionKey.MANAGE_COLLABORATORS);

    const updated = await prisma.eventCollaborator.update({
      where: { id: collaboratorId, eventId },
      data,
      include: { user: { select: { id: true, name: true } } },
    });

    await activityService.log({
      eventId,
      userId: actorId,
      action: "collaborator.updated",
      entity: "EventCollaborator",
      entityId: collaboratorId,
      details: data,
    });

    return updated;
  }

  async remove(eventId: string, collaboratorId: string, actorId: string, platformRole: UserRole) {
    await requireEventPermission(eventId, actorId, platformRole, EventPermissionKey.MANAGE_COLLABORATORS);
    const updated = await prisma.eventCollaborator.update({
      where: { id: collaboratorId, eventId },
      data: { isActive: false },
    });

    await activityService.log({
      eventId,
      userId: actorId,
      action: "collaborator.removed",
      entity: "EventCollaborator",
      entityId: collaboratorId,
    });

    return updated;
  }

  createInvitationToken() {
    return generateToken(32);
  }
}

export const collaboratorService = new CollaboratorService();
