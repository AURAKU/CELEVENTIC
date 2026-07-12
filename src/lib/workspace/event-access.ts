import { prisma } from "@/lib/prisma";
import { isAdminRole } from "@/lib/roles";
import type { EventCollaboratorRole, UserRole } from "@prisma/client";
import { getRoleDefaultPermissions, mergePermissions } from "./permission-store";
import type { EventPermissionKey } from "./permission-keys";

export type EventAccessContext = {
  eventId: string;
  userId: string;
  role: UserRole;
  isOwner: boolean;
  collaboratorRole?: EventCollaboratorRole;
  permissions: Set<string>;
};

export async function resolveEventAccess(
  eventId: string,
  userId: string,
  platformRole: UserRole
): Promise<EventAccessContext | null> {
  if (isAdminRole(platformRole)) {
    const event = await prisma.event.findFirst({ where: { id: eventId } });
    if (!event) return null;
    const all = await getRoleDefaultPermissions("OWNER");
    return {
      eventId,
      userId,
      role: platformRole,
      isOwner: true,
      collaboratorRole: "OWNER",
      permissions: new Set(all),
    };
  }

  const event = await prisma.event.findFirst({
    where: { id: eventId },
    select: {
      id: true,
      organizerId: true,
      organizationId: true,
      collaborators: {
        where: { userId, isActive: true },
        take: 1,
      },
      staff: {
        where: { userId, isActive: true },
        take: 1,
      },
    },
  });

  if (!event) return null;

  if (event.organizerId === userId) {
    const perms = await getRoleDefaultPermissions("OWNER");
    return {
      eventId,
      userId,
      role: platformRole,
      isOwner: true,
      collaboratorRole: "OWNER",
      permissions: mergePermissions(perms),
    };
  }

  const collaborator = event.collaborators[0];
  if (collaborator) {
    const defaults = await getRoleDefaultPermissions(collaborator.role);
    return {
      eventId,
      userId,
      role: platformRole,
      isOwner: false,
      collaboratorRole: collaborator.role,
      permissions: mergePermissions(defaults, collaborator.permissions),
    };
  }

  if (event.staff.length > 0) {
    const defaults = await getRoleDefaultPermissions("TEAM_MEMBER");
    return {
      eventId,
      userId,
      role: platformRole,
      isOwner: false,
      collaboratorRole: "TEAM_MEMBER",
      permissions: mergePermissions([...defaults, "SCAN_QR"]),
    };
  }

  if (event.organizationId) {
    const membership = await prisma.organizationMember.findFirst({
      where: {
        organizationId: event.organizationId,
        userId,
        isActive: true,
      },
    });
    if (membership) {
      const custom = Array.isArray(membership.permissions)
        ? (membership.permissions as string[])
        : await getRoleDefaultPermissions("TEAM_MEMBER");
      return {
        eventId,
        userId,
        role: platformRole,
        isOwner: false,
        collaboratorRole: "TEAM_MEMBER",
        permissions: mergePermissions(custom),
      };
    }
  }

  return null;
}

export async function verifyEventAccess(eventId: string, userId: string, role: UserRole) {
  const ctx = await resolveEventAccess(eventId, userId, role);
  if (!ctx) throw new Error("Event not found or you do not have access to it");
  const event = await prisma.event.findFirst({ where: { id: eventId } });
  if (!event) throw new Error("Event not found or you do not have access to it");
  return event;
}

export async function requireEventPermission(
  eventId: string,
  userId: string,
  platformRole: UserRole,
  permission: EventPermissionKey
) {
  const ctx = await resolveEventAccess(eventId, userId, platformRole);
  if (!ctx?.permissions.has(permission)) {
    throw new Error("You do not have permission to perform this action");
  }
  return ctx;
}

export function eventAccessWhere(userId: string) {
  return {
    OR: [
      { organizerId: userId },
      { collaborators: { some: { userId, isActive: true } } },
      { staff: { some: { userId, isActive: true } } },
      {
        organization: {
          members: { some: { userId, isActive: true } },
        },
      },
    ],
  };
}
