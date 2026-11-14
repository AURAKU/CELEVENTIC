"use client";

import Link from "next/link";
import {
  Calendar, Mail, Ticket, DollarSign, Users, QrCode, Plus, Sparkles, Heart, Smartphone, Share2,
} from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { PrimaryAction } from "@/components/layout/primary-action";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/dashboard/empty-state";
import {
  RecentEventsList,
  type RecentEventSummary,
} from "@/components/dashboard/recent-events-list";
import { formatCurrency } from "@/lib/utils";
import { FreePlanReminder } from "@/components/billing/free-plan-reminder";
import { useLocale } from "@/components/i18n/locale-provider";

interface DashboardStats {
  eventsCreated: number;
  invitationsGenerated: number;
  ticketsSold: number;
  revenue: number;
  rsvpAccepted: number;
  qrScans: number;
}

interface OwnerDashboardProps {
  firstName: string;
  stats: DashboardStats;
  events: RecentEventSummary[];
  userId?: string;
  isAdmin?: boolean;
  canEditEvents?: boolean;
}

export function EventOwnerDashboard({
  firstName,
  stats,
  events,
  userId,
  isAdmin,
  canEditEvents,
}: OwnerDashboardProps) {
  const { t } = useLocale();
  return (
    <div className="space-y-8">
      <HeroBanner
        firstName={firstName}
        subtitle={t("dashboard.progress_subtitle")}
        primaryHref="/dashboard/events/create"
        primaryLabel={t("dashboard.create_event")}
        secondaryHref="/dashboard/business-card/tap"
        secondaryLabel={t("dashboard.nav_tap_to_connect")}
      />
      {!isAdmin && <FreePlanReminder />}
      <StatsRow stats={stats} />
      <div className="grid lg:grid-cols-3 gap-6">
        <RecentEventsList
          events={events}
          emptyTitle={t("dashboard.empty_events_title")}
          emptyDesc={t("dashboard.empty_events_desc")}
          userId={userId}
          isAdmin={isAdmin}
          canEdit={canEditEvents ?? true}
        />
        <QuickActions
          actions={[
            { href: "/dashboard/business-card/tap", label: t("dashboard.nav_tap_to_connect"), icon: Smartphone },
            { href: "/dashboard/business-card#share", label: t("dashboard.share_celeyou"), icon: Share2 },
            { href: "/dashboard/events/create", label: t("dashboard.create_event"), icon: Calendar },
            { href: "/dashboard/guests", label: t("dashboard.add_guests"), icon: Users },
            { href: "/dashboard/invitations", label: t("dashboard.create_invitation"), icon: Mail },
            { href: "/dashboard/qr-admission", label: t("dashboard.open_qr"), icon: QrCode },
            { href: "/marketplace", label: t("dashboard.find_vendor"), icon: Sparkles },
            { href: "/dashboard/wallet", label: t("dashboard.view_wallet"), icon: DollarSign },
          ]}
        />
      </div>
    </div>
  );
}

export function OrganizerDashboard({
  firstName,
  stats,
  events,
  userId,
  isAdmin,
  canEditEvents,
}: OwnerDashboardProps) {
  const { t } = useLocale();
  return (
    <div className="space-y-8">
      <HeroBanner
        firstName={firstName}
        subtitle={t("dashboard.organizer_subtitle")}
        primaryHref="/dashboard/events/create"
        primaryLabel={t("dashboard.create_event")}
        secondaryHref="/dashboard/business-card/tap"
        secondaryLabel={t("dashboard.nav_tap_to_connect")}
      />
      {!isAdmin && <FreePlanReminder />}
      <StatsRow stats={stats} />
      <div className="grid lg:grid-cols-3 gap-6">
        <RecentEventsList
          events={events}
          emptyTitle={t("dashboard.empty_client_title")}
          emptyDesc={t("dashboard.empty_client_desc")}
          secondaryHref="/dashboard/invitations/workspace"
          secondaryLabel={t("dashboard.pending_collab")}
          userId={userId}
          isAdmin={isAdmin}
          canEdit={canEditEvents ?? true}
        />
        <QuickActions
          actions={[
            { href: "/dashboard/business-card/tap", label: t("dashboard.nav_tap_to_connect"), icon: Smartphone },
            { href: "/dashboard/business-card#share", label: t("dashboard.share_celeyou"), icon: Share2 },
            { href: "/dashboard/events/create", label: t("dashboard.create_event"), icon: Calendar },
            { href: "/dashboard/organizers", label: t("dashboard.organizer_directory"), icon: Users },
            { href: "/dashboard/events", label: t("dashboard.invite_client"), icon: Mail },
            { href: "/dashboard/messages", label: t("dashboard.nav_messages"), icon: Mail },
            { href: "/marketplace", label: t("dashboard.find_vendor"), icon: Sparkles },
            { href: "/dashboard/campaigns", label: t("dashboard.send_campaign"), icon: Mail },
          ]}
        />
      </div>
    </div>
  );
}

export function OrganizationDashboard({
  firstName,
  stats,
  events,
  userId,
  isAdmin,
  canEditEvents,
}: OwnerDashboardProps) {
  const { t } = useLocale();
  return (
    <div className="space-y-8">
      <HeroBanner
        firstName={firstName}
        subtitle={t("dashboard.org_subtitle")}
        primaryHref="/dashboard/events/create"
        primaryLabel={t("dashboard.create_event")}
        secondaryHref="/dashboard/business-card/tap"
        secondaryLabel={t("dashboard.nav_tap_to_connect")}
      />
      {!isAdmin && <FreePlanReminder />}
      <StatsRow stats={stats} />
      <div className="grid lg:grid-cols-3 gap-6">
        <RecentEventsList
          events={events}
          emptyTitle={t("dashboard.empty_org_title")}
          emptyDesc={t("dashboard.empty_org_desc")}
          userId={userId}
          isAdmin={isAdmin}
          canEdit={canEditEvents ?? true}
        />
        <QuickActions
          actions={[
            { href: "/dashboard/business-card/tap", label: t("dashboard.nav_tap_to_connect"), icon: Smartphone },
            { href: "/dashboard/business-card#share", label: t("dashboard.share_celeyou"), icon: Share2 },
            { href: "/dashboard/settings?tab=team", label: t("dashboard.invite_team"), icon: Users },
            { href: "/dashboard/settings?tab=organization", label: t("dashboard.nav_organization"), icon: Calendar },
            { href: "/dashboard/events/create", label: t("dashboard.create_event"), icon: Plus },
            { href: "/dashboard/settings?tab=permissions", label: t("dashboard.nav_permissions"), icon: Users },
            { href: "/dashboard/wallet", label: t("dashboard.nav_wallet"), icon: DollarSign },
          ]}
        />
      </div>
    </div>
  );
}

export function VendorDashboardHome({ firstName }: { firstName: string }) {
  const { t } = useLocale();
  return (
    <div className="space-y-8">
      <HeroBanner
        firstName={firstName}
        subtitle={t("dashboard.vendor_subtitle")}
        primaryHref="/dashboard/vendor-portal"
        primaryLabel={t("dashboard.open_vendor_portal")}
      />
      <Card>
        <CardContent className="py-12">
          <EmptyState
            icon={Sparkles}
            title={t("dashboard.vendor_empty_title")}
            description={t("dashboard.vendor_empty_desc")}
            actionLabel={t("dashboard.open_vendor_portal")}
            actionHref="/dashboard/vendor-portal"
            secondaryLabel={t("dashboard.marketplace_profile")}
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
  secondaryHref,
  secondaryLabel,
}: {
  firstName: string;
  subtitle: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  const { t } = useLocale();
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-600 via-brand-500 to-accent-500 p-6 sm:p-8 text-white shadow-[0_12px_40px_rgba(11,138,131,0.3)]">
      <div className="absolute inset-0 grid-pattern opacity-10" />
      <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-gold-400" />
            <span className="text-sm font-medium text-white/80">{t("dashboard.home_kicker")}</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
            {t("dashboard.welcome_back", { name: firstName })}
          </h1>
          <p className="text-white/70 mt-1">{subtitle}</p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <PrimaryAction size="lg" asChild>
            <Link href={primaryHref}>
              <Plus className="h-4 w-4" /> {primaryLabel}
            </Link>
          </PrimaryAction>
          {secondaryHref && secondaryLabel ? (
            <Button
              asChild
              variant="outline"
              className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
            >
              <Link href={secondaryHref}>
                <Smartphone className="h-4 w-4" /> {secondaryLabel}
              </Link>
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function StatsRow({ stats }: { stats: DashboardStats }) {
  const { t, locale } = useLocale();
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      <StatCard title={t("dashboard.stat_events")} value={stats.eventsCreated} icon={Calendar} />
      <StatCard title={t("dashboard.stat_invitations")} value={stats.invitationsGenerated} icon={Mail} />
      <StatCard title={t("dashboard.stat_tickets")} value={stats.ticketsSold} icon={Ticket} />
      <StatCard title={t("dashboard.stat_revenue")} value={formatCurrency(stats.revenue, "GHS", locale)} icon={DollarSign} />
      <StatCard title={t("dashboard.stat_rsvp")} value={stats.rsvpAccepted} icon={Users} />
      <StatCard title={t("dashboard.stat_scans")} value={stats.qrScans} icon={QrCode} />
    </div>
  );
}

function QuickActions({
  actions,
}: {
  actions: { href: string; label: string; icon: typeof Calendar }[];
}) {
  const { t } = useLocale();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-4 w-4 text-brand-500" />
          {t("dashboard.quick_actions")}
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
