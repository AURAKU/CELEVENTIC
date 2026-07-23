import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { eventService } from "@/services/events/event.service";
import { verifyEventAccess } from "@/lib/event-access";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EventQrBranding } from "@/components/events/event-qr-branding";
import { EventOverviewClient } from "@/components/events/event-overview-client";
import type { UserRole } from "@prisma/client";

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
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

  // Load without organizer-scoped where — access already verified (incl. platform admin).
  const event = await eventService.getEventById(id);
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
        endDate={event.endDate?.toISOString() ?? null}
        description={event.description}
        venueName={event.venueName}
        landmark={event.landmark}
        mapsLink={event.mapsLink}
        contactPhone={event.contactPhone}
        dressCode={event.dressCode}
        expectedGuests={event.expectedGuests}
      >
        {statsCard}
      </EventOverviewClient>
      <div className="mt-6">
        <EventQrBranding
          eventId={event.id}
          initialUrl={event.qrCenterImageUrl}
          initialLogoSize={event.qrLogoSize}
        />
      </div>
    </>
  );
}
