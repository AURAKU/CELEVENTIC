import { notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { eventService } from "@/services/events/event.service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { Mail, Users, Ticket, QrCode, MessageSquare } from "lucide-react";

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  const { id } = await params;
  const event = await eventService.getEventById(id, session!.user.id);

  if (!event) notFound();

  const actions = [
    { href: `/dashboard/invitations?eventId=${event.id}`, label: "Invitations", icon: Mail },
    { href: `/dashboard/guests?eventId=${event.id}`, label: "Guests", icon: Users },
    { href: `/dashboard/tickets?eventId=${event.id}`, label: "Tickets", icon: Ticket },
    { href: `/dashboard/qr?eventId=${event.id}`, label: "QR Scan", icon: QrCode },
    { href: `/dashboard/campaigns?eventId=${event.id}`, label: "Send Invites", icon: MessageSquare },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline">{event.eventType.replace(/_/g, " ")}</Badge>
            <Badge variant={event.status === "PUBLISHED" ? "success" : "warning"}>{event.status}</Badge>
          </div>
          <h1 className="text-2xl font-bold">{event.title}</h1>
          <p className="text-slate-500 mt-1">Hosted by {event.hostName}</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {actions.map((action) => (
          <Button key={action.href} variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
            <Link href={action.href}>
              <action.icon className="h-5 w-5" />
              {action.label}
            </Link>
          </Button>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Event Details</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Date</span><span>{formatDate(event.startDate)}</span></div>
            {event.venueName && <div className="flex justify-between"><span className="text-slate-500">Venue</span><span>{event.venueName}</span></div>}
            {event.landmark && <div className="flex justify-between"><span className="text-slate-500">Landmark</span><span>{event.landmark}</span></div>}
            {event.dressCode && <div className="flex justify-between"><span className="text-slate-500">Dress Code</span><span>{event.dressCode}</span></div>}
            {event.expectedGuests && <div className="flex justify-between"><span className="text-slate-500">Expected Guests</span><span>{event.expectedGuests}</span></div>}
            <div className="flex justify-between"><span className="text-slate-500">Pricing</span><span>{event.pricingType}</span></div>
            {event.description && (
              <div className="pt-3 border-t">
                <p className="text-slate-500 mb-1">Description</p>
                <p>{event.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

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
      </div>
    </div>
  );
}
