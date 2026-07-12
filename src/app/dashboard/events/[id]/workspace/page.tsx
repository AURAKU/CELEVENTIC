import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { eventService } from "@/services/events/event.service";
import { EventWorkspaceClient } from "@/components/events/event-workspace-client";

export default async function EventWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  const { id } = await params;
  const event = await eventService.getEventById(id, session!.user.id);
  if (!event) notFound();

  return <EventWorkspaceClient eventId={event.id} eventTitle={event.title} />;
}
