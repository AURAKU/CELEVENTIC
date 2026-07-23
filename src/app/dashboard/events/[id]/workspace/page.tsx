import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { eventService } from "@/services/events/event.service";
import { verifyEventAccess } from "@/lib/event-access";
import { EventWorkspaceClient } from "@/components/events/event-workspace-client";
import type { UserRole } from "@prisma/client";

export default async function EventWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.user?.id) notFound();

  const { id } = await params;

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  const role = (dbUser?.role ?? session.user.role) as UserRole;

  try {
    await verifyEventAccess(id, session.user.id, role);
  } catch {
    notFound();
  }

  const event = await eventService.getEventById(id);
  if (!event) notFound();

  return <EventWorkspaceClient eventId={event.id} eventTitle={event.title} />;
}
