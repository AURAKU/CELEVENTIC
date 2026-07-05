"use client";

import { EventPicker } from "@/components/dashboard/event-picker";
import { useEventContext } from "@/hooks/use-event-context";
import { PageLoader } from "@/components/ui/page-loader";
import { Card, CardContent } from "@/components/ui/card";
import { SeatingOrganizerClient } from "@/components/seating/seating-organizer-client";

export default function SeatingDashboardPage() {
  const { events, eventId, setEventId, loading: eventsLoading } = useEventContext();

  if (eventsLoading) return <PageLoader label="Loading events…" className="min-h-[40vh]" />;

  return (
    <div className="space-y-6">
      <EventPicker events={events} value={eventId} onChange={setEventId} />

      {!eventId ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-500">
            Select an event to manage seating.
          </CardContent>
        </Card>
      ) : (
        <SeatingOrganizerClient eventId={eventId} />
      )}
    </div>
  );
}
