import { prisma } from "@/lib/prisma";
import { paginatedResult, parsePaginationInput } from "@/lib/pagination";
import type { EventCollaboratorRole, UserRole, WorkspaceInvitationStatus } from "@prisma/client";
import { requireEventPermission } from "@/lib/workspace/event-access";
import { EventPermissionKey } from "@/lib/workspace/permission-keys";
import { getRoleDefaultPermissions } from "@/lib/workspace/permission-store";
import { collaboratorService } from "./collaborator.service";
import { activityService } from "./activity.service";
import { notificationService } from "@/services/notifications/notification.service";
import { createAuditLog } from "@/lib/audit";

const INVITE_TTL_DAYS = 14;

export class WorkspaceInvitationService {
  async listForEvent(eventId: string, userId: string, role: UserRole, pagination?: { page?: number; limit?: number }) {
    await requireEventPermission(eventId, userId, role, EventPermissionKey.MANAGE_COLLABORATORS);
    const { page, limit, skip } = parsePaginationInput(pagination);

    const [items, total] = await Promise.all([
      prisma.workspaceInvitation.findMany({
        where: { eventId, status: { in: ["PENDING", "DEFERRED"] } },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.workspaceInvitation.count({
        where: { eventId, status: { in: ["PENDING", "DEFERRED"] } },
      }),
    ]);

    return paginatedResult(items, total, page, limit);
  }

  async listForUser(userId: string, pagination?: { page?: number; limit?: number }) {
    const { page, limit, skip } = parsePaginationInput(pagination);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, phone: true },
    });

    const where = {
      OR: [
        { inviteeUserId: userId },
        user?.email ? { inviteeEmail: user.email } : undefined,
        user?.phone ? { inviteePhone: user.phone } : undefined,
      ].filter(Boolean) as object[],
      status: { in: ["PENDING", "DEFERRED"] as WorkspaceInvitationStatus[] },
      expiresAt: { gt: new Date() },
    };

    const [items, total] = await Promise.all([
      prisma.workspaceInvitation.findMany({
        where,
        include: {
          event: { select: { id: true, title: true, eventType: true, coverImageUrl: true } },
          inviter: { select: { id: true, name: true, avatarUrl: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.workspaceInvitation.count({ where }),
    ]);

    return paginatedResult(items, total, page, limit);
  }

  async inviteToEvent(
    eventId: string,
    inviterId: string,
    platformRole: UserRole,
    input: {
      inviteeUserId?: string;
      inviteeEmail?: string;
      inviteePhone?: string;
      inviteeName?: string;
      role: EventCollaboratorRole;
      permissions?: string[];
      message?: string;
    }
  ) {
    await requireEventPermission(eventId, inviterId, platformRole, EventPermissionKey.INVITE_COLLABORATORS);

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new Error("Event not found");

    let inviteeUserId = input.inviteeUserId;
    if (!inviteeUserId && input.inviteeEmail) {
      const u = await prisma.user.findUnique({ where: { email: input.inviteeEmail.toLowerCase() } });
      inviteeUserId = u?.id;
    }
    if (!inviteeUserId && input.inviteePhone) {
      const u = await prisma.user.findUnique({ where: { phone: input.inviteePhone } });
      inviteeUserId = u?.id;
    }

    if (inviteeUserId && inviteeUserId === event.organizerId) {
      throw new Error("User is already the event owner");
    }

    const defaults = await getRoleDefaultPermissions(input.role);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITE_TTL_DAYS);

    const invitation = await prisma.workspaceInvitation.create({
      data: {
        token: collaboratorService.createInvitationToken(),
        eventId,
        inviterId,
        inviteeUserId,
        inviteeEmail: input.inviteeEmail?.toLowerCase(),
        inviteePhone: input.inviteePhone,
        inviteeName: input.inviteeName,
        role: input.role,
        permissions: input.permissions ?? defaults,
        message: input.message,
        expiresAt,
      },
      include: {
        event: { select: { title: true, eventType: true } },
        inviter: { select: { name: true } },
      },
    });

    if (inviteeUserId) {
      await notificationService.notify(inviteeUserId, {
        title: "Event collaboration invite",
        message: `${invitation.inviter.name} invited you to collaborate on ${event.title}`,
        type: "WORKSPACE_INVITATION",
        link: `/dashboard/invitations?token=${invitation.token}`,
      });
    }

    await activityService.log({
      eventId,
      userId: inviterId,
      action: "invitation.sent",
      entity: "WorkspaceInvitation",
      entityId: invitation.id,
      details: { role: input.role, inviteeUserId, inviteeEmail: input.inviteeEmail },
    });

    await createAuditLog({
      userId: inviterId,
      action: "CREATE",
      entity: "WorkspaceInvitation",
      entityId: invitation.id,
      details: { eventId },
    });

    return invitation;
  }

  async respond(
    token: string,
    userId: string,
    response: "ACCEPTED" | "DECLINED" | "DEFERRED"
  ) {
    const invitation = await prisma.workspaceInvitation.findUnique({
      where: { token },
      include: { event: true, inviter: { select: { id: true, name: true } } },
    });

    if (!invitation) throw new Error("Invitation not found");
    if (invitation.status !== "PENDING" && invitation.status !== "DEFERRED") {
      throw new Error("Invitation already responded to");
    }
    if (invitation.expiresAt < new Date()) {
      await prisma.workspaceInvitation.update({
        where: { id: invitation.id },
        data: { status: "EXPIRED" },
      });
      throw new Error("Invitation has expired");
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found");

    const isRecipient =
      invitation.inviteeUserId === userId ||
      (invitation.inviteeEmail && user.email === invitation.inviteeEmail) ||
      (invitation.inviteePhone && user.phone === invitation.inviteePhone);

    if (!isRecipient) throw new Error("You are not the recipient of this invitation");

    const statusMap = { ACCEPTED: "ACCEPTED", DECLINED: "DECLINED", DEFERRED: "DEFERRED" } as const;

    const updated = await prisma.workspaceInvitation.update({
      where: { id: invitation.id },
      data: {
        status: statusMap[response],
        inviteeUserId: userId,
        respondedAt: new Date(),
      },
    });

    if (response === "ACCEPTED" && invitation.eventId && invitation.role) {
      await prisma.eventCollaborator.upsert({
        where: { eventId_userId: { eventId: invitation.eventId, userId } },
        create: {
          eventId: invitation.eventId,
          userId,
          role: invitation.role,
          permissions: invitation.permissions ?? undefined,
          invitedById: invitation.inviterId,
          acceptedAt: new Date(),
        },
        update: {
          role: invitation.role,
          permissions: invitation.permissions ?? undefined,
          isActive: true,
          acceptedAt: new Date(),
        },
      });

      if (invitation.event) {
        await activityService.log({
          eventId: invitation.eventId,
          userId,
          action: "invitation.accepted",
          entity: "WorkspaceInvitation",
          entityId: invitation.id,
        });
      }
    }

    const notifyType =
      response === "ACCEPTED"
        ? "INVITATION_ACCEPTED"
        : response === "DECLINED"
          ? "INVITATION_DECLINED"
          : "INVITATION_DEFERRED";

    await notificationService.notify(invitation.inviterId, {
      title: `Invitation ${response.toLowerCase()}`,
      message: `${user.name} ${response.toLowerCase()} your invite to ${invitation.event?.title ?? "an event"}`,
      type: notifyType,
      link: invitation.eventId ? `/dashboard/events/${invitation.eventId}/workspace` : "/dashboard",
    });

    return updated;
  }
}

export const workspaceInvitationService = new WorkspaceInvitationService();
