import Link from "next/link";
import { Plus, Calendar } from "lucide-react";
import { getSession } from "@/lib/auth";
import { eventService } from "@/services/events/event.service";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/dashboard/empty-state";
import { formatDate } from "@/lib/utils";
import { EVENT_TYPES } from "@/lib/constants";

export default async function EventsPage() {
  const session = await getSession();
  const events = await eventService.getOrganizerEvents(session!.user.id);

  const typeLabel = (type: string) =>
    EVENT_TYPES.find((t) => t.value === type)?.label ?? type;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Events</h1>
        <Button asChild>
          <Link href="/dashboard/events/create"><Plus className="h-4 w-4" /> Create Event</Link>
        </Button>
      </div>

      {events.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No events yet"
          description="Create your first event and start inviting guests, selling tickets, and managing everything from one place."
          actionLabel="Create Event"
          actionHref="/dashboard/events/create"
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((event) => (
            <Link key={event.id} href={`/dashboard/events/${event.id}`}>
              <Card className="hover:shadow-md hover:border-brand-300 transition-all h-full">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <Badge variant="outline">{typeLabel(event.eventType)}</Badge>
                    <Badge variant={event.status === "PUBLISHED" ? "success" : "warning"}>
                      {event.status}
                    </Badge>
                  </div>
                  <h3 className="font-semibold text-lg">{event.title}</h3>
                  <p className="text-sm page-subtitle">{formatDate(event.startDate)}</p>
                  {event.venueName && (
                    <p className="text-sm text-slate-400 mt-1">{event.venueName}</p>
                  )}
                  <div className="flex gap-4 mt-4 text-xs text-slate-500">
                    <span>{event._count?.guests ?? 0} guests</span>
                    <span>{event._count?.tickets ?? 0} tickets</span>
                    <span>{event._count?.invitations ?? 0} invites</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
