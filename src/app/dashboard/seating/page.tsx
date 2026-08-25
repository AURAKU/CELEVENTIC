"use client";

import { EventPicker } from "@/components/dashboard/event-picker";
import { useEventContext } from "@/hooks/use-event-context";
import { PageLoader } from "@/components/ui/page-loader";
import { Card, CardContent } from "@/components/ui/card";
import { SeatingStudioClient } from "@/components/seating/seating-studio-client";

export default function SeatingDashboardPage() {
  const { events, eventId, setEventId, loading: eventsLoading } = useEventContext();

  if (eventsLoading) return <PageLoader label="Loading events…" className="min-h-[40vh]" />;

  return (
    <div className="space-y-6" data-tour="seating-plan">
      <EventPicker events={events} value={eventId} onChange={setEventId} />

      {!eventId ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-500">
            Select an event to open Celeventic Seating Studio.
          </CardContent>
        </Card>
      ) : (
        <div data-tour="seating-assign">
          <div data-tour="seating-publish" className="sr-only" aria-hidden>
            Publish seating
          </div>
          <SeatingStudioClient eventId={eventId} />
        </div>
      )}
    </div>
  );
}
