import { prisma } from "@/lib/prisma";
import { isAdminRole } from "@/lib/roles";
import type { UserRole } from "@prisma/client";

export async function verifyEventAccess(eventId: string, userId: string, role: UserRole) {
  if (isAdminRole(role)) {
    const event = await prisma.event.findFirst({ where: { id: eventId } });
    if (!event) throw new Error("Event not found or you do not have access to it");
    return event;
  }

  const event = await prisma.event.findFirst({
    where: {
      id: eventId,
      OR: [
        { organizerId: userId },
        { staff: { some: { userId, isActive: true } } },
      ],
    },
  });

  if (!event) {
    throw new Error("Event not found or you do not have access to it");
  }

  return event;
}
