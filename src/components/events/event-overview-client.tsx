"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard, Heart, Mail, Users, Armchair, Clock, Store, Gift, QrCode, Image, Sparkles,
  MessageSquare, Wallet, Flower2, Video, Archive, Cake, Ticket, Palette, Presentation,
  UserPlus, Calendar, BarChart3, Music, Layers, Mic, BadgeCheck, Star, Tent, Map, Lock,
} from "lucide-react";
import { useEventWorkspace, setActiveEventId } from "@/hooks/use-event-workspace";
import { EventInfoEditor } from "@/components/events/event-info-editor";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard, Heart, Mail, Users, Armchair, Clock, Store, Gift, QrCode, Image, Sparkles,
  MessageSquare, Wallet, UsersRound: Users, Flower2, Video, Archive, Cake, Ticket, Palette,
  Presentation, UserPlus, Calendar, BarChart3, Music, Layers, Mic, BadgeCheck, Star, Tent, Map,
};

interface EventOverviewClientProps {
  eventId: string;
  title: string;
  hostName: string;
  eventType: string;
  status: string;
  startDate: string;
  endDate?: string | null;
  description?: string | null;
  venueName?: string | null;
  landmark?: string | null;
  mapsLink?: string | null;
  contactPhone?: string | null;
  dressCode?: string | null;
  expectedGuests?: number | null;
  children?: React.ReactNode;
}

export function EventOverviewClient({
  eventId,
  title,
  hostName,
  eventType,
  status,
  startDate,
  endDate,
  description,
  venueName,
  landmark,
  mapsLink,
  contactPhone,
  dressCode,
  expectedGuests,
  children,
}: EventOverviewClientProps) {
  const { workspace, loading } = useEventWorkspace(eventId);

  useEffect(() => {
    setActiveEventId(eventId);
  }, [eventId]);

  const hostLabel = workspace?.terminology?.host ?? "Host";
  const guestsLabel = workspace?.terminology?.guests ?? "Guests";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline">{workspace?.eventType?.replace(/_/g, " ") ?? eventType.replace(/_/g, " ")}</Badge>
            <Badge variant={status === "PUBLISHED" || status === "LIVE" ? "success" : status === "DRAFT" ? "warning" : "outline"}>{status}</Badge>
          </div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-slate-500 mt-1">
            {hostLabel}: {hostName}
          </p>
          {workspace && (
            <p className="text-sm text-brand-600 mt-1">{workspace.navigation.length} modules in your workspace</p>
          )}
        </div>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-lg bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {(workspace?.navigation ?? []).map((action) => {
            const Icon = ICON_MAP[action.icon] ?? LayoutDashboard;
            return (
              <Button
                key={action.id}
                variant="outline"
                className={`h-auto py-4 flex-col gap-2 relative ${action.isLocked ? "opacity-60" : ""}`}
                asChild={!action.isLocked}
                disabled={action.isLocked}
              >
                {action.isLocked ? (
                  <div className="flex flex-col items-center gap-2 w-full">
                    <Icon className="h-5 w-5" />
                    <span className="text-center text-sm">{action.label}</span>
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <Lock className="h-3 w-3" />
                      {action.requiredPlan ?? "Upgrade"}
                    </span>
                  </div>
                ) : (
                  <Link href={action.href}>
                    <Icon className="h-5 w-5" />
                    {action.label}
                  </Link>
                )}
              </Button>
            );
          })}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{workspace?.terminology?.overview ?? "Event Details"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="space-y-3">
              <div className="flex justify-between"><span className="text-slate-500">Date</span><span>{new Date(startDate).toLocaleDateString()}</span></div>
              {venueName && <div className="flex justify-between"><span className="text-slate-500">Venue</span><span>{venueName}</span></div>}
              {expectedGuests && <div className="flex justify-between"><span className="text-slate-500">Expected {guestsLabel}</span><span>{expectedGuests}</span></div>}
              {description && (
                <p className="text-slate-600 pt-1 border-t border-slate-100 whitespace-pre-wrap">{description}</p>
              )}
            </div>
            <EventInfoEditor
              eventId={eventId}
              initial={{
                title,
                hostName,
                description,
                venueName,
                landmark,
                mapsLink,
                contactPhone,
                dressCode,
                expectedGuests,
                startDate,
                endDate,
              }}
            />
          </CardContent>
        </Card>
        {children}
      </div>
    </div>
  );
}
