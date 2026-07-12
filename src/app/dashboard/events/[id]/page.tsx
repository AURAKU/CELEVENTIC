import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { eventService } from "@/services/events/event.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EventQrBranding } from "@/components/events/event-qr-branding";
import { EventOverviewClient } from "@/components/events/event-overview-client";

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  const { id } = await params;
  const event = await eventService.getEventById(id, session!.user.id);

  if (!event) notFound();

  const statsCard = (
    <Card>
      <CardHeader><CardTitle>Stats</CardTitle></CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 rounded-lg bg-brand-50">
            <p className="text-2xl font-bold text-brand-700">{event._count?.guests ?? 0}</p>
            <p className="text-xs text-slate-500">Guests</p>
          </div>
          <div className="text-center p-4 rounded-lg bg-brand-50">
            <p className="text-2xl font-bold text-brand-700">{event.tickets?.length ?? 0}</p>
            <p className="text-xs text-slate-500">Ticket Types</p>
          </div>
          <div className="text-center p-4 rounded-lg bg-brand-50">
            <p className="text-2xl font-bold text-brand-700">{event.invitations?.length ?? 0}</p>
            <p className="text-xs text-slate-500">Invitations</p>
          </div>
          <div className="text-center p-4 rounded-lg bg-brand-50">
            <p className="text-2xl font-bold text-brand-700">{event._count?.qrScans ?? 0}</p>
            <p className="text-xs text-slate-500">QR Scans</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <>
      <EventOverviewClient
        eventId={event.id}
        title={event.title}
        hostName={event.hostName}
        eventType={event.eventType}
        status={event.status}
        startDate={event.startDate.toISOString()}
        venueName={event.venueName}
        expectedGuests={event.expectedGuests}
      >
        {statsCard}
      </EventOverviewClient>
      <div className="mt-6">
        <EventQrBranding eventId={event.id} initialUrl={event.qrCenterImageUrl} />
      </div>
    </>
  );
}
