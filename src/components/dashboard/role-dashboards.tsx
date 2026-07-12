import Link from "next/link";
import {
  Calendar, Mail, Ticket, DollarSign, Users, QrCode, Plus, ArrowRight, Sparkles, Heart,
} from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { PrimaryAction } from "@/components/layout/primary-action";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/dashboard/empty-state";
import { formatCurrency, formatDate } from "@/lib/utils";

interface DashboardStats {
  eventsCreated: number;
  invitationsGenerated: number;
  ticketsSold: number;
  revenue: number;
  rsvpAccepted: number;
  qrScans: number;
}

interface EventSummary {
  id: string;
  title: string;
  startDate: Date;
  status: string;
  _count?: { guests: number };
}

interface OwnerDashboardProps {
  firstName: string;
  stats: DashboardStats;
  events: EventSummary[];
}

export function EventOwnerDashboard({ firstName, stats, events }: OwnerDashboardProps) {
  return (
    <div className="space-y-8">
      <HeroBanner
        firstName={firstName}
        subtitle="Here's progress on your events — guests, invitations, and next steps."
        primaryHref="/dashboard/events/create"
        primaryLabel="Create Event"
      />
      <StatsRow stats={stats} />
      <div className="grid lg:grid-cols-3 gap-6">
        <EventsList events={events} emptyTitle="You haven't created an event yet" emptyDesc="Start with your event type, then add guests and send invitations." />
        <QuickActions
          actions={[
            { href: "/dashboard/events/create", label: "Create Event", icon: Calendar },
            { href: "/dashboard/guests", label: "Add Guests", icon: Users },
            { href: "/dashboard/invitations", label: "Create Invitation", icon: Mail },
            { href: "/dashboard/qr-admission", label: "Open QR Scanner", icon: QrCode },
            { href: "/marketplace", label: "Find Vendor", icon: Sparkles },
            { href: "/dashboard/wallet", label: "View Wallet", icon: DollarSign },
          ]}
        />
      </div>
    </div>
  );
}

export function OrganizerDashboard({ firstName, stats, events }: OwnerDashboardProps) {
  return (
    <div className="space-y-8">
      <HeroBanner
        firstName={firstName}
        subtitle="Client events, deadlines, and vendor coordination at a glance."
        primaryHref="/dashboard/events/create"
        primaryLabel="Create Event"
      />
      <StatsRow stats={stats} />
      <div className="grid lg:grid-cols-3 gap-6">
        <EventsList events={events} emptyTitle="No client events yet" emptyDesc="Create an event or accept a workspace invitation to get started." secondaryHref="/dashboard/invitations/workspace" secondaryLabel="View Invitations" />
        <QuickActions
          actions={[
            { href: "/dashboard/events/create", label: "Create Event", icon: Calendar },
            { href: "/dashboard/organizers", label: "Organizer Directory", icon: Users },
            { href: "/dashboard/invitations/workspace", label: "Invite Client", icon: Mail },
            { href: "/dashboard/messages", label: "Messages", icon: Mail },
            { href: "/marketplace", label: "Find Vendor", icon: Sparkles },
            { href: "/dashboard/campaigns", label: "Send Campaign", icon: Mail },
          ]}
        />
      </div>
    </div>
  );
}

export function OrganizationDashboard({ firstName, stats, events }: OwnerDashboardProps) {
  return (
    <div className="space-y-8">
      <HeroBanner
        firstName={firstName}
        subtitle="Manage your organization's events, team, and permissions."
        primaryHref="/dashboard/events/create"
        primaryLabel="Create Event"
      />
      <StatsRow stats={stats} />
      <div className="grid lg:grid-cols-3 gap-6">
        <EventsList events={events} emptyTitle="No organization events yet" emptyDesc="Create your first event, then invite your team to collaborate." />
        <QuickActions
          actions={[
            { href: "/dashboard/settings?tab=team", label: "Invite Team", icon: Users },
            { href: "/dashboard/settings?tab=organization", label: "Organization Settings", icon: Calendar },
            { href: "/dashboard/events/create", label: "Create Event", icon: Plus },
            { href: "/dashboard/settings?tab=permissions", label: "Permissions", icon: Users },
            { href: "/dashboard/wallet", label: "Event Wallet", icon: DollarSign },
          ]}
        />
      </div>
    </div>
  );
}

export function VendorDashboardHome({ firstName }: { firstName: string }) {
  return (
    <div className="space-y-8">
      <HeroBanner
        firstName={firstName}
        subtitle="Manage leads, quotes, bookings, and your marketplace profile."
        primaryHref="/dashboard/vendor-portal"
        primaryLabel="Open Vendor Portal"
      />
      <Card>
        <CardContent className="py-12">
          <EmptyState
            icon={Sparkles}
            title="Your vendor dashboard lives in the portal"
            description="Track leads, respond to quotes, manage bookings, and update your portfolio."
            actionLabel="Open Vendor Portal"
            actionHref="/dashboard/vendor-portal"
            secondaryLabel="Marketplace Profile"
            secondaryHref="/marketplace"
          />
        </CardContent>
      </Card>
    </div>
  );
}

function HeroBanner({
  firstName,
  subtitle,
  primaryHref,
  primaryLabel,
}: {
  firstName: string;
  subtitle: string;
  primaryHref: string;
  primaryLabel: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-600 via-brand-500 to-accent-500 p-6 sm:p-8 text-white shadow-[0_12px_40px_rgba(11,138,131,0.3)]">
      <div className="absolute inset-0 grid-pattern opacity-10" />
      <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-gold-400" />
            <span className="text-sm font-medium text-white/80">Home</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
            Welcome back, {firstName}
          </h1>
          <p className="text-white/70 mt-1">{subtitle}</p>
        </div>
        <PrimaryAction size="lg" asChild>
          <Link href={primaryHref}>
            <Plus className="h-4 w-4" /> {primaryLabel}
          </Link>
        </PrimaryAction>
      </div>
    </div>
  );
}

function StatsRow({ stats }: { stats: DashboardStats }) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      <StatCard title="Events" value={stats.eventsCreated} icon={Calendar} />
      <StatCard title="Invitations" value={stats.invitationsGenerated} icon={Mail} />
      <StatCard title="Tickets Sold" value={stats.ticketsSold} icon={Ticket} />
      <StatCard title="Revenue" value={formatCurrency(stats.revenue)} icon={DollarSign} />
      <StatCard title="RSVP Accepted" value={stats.rsvpAccepted} icon={Users} />
      <StatCard title="QR Scans" value={stats.qrScans} icon={QrCode} />
    </div>
  );
}

function EventsList({
  events,
  emptyTitle,
  emptyDesc,
  secondaryHref,
  secondaryLabel,
}: {
  events: EventSummary[];
  emptyTitle: string;
  emptyDesc: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  return (
    <Card className="lg:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recent Events</CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/events">View All <ArrowRight className="h-4 w-4" /></Link>
        </Button>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title={emptyTitle}
            description={emptyDesc}
            actionLabel="Create Event"
            actionHref="/dashboard/events/create"
            secondaryLabel={secondaryLabel}
            secondaryHref={secondaryHref}
          />
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <Link key={event.id} href={`/dashboard/events/${event.id}`} className="interactive-row">
                <div>
                  <p className="font-semibold text-slate-900">{event.title}</p>
                  <p className="text-sm text-slate-500">{formatDate(event.startDate)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={event.status === "PUBLISHED" ? "success" : "outline"}>{event.status}</Badge>
                  <span className="text-sm text-slate-400">{event._count?.guests ?? 0} guests</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function QuickActions({
  actions,
}: {
  actions: { href: string; label: string; icon: typeof Calendar }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-4 w-4 text-brand-500" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {actions.map((action) => (
          <Button key={action.href + action.label} variant="outline" className="w-full justify-start" asChild>
            <Link href={action.href}>
              <action.icon className="h-4 w-4" /> {action.label}
            </Link>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
