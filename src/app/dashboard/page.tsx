import Link from "next/link";
import {
  Calendar, Mail, Ticket, DollarSign, Users, QrCode, Plus, ArrowRight, Sparkles,
} from "lucide-react";
import { getSession } from "@/lib/auth";
import { eventService } from "@/services/events/event.service";
import { StatCard } from "@/components/dashboard/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function DashboardPage() {
  const session = await getSession();
  const userId = session!.user.id;
  const [stats, eventsResult] = await Promise.all([
    eventService.getDashboardStats(userId),
    eventService.getOrganizerEvents(userId, 1, 5),
  ]);
  const events = eventsResult.items;

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-600 via-brand-500 to-accent-500 p-6 sm:p-8 text-white shadow-[0_12px_40px_rgba(11,138,131,0.3)]">
        <div className="absolute inset-0 grid-pattern opacity-10" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-gold-400" />
              <span className="text-sm font-medium text-white/80">Dashboard</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
              Welcome back, {session?.user?.name?.split(" ")[0]}
            </h1>
            <p className="text-white/70 mt-1">Here&apos;s what&apos;s happening with your events.</p>
          </div>
          <Button variant="secondary" size="lg" asChild>
            <Link href="/dashboard/events/create">
              <Plus className="h-4 w-4" /> Create Event
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard title="Events" value={stats.eventsCreated} icon={Calendar} />
        <StatCard title="Invitations" value={stats.invitationsGenerated} icon={Mail} />
        <StatCard title="Tickets Sold" value={stats.ticketsSold} icon={Ticket} />
        <StatCard title="Revenue" value={formatCurrency(stats.revenue)} icon={DollarSign} />
        <StatCard title="RSVP Accepted" value={stats.rsvpAccepted} icon={Users} />
        <StatCard title="QR Scans" value={stats.qrScans} icon={QrCode} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Events</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/events">View All <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <p>No events yet. Create your first event to get started.</p>
                <Button className="mt-4" asChild>
                  <Link href="/dashboard/events/create">Create Event</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {events.map((event) => (
                  <Link
                    key={event.id}
                    href={`/dashboard/events/${event.id}`}
                    className="interactive-row"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">{event.title}</p>
                      <p className="text-sm text-slate-500">{formatDate(event.startDate)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={event.status === "PUBLISHED" ? "success" : "outline"}>
                        {event.status}
                      </Badge>
                      <span className="text-sm text-slate-400">{event._count?.guests ?? 0} guests</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { href: "/dashboard/events/create", label: "Create Event", icon: Calendar },
              { href: "/dashboard/invitations", label: "Design Invitation", icon: Mail },
              { href: "/dashboard/tickets", label: "Manage Tickets", icon: Ticket },
              { href: "/dashboard/qr-admission", label: "QR Scanner", icon: QrCode },
              { href: "/dashboard/campaigns", label: "Send Invitations", icon: Mail },
              { href: "/dashboard/ai-planner", label: "AI Event Planner", icon: Sparkles },
            ].map((action) => (
              <Button key={action.href} variant="outline" className="w-full justify-start" asChild>
                <Link href={action.href}>
                  <action.icon className="h-4 w-4" /> {action.label}
                </Link>
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
